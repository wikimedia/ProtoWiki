---
name: wiki-snapshot-data
description: When and how to snapshot Wikipedia data — committing JSON / HTML fixtures and the Wikipedia skin CSS — instead of fetching live, plus a reusable fetch_page.py snapshotter and a fetch_skin_css.sh recipe for grabbing the ResourceLoader bundles needed to style .mw-parser-output. Use when you're demonstrating a fixed page, want offline-capable demos, are hitting API rate limits, or want full visual fidelity for an article body.
---

# Snapshotting Wikipedia data

Live API calls are great for typeahead, search, recent-changes, etc.
But many Wikipedia-shaped surfaces demonstrate a **fixed** page — and
there, snapshotting is faster, more reliable, and (importantly)
reproducible.

## When to snapshot

Snapshot when:

- The work is "what would Albert Einstein's article look like with
  ___?" — a fixed example.
- The demo will be shown offline / in a low-bandwidth setting.
- The API surface you need is rate-limited or slow (Wikidata SPARQL,
  pageviews, etc.).
- You want a frozen fixture so the result renders identically next
  year.

Don't snapshot when:

- The work is *about* live data ("reactions to today's news").
- You want a moving target (recent changes, current pageviews).

## Two things to snapshot

For a faithful Wikipedia article render, you almost always need *both*:

1. **The article HTML** — `.mw-parser-output` body via REST `/page/html`.
2. **The skin CSS** — Vector 2022 / Minerva ResourceLoader bundles that
   style the article body (infoboxes, hatnotes, navboxes, message
   boxes, thumbnails, gallery layouts, image captions, citation needed
   templates, etc.). Codex's base CSS doesn't cover these — they live
   in MediaWiki core / skins.

A snapshotted article without skin CSS is a gigantic `<div>` of
unstyled text.

> Why don't most article-rendering components ship their own
> `.mw-parser-output` CSS?
>
> Because Wikipedia already does — and you don't want two copies that
> can drift. Render the markup; pull the styling separately by
> vendoring the skin CSS via the recipe below.

## The pattern

```
<static-dir>/snapshots/
├── <slug>.html       ← .mw-parser-output body, fetched once per article
└── …
<source-styles-dir>/
├── <skin>.rl.css     ← raw skin RL fetch (optional to commit)
└── <skin>.css        ← post-processed: selectors prefixed to a [data-skin="…"] scope
```

The two halves are independent:

- HTML fixtures are loaded at runtime by an article-renderer:

  ```ts
  const res = await fetch(`/snapshots/<slug>.html`)
  const html = await res.text()
  ```

- Skin CSS is bundled at build time so `.mw-parser-output` always
  matches production. If your environment supports per-subtree skins
  via `[data-skin]`, the raw RL bundle needs to be **scoped** before
  it's bundled — see "Scoping skin CSS" below.

## Fetch script — `fetch_page.py`

A minimal Python snapshotter (lifted from boiler_plate). Writes
`.mw-parser-output` HTML to a file.

```python
#!/usr/bin/env python3
"""Snapshot a Wikipedia article body."""
import argparse, sys, urllib.parse, urllib.request

UA = 'wiki-snapshot/0.1 (https://example.org/myproject; <contact>)'

def fetch(title: str, lang: str = 'en') -> str:
    slug = urllib.parse.quote(title.replace(' ', '_'), safe='')
    url = f'https://{lang}.wikipedia.org/api/rest_v1/page/html/{slug}'
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8')

def extract_body(html: str) -> str:
    # Trim everything outside <body>…</body> for a smaller fixture.
    import re
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
    return m.group(1) if m else html

def main():
    p = argparse.ArgumentParser()
    p.add_argument('title')
    p.add_argument('--lang', default='en')
    p.add_argument('-o', '--output', default='-')
    args = p.parse_args()
    html = extract_body(fetch(args.title, args.lang))
    if args.output == '-':
        sys.stdout.write(html)
    else:
        open(args.output, 'w', encoding='utf-8').write(html)

if __name__ == '__main__':
    main()
```

Usage:

```bash
python3 fetch_page.py "Corsica Studios" -o snapshots/corsica-studios.html
python3 fetch_page.py "Mont Blanc" --lang fr -o snapshots/mont-blanc.html
```

## Fetch script — `fetch_skin_css.sh`

The Wikipedia skin CSS is served by MediaWiki's ResourceLoader as a
bundle per skin. The shipped recipe writes the raw bundles for Vector
and Minerva:

```bash
bash .agents/skills/wiki-snapshot-data/assets/fetch_skin_css.sh
```

The module list inside that script covers the most-impactful classes
for articles. If your work shows an unusual template (e.g., obscure
infobox flavours), open the page in a browser, find the unstyled
class in DevTools, and add the relevant module to the URL's `modules=`
parameter — the right module name appears in the page's
`<link rel="stylesheet">` tags.

## Scoping skin CSS

Raw RL bundles target `:root` and unprefixed `body` / `html` selectors,
which collides with any environment that already uses attribute-driven
theming or skin switching. Two strategies:

- **Take the bundles as-is.** Fine if there's only ever one skin on
  screen at a time and the variables they set don't fight your design
  tokens.
- **Prefix the selectors.** Run the raw RL output through PostCSS with
  `postcss-prefix-selector` (or equivalent) to push every rule under
  a per-skin scope, e.g. `[data-skin="desktop"]` for Vector and
  `[data-skin="mobile"]` for Minerva. Both scoped bundles can then
  coexist in one document, and nested per-component skin overrides
  cascade cleanly.

The agnostic recipe stops at the raw bundle. Wiring the scoping step
into a build is environment-specific and lives in the consuming
project.

## Scoping the bundle to article body only

ResourceLoader bundles include rules that target generic elements (`a`,
`body`, `p`), sometimes with `!important` (e.g.
`a { padding: 0 !important }`). If those load globally they fight your
design system — buttons rendered as `<a>` get squashed, cards underline
on hover, and so on.

The robust answer is to **prefix every RL selector with both the
matching skin scope and `.mw-parser-output`**, so the bundle only ever
applies inside parsed wiki HTML. Selectors targeting `body`, `:root`,
or `html` collapse to `.mw-parser-output`; chrome and design-system
components stay clean.

After collapsing, **drop rules whose final selector is exactly
`<skin-scope> .mw-parser-output`**. Those came from `body` / `html` /
`:root` declarations in the RL bundle — page-level styling like
Vector's `body { background-color: var(--background-color-neutral-subtle) }`
or token re-paints inside `@media (prefers-color-scheme: dark)`. They
make sense when MediaWiki owns the document root, but in a frontend
that owns its own page chrome (and especially one that drives theme
through a `data-theme` cascade), they:

- paint the article column in the *page* background (typically
  `--background-color-neutral-subtle`) instead of the *article*
  background (`--background-color-base`),
- locally redefine the entire token palette inside `.mw-parser-output`
  whenever the OS reports `prefers-color-scheme: dark`, overriding any
  theme attribute the host app set.

The host should provide all of those itself: page background / colour
on its wrappers, body typography in a global stylesheet, and theme
tokens via whatever attribute it uses.

Compound root selectors (`html.skin-theme-clientpref-os …`) stay
intact — they're dormant if the host never sets those root classes,
and that's fine.

If you adopt a different pattern (e.g. styling your chrome with RL too),
expect to write override rules or strip the worst `!important`s before
scoping.

## Tradeoffs of vendored CSS

- **Pro:** instant, offline, deterministic.
- **Pro:** lets you `:where(.mw-parser-output)` over your design
  tokens for perfect article fidelity.
- **Con:** Wikipedia's skin CSS evolves. Re-snapshot every few months,
  or wire this into a scheduled CI job.
- **Con:** the bundle is non-trivial (~300KB per skin before gzip).
  Bundle it globally if every page renders article HTML; lazy-load it
  per route otherwise.

## Tradeoffs of vendored HTML

- **Pro:** full editorial richness — infoboxes, references, hatnotes,
  multilingual templates, all there.
- **Pro:** stable demo across years.
- **Con:** doesn't follow article updates. If the page is being
  actively vandalised at snapshot time, you'll capture vandalism. (The
  `/page/html` endpoint includes a `revision` parameter — pin to a
  known-good rev.)

## Pinning a revision

```
GET /api/rest_v1/page/html/{title}/{revision}
```

Get the latest stable revision via `?action=query&prop=info` and pin
that revision id in your snapshotter.

## See also

- [`wiki-apis`](../wiki-apis/SKILL.md) — fetching live data, the
  alternative path.
- [`codex-usage`](../codex-usage/SKILL.md) — when to write your own
  CSS vs lean on Codex; this skill is what `codex-usage` points to for
  retrieving Wikipedia's skin CSS.

## Inside ProtoWiki

ProtoWiki has a dedicated companion skill,
[`protowiki-snapshot-data`](../protowiki-snapshot-data/SKILL.md), that
covers the repo-specific paths, the wrapped npm scripts that wire the
fetch + scoping into one command, and how **`ArticleSnapshot`** consumes a snapshot.
