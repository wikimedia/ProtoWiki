---
name: protowiki-snapshot-data
description: ProtoWiki-specific integration of the snapshotting pattern — the npm scripts that wrap the agnostic fetchers, where snapshots land in this repo (public/snapshots/, src/styles/wiki-content/), how `ArticleSnapshot` consumes a pre-baked HTML body, and how the skin CSS gets scoped to [data-skin]. Use when adding a new article snapshot to ProtoWiki, refreshing the Wikipedia skin CSS, or wiring `ArticleSnapshot` up to a static fixture.
license: MIT
---

# Snapshotting Wikipedia data — Inside ProtoWiki

For the universal pattern (when to snapshot, the scoping principle, the
tradeoffs, the underlying `fetch_page.py` / `fetch_skin_css.sh`
recipes), see
[`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md).

This skill is the ProtoWiki-specific layer on top of that pattern —
the wrapped npm scripts, the committed paths, and the consumer
component.

## Where snapshots live in this repo

The convention is:

```
public/
└── snapshots/
    └── <slug>.html              ← committed article fixtures, served verbatim
src/
└── styles/
    └── wiki-content/
        ├── <skin>.rl.css        ← raw RL fetch (committed for diffability)
        └── <skin>.css           ← scoped output, imported by main.ts
```

Current state on disk:

- `src/styles/wiki-content/{vector-2022,minerva}.{css,rl.css}` — already
  committed and imported globally in `src/main.ts`.
- `public/snapshots/` — HTML fixtures referenced by **`article`** on **`ArticleSnapshot`**
  (filename stem must match **`articleSnapshotSlug()`** in `src/lib/articleSnapshotSlug.ts`):
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
   `src/styles/wiki-content/{vector-2022,minerva}.rl.css`.
2. **Scope every selector** through `scripts/scope-wiki-skin-css.mjs`
   (PostCSS + `postcss-prefix-selector`):
   - Vector → prefixed under `[data-skin="desktop"] .mw-parser-output`.
   - Minerva → prefixed under `[data-skin="mobile"] .mw-parser-output`.
   - Selectors targeting `body`, `:root`, or `html` collapse to
     `.mw-parser-output`.

The scoped output lands at
`src/styles/wiki-content/{vector-2022,minerva}.css`, both imported
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
for the same title string you pass **`ArticleSnapshot`** (**`article="…"`**).

Update the `UA` string in that script to ProtoWiki's contact when
running it server-side — anonymous UAs are rate-limited or blocked.

## Consuming a snapshot from `ArticleSnapshot`

Use a committed **`public/snapshots/&lt;slug&gt;.html`** by passing **`article`** with the
same wiki title you used when snapshotting:

```vue
<ArticleSnapshot article="Corsica Studios" />

<ArticleSnapshot article="Confidence Man (band)" />
```

If **`public/snapshots/&lt;slug&gt;.html`** is missing (`404`), **`ArticleSnapshot`**
shows a **`Codex`** error with a repo-root-relative **`fetch_page.py`** command to add it.

## Hand-authored markup vs snapshots

Use committed HTML when you want **full Parsoid fidelity** and a **frozen** page. Use **`ArticleLive`** when you want **always-current** **`page/html`**. When you need **partial content**, **fixture-free** setup, or markup that is **easier to edit in Vue** than in a snapshot file, use **`ArticleCustom`** (or compose **`ArticleWrapper`** + **`ArticleRenderer`**) with a hand-filled slot — canonical example **`src/prototypes/template-article-custom/`**, documented in [`protowiki-components` → `article.md`](../protowiki-components/references/article.md#hand-authored-article-markup-no-fetch-no-snapshot).

## See also

- [`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md) — the universal
  pattern and the underlying fetch scripts.
- [`protowiki-components`](../protowiki-components/SKILL.md) —
  **`ArticleSnapshot`**, **`ArticleLive`**, **`ArticleCustom`**, **`ArticleWrapper`**, and **`ArticleRenderer`** APIs.
- [`protowiki-skins`](../protowiki-skins/SKILL.md) — the `[data-skin]`
  cascade that the scoped CSS plugs into.
- [`wiki-apis`](../wiki-apis/SKILL.md) — fetching live data, the
  alternative path.
