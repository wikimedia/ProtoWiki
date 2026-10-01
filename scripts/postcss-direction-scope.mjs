/**
 * PostCSS plugin: scope whole stylesheets to one text direction so an LTR and
 * an RTL build of the same CSS can both be bundled, in their usual cascade
 * position, and only the one matching `<html dir>` applies.
 *
 *   .cdx-menu{left:0}  →  :where(html:not([dir='rtl'])) .cdx-menu{left:0}   (ltr file)
 *   .cdx-menu{right:0} →  :where(html[dir='rtl']) .cdx-menu{right:0}         (rtl file)
 *
 * `:where()` adds no specificity, so LTR pages keep exactly the cascade they had
 * before. Selectors that can match `<html>` itself (`html`, `:root`, or a
 * leading attribute selector such as `[data-skin="mobile"]`, which theme.ts sets
 * on `<html>`) also get a variant with the guard merged into that compound.
 *
 * Which files are scoped is decided by `files` — see vite.config.ts.
 */

const GUARDS = {
  ltr: ":not([dir='rtl'])",
  rtl: "[dir='rtl']",
}

/** Index where the first compound selector ends (outside brackets/parens/strings). */
function firstCompoundEnd(selector) {
  let depth = 0
  let quote = null
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]
    if (quote) {
      if (char === quote && selector[i - 1] !== '\\') quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '[' || char === '(') depth++
    else if (char === ']' || char === ')') depth--
    else if (depth === 0 && /[\s>+~]/.test(char)) return i
  }
  return selector.length
}

/** Insert `insertion` into the first compound, before any pseudo-element. */
function mergeIntoFirstCompound(selector, insertion) {
  const end = firstCompoundEnd(selector)
  const compound = selector.slice(0, end)
  const pseudoElement = compound.indexOf('::')
  const at = pseudoElement >= 0 ? pseudoElement : end
  return selector.slice(0, at) + insertion + selector.slice(at)
}

export function scopeSelector(selector, dir) {
  const guard = GUARDS[dir]
  const trimmed = selector.trim()
  if (!trimmed) return [trimmed]

  if (/^(html|:root)(?![\w-])/.test(trimmed)) {
    return [mergeIntoFirstCompound(trimmed, `:where(${guard})`)]
  }

  const scoped = [`:where(html${guard}) ${trimmed}`]
  if (trimmed.startsWith('[')) {
    scoped.push(mergeIntoFirstCompound(trimmed, `:where(html${guard})`))
  }
  return scoped
}

/**
 * @param {{ files: { test: RegExp, dir: 'ltr' | 'rtl' }[] }} options
 */
export default function directionScope({ files }) {
  return {
    postcssPlugin: 'protowiki-direction-scope',
    Once(root, { result }) {
      const from = (result.opts.from ?? '').split('?')[0].replace(/\\/g, '/')
      const entry = files.find(({ test }) => test.test(from))
      if (!entry) return

      root.walkRules((rule) => {
        const parent = rule.parent
        if (parent?.type === 'atrule' && /keyframes$/i.test(parent.name)) return
        rule.selectors = rule.selectors.flatMap((selector) => scopeSelector(selector, entry.dir))
      })
    },
  }
}
directionScope.postcss = true
