/**
 * Prefix Wikipedia ResourceLoader skin bundles so rules apply only inside an
 * `.mw-parser-output` subtree under the matching ProtoWiki `[data-skin]` attribute
 * (desktop / mobile). Two reasons:
 *   1. Codex paints all of our chrome (header, footer, wrappers, cards, buttons).
 *      RL CSS has aggressive rules like `a { padding: 0 !important }` that are
 *      meant for `<a>` inside Wikipedia article HTML and will squash Cdx components
 *      if applied broadly.
 *   2. We only render real wiki HTML inside `.mw-parser-output` (via **`ArticleRenderer`**),
 *      so scoping there is sufficient and matches RL's design intent.
 *
 * Selectors already mentioning `.mw-parser-output` are left as-is (just skin-prefixed).
 * Selectors targeting `body`, `:root`, or `html` are dropped — they only make sense at
 * the document root, which RL doesn't own in this app.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import postcss from 'postcss'
import prefixSelector from 'postcss-prefix-selector'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const WIKI_SKINS = path.join(ROOT, 'src/styles/wiki-skins')

// RL bundles reference skin assets (the external-link arrow, magnify-clip icons,
// project logos, …) with host-relative (`/w/…`, `/static/…`) or protocol-relative
// (`//upload.wikimedia.org/…`) URLs. Those resolve against *Wikipedia's* host;
// served from ProtoWiki they 404 and the asset silently disappears (e.g. the
// external-link icon next to `a.external`). Rewrite them to absolute Wikipedia
// URLs so the assets load. `data:` and already-absolute `http(s):` URLs are left
// untouched.
const WIKI_ORIGIN = 'https://en.wikipedia.org'

const jobs = [
  {
    input: 'vector-2022.rl.css',
    output: 'vector-2022.css',
    skinPrefix: '[data-skin="desktop"]',
  },
  {
    input: 'minerva.rl.css',
    output: 'minerva.css',
    skinPrefix: '[data-skin="mobile"]',
  },
]

const PARSER_SCOPE = '.mw-parser-output'

// Matches selectors that target ONLY the bare root element — `body`, `html`,
// `:root`, optionally with pseudo-classes (`:root:lang(en)`). We deliberately
// do NOT match compound forms with classes / ids / attributes like
// `html.skin-theme-clientpref-night`, `body.ns-0`, `:root[lang=ar]` — those
// exist as opt-in switches for clientpref modes / namespaces we never enable.
// Collapsing them onto `.mw-parser-output` would permanently activate rules
// like `color-scheme: dark` on the article subtree.
const ROOT_ONLY = /^(?:html|body|:root)(?::[\w-]+(?:\([^)]*\))?)*$/

/**
 * Postcss plugin: drop every rule whose collapsed selector is exactly
 * `<skinPrefix> .mw-parser-output`. Those rules came from `body` / `html` /
 * `:root` selectors in the RL bundle — page-level styles like
 * `body { background-color: var(--background-color-neutral-subtle); ... }`
 * (Vector's page chrome) or token re-paints inside
 * `@media (prefers-color-scheme: dark)`. They paint the article column with
 * the wrong palette and clash with the `[data-theme]` cascade.
 *
 * ProtoWiki provides all page-root styling itself: body typography in
 * `global.css`, page background / colour in our wrappers (`ChromeWrapper`,
 * `ArticleWrapper`, `ArticleRenderer`, `ArticleLive`, `ArticleSnapshot`, `ArticleCustom`), and theme tokens via `data-theme`.
 *
 * Rules with longer selectors (e.g. `[data-skin] .mw-parser-output > p`)
 * are RL's intentional article-content styling and stay.
 */
function dropCollapsedRootRules(skinPrefix) {
  const collapsedRoot = `${skinPrefix} ${PARSER_SCOPE}`
  return {
    postcssPlugin: 'drop-collapsed-root-rules',
    Rule(rule) {
      const remaining = rule.selectors.filter((sel) => sel.trim() !== collapsedRoot)
      if (remaining.length === 0) {
        rule.remove()
      } else if (remaining.length !== rule.selectors.length) {
        rule.selectors = remaining
      }
    },
    AtRule: {
      media(atRule) {
        if (atRule.nodes && atRule.nodes.length === 0) atRule.remove()
      },
    },
  }
}
dropCollapsedRootRules.postcss = true

/**
 * Rewrite `url(...)` values that point at Wikipedia-host paths so the referenced
 * assets resolve when this CSS is served from ProtoWiki:
 *   - `url(/w/…)` / `url(/static/…)` (host-relative) → `https://en.wikipedia.org/…`
 *   - `url(//upload.wikimedia.org/…)` (protocol-relative) → `https://…`
 * Leaves `data:` URIs and already-absolute `http(s):` URLs alone.
 */
function absolutizeUrl(value) {
  return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote, raw) => {
    const url = raw.trim()
    if (/^(?:https?:|data:)/i.test(url)) return match
    let abs
    if (url.startsWith('//')) {
      abs = `https:${url}`
    } else if (url.startsWith('/')) {
      abs = `${WIKI_ORIGIN}${url}`
    } else {
      return match
    }
    return `url(${quote}${abs}${quote})`
  })
}

function absolutizeUrls() {
  return {
    postcssPlugin: 'absolutize-wiki-urls',
    Declaration(decl) {
      if (decl.value.includes('url(')) {
        decl.value = absolutizeUrl(decl.value)
      }
    },
  }
}
absolutizeUrls.postcss = true

function scope(css, skinPrefix) {
  // Pass 1: scope every selector under [data-skin="…"] / .mw-parser-output.
  // Pass 2: strip RL's collapsed-root rules (page-level body styles + token
  // re-paints we already provide via Codex / our wrappers).
  // We run these as two separate postcss invocations because the visitor-based
  // plugin in pass 2 must observe selectors *after* pass 1 has rewritten them;
  // running both in one pipeline would interleave the visits.
  const prefixed = postcss([
    prefixSelector({
      prefix: skinPrefix,
      transform(prefix, selector) {
        const trimmed = selector.trim()
        if (!trimmed || trimmed.startsWith('@')) {
          return selector
        }
        if (ROOT_ONLY.test(trimmed)) {
          return `${prefix} ${PARSER_SCOPE}`
        }
        if (trimmed.includes(PARSER_SCOPE)) {
          return `${prefix} ${trimmed}`
        }
        if (/^(?:html|body|:root)\b/.test(trimmed)) {
          // Compound root selector with descendants — keep as-is under the
          // skin prefix. Won't match in our app (we don't set those root
          // classes), which is intentional for dark-mode / preference rules
          // that would otherwise fight the active theme.
          return `${prefix} ${trimmed}`
        }
        return `${prefix} ${PARSER_SCOPE} ${trimmed}`
      },
    }),
  ]).process(css, { from: undefined }).css

  return postcss([dropCollapsedRootRules(skinPrefix), absolutizeUrls()]).process(prefixed, {
    from: undefined,
  }).css
}

for (const { input, output, skinPrefix } of jobs) {
  const inPath = path.join(WIKI_SKINS, input)
  const outPath = path.join(WIKI_SKINS, output)
  if (!fs.existsSync(inPath)) {
    console.error(`Missing ${inPath} — run npm run snapshot:wiki-skins`)
    process.exit(1)
  }
  const raw = fs.readFileSync(inPath, 'utf8')
  fs.writeFileSync(outPath, scope(raw, skinPrefix))
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${fs.statSync(outPath).size} bytes)`)
}
