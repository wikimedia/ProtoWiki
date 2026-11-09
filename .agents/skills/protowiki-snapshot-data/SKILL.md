---
name: protowiki-snapshot-data
description: ProtoWiki-specific integration of the snapshotting pattern — the npm scripts that wrap the agnostic fetchers, where snapshots land in this repo (public/snapshots/, src/styles/wiki-skins/), and how the skin CSS gets scoped to [data-skin]. Use when adding committed HTML fixtures, refreshing the Wikipedia skin CSS, or copying Parsoid markup into ArticleCustom prototypes.
---

# Snapshotting Wikipedia data — Inside ProtoWiki

For the universal pattern (when to snapshot, the scoping principle, the
tradeoffs, the underlying `fetch_page.py` / `fetch_skin_css.sh`
recipes), see
[`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md).

This skill is the ProtoWiki-specific layer on top of that pattern —
the wrapped npm scripts, and the committed paths.

## Where snapshots live in this repo

The convention is:

```
public/
└── snapshots/
    └── <slug>.html              ← committed article fixtures, served verbatim
src/
└── styles/
    └── wiki-skins/
        ├── <skin>.rl.css        ← raw RL fetch (committed for diffability)
        └── <skin>.css           ← scoped output, imported by main.ts
```

Current state on disk:

- `src/styles/wiki-skins/{vector-2022,minerva}.{css,rl.css}` — already
  committed and imported globally in `src/main.ts`.
- `public/snapshots/` — committed HTML fixtures (filename stem from **`articleSnapshotSlug()`** in `src/components/article/shared/articleSnapshotSlug.ts` — for scripts and copying markup, not a Vue consumer):
  - `wet-leg.html`
  - `corsica-studios.html`
  - `confidence-man-band.html`

## Refreshing skin CSS

```bash
npm run snapshot:wiki-skins
```

The script (`scripts/snapshot-wiki-skins.sh`) does two passes:

1. **Fetch raw RL bundles** for Vector 2022 and Minerva from the
   ResourceLoader endpoint, and write them to
   `src/styles/wiki-skins/{vector-2022,minerva}.rl.css`.
2. **Scope every selector** through `scripts/scope-wiki-skin-css.mjs`
   (PostCSS + `postcss-prefix-selector`):
   - Vector → prefixed under `[data-skin="desktop"] .mw-parser-output`.
   - Minerva → prefixed under `[data-skin="mobile"] .mw-parser-output`.
   - Selectors targeting `body`, `:root`, or `html` collapse to
     `.mw-parser-output`.

The scoped output lands at
`src/styles/wiki-skins/{vector-2022,minerva}.css`, both imported
globally in `src/main.ts`. Because the rules are scoped, nested
`skin="desktop"` / `skin="mobile"` previews coexist cleanly inside one
page; chrome and Codex components are unaffected.

Re-run the npm script every few months to track upstream skin
evolution.

## Refreshing article HTML snapshots

ProtoWiki doesn't (currently) wrap the HTML fetcher in an npm script —
the agnostic recipe lives in
`.agents/skills/wiki-snapshot-data/assets/fetch_page.py`. Run it with
the ProtoWiki output path:

```bash
python3 .agents/skills/wiki-snapshot-data/assets/fetch_page.py \
  "Corsica Studios" -o public/snapshots/corsica-studios.html
python3 .agents/skills/wiki-snapshot-data/assets/fetch_page.py \
  "Confidence Man (band)" -o public/snapshots/confidence-man-band.html
```

Match **`-o public/snapshots/<slug>.html`** to the slug **`articleSnapshotSlug()`** produces
for the wiki title you snapshot.

Update the `UA` string in that script to ProtoWiki's contact when
running it server-side — anonymous UAs are rate-limited or blocked.

## Using snapshot HTML in prototypes

There is **no** snapshot article component. Committed **`public/snapshots/`** files are for diffing, offline reference, and **copying Parsoid markup** into **`ArticleCustom`** (or **`ArticleWrapper` + `ArticleRenderer`**) when you need frozen HTML without wiring a fetch.

For interactive article prototypes, default to **`ArticleLive`** (**`page/html`**). See [`protowiki-components` → `article.md`](../protowiki-components/references/article.md).

## Hand-authored markup vs fixtures

Use committed HTML when you want **full Parsoid fidelity** to copy from. Use **`ArticleLive`** when you want **always-current** **`page/html`**. When you need **partial content** or markup **easier to edit in Vue**, use **`ArticleCustom`** — documented in [`protowiki-components` → `article.md`](../protowiki-components/references/article.md#hand-authored-article-markup-no-live-fetch) (**`example-custom-article/`**).

## See also

- [`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md) — the universal
  pattern and the underlying fetch scripts.
- [`protowiki-components`](../protowiki-components/SKILL.md) —
  **`ArticleLive`**, **`ArticleCustom`**, **`ArticleWrapper`**, and **`ArticleRenderer`** APIs.
- [`protowiki-skins`](../protowiki-skins/SKILL.md) — the `[data-skin]`
  cascade that the scoped CSS plugs into.
- [`wiki-apis`](../wiki-apis/SKILL.md) — fetching live data, the
  alternative path.
