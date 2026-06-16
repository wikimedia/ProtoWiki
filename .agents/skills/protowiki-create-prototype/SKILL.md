---
name: protowiki-create-prototype
description: How to add a new prototype to ProtoWiki via file-based routing — create a folder under src/prototypes/, register nothing, and the gallery picks it up automatically. Use when asked to "build a prototype", "add a new page", "make a demo", or any variant that creates a new prototype experience under src/prototypes/.
license: MIT
---

# Create a new prototype

ProtoWiki uses **file-based routing** (`unplugin-vue-router`). Adding a
prototype is one folder + one file. There is no manifest, no router config,
no registration.

## The 30-second version

```bash
mkdir -p src/prototypes/my-feature
touch src/prototypes/my-feature/index.vue
npm run dev
# open http://localhost:5173/my-feature
```

Then edit `src/prototypes/my-feature/index.vue`:

```vue
<script setup lang="ts">
definePage({
  meta: {
    title: 'My feature prototype',
    description: 'One-sentence pitch shown on the home gallery.',
  },
})

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
</template>
```

Reload — the home gallery (`/`) auto-lists the new entry, the route is live,
no other file needs to change.

## Conventions

- **Folder naming by kind.** The folder name is the URL path (`src/prototypes/<name>/index.vue`):
  - **Templates** (starters to copy): `template-<name>/` — e.g. `template-chrome`, `template-article-live`. Set `meta.title` to `Template: …` so the home gallery groups them below regular prototypes.
  - **Examples** (worked demos): `example-<name>/` — e.g. `example-event-worklist`. Set `meta.title` to `Example: …`.
  - **Feature prototypes** (real work in progress): unprefixed kebab-case — e.g. `edit-check`, `related-strip`. No `Template:` / `Example:` in the title.
- **One folder per prototype.** Keep names short and unique.
- **Always set `definePage({ meta: { title, description } })`.** It powers
  the gallery card. Without it, the gallery falls back to a humanized path.
- **Co-locate prototype-specific assets** inside the folder
  (`my-feature/data.json`, `my-feature/HelpModule.vue`, `my-feature/dashpage-fixtures.ts`).
  Only **`index.vue`** files become routes — co-located `*.vue` modules are
  imported by the page (`vite.config.ts` sets `filePatterns: ['**/index']` on
  `src/prototypes/`). Anything reusable belongs in `src/components/` and gets a skill.
- **Wrap with `ChromeWrapper`** unless the prototype is intentionally a bare
  fragment. Most Wikipedia prototypes start with chrome → article columns.
  `ChromeWrapper` already includes the default **`ChromeHeader`** (with inline **`Search`** on desktop). Set **`username`** for the Meta user link; replace **`#header`** only for fully custom chrome.
- **Don't write per-prototype CSS for what Codex tokens already cover** —
  that's the [`codex-usage`](../codex-usage/SKILL.md) discipline that keeps
  prototypes looking like production.

## Common shapes

| Goal | Composition |
| --- | --- |
| Article-style page with chrome (live) | `<ChromeWrapper><ArticleLive article="…"/></ChromeWrapper>` |
| Article-style page with committed snapshot fixture | `<ChromeWrapper><ArticleSnapshot article="…"/></ChromeWrapper>` |
| Article-style page with **hand-written** body HTML (no REST, no snapshot file) | `<ChromeWrapper><ArticleCustom>…</ArticleCustom></ChromeWrapper>` — canonical: **`src/prototypes/template-article-custom/`**; see [`protowiki-components` → `article.md`](../protowiki-components/references/article.md) ( **`hand-authored-lead`**, infobox classes) |
| Special-page-style page | `<ChromeWrapper><SpecialPageWrapper title="…">…</SpecialPageWrapper></ChromeWrapper>` |
| Newcomer homepage / dashboard | `<ChromeWrapper :last-edited-notice="false"><SpecialPageWrapper title="Dashboard" help><Dashboard>…</Dashboard></SpecialPageWrapper></ChromeWrapper>` — starter: **`template-dashboard/`**; full modules: **`template-homepage/`** |
| Bare canvas with chrome | `<ChromeWrapper>…</ChromeWrapper>` |
| A/B preview, two themes side by side | Two `<ChromeWrapper>`s, one `theme="light"`, one `theme="dark"` |
| Mobile preview embedded in a desktop page | `<MobileWrapper><ChromeWrapper skin="mobile">…</ChromeWrapper></MobileWrapper>` |

See [`protowiki-components`](../protowiki-components/SKILL.md) for full
component docs and [`protowiki-components/references/composition-recipes.md`](../protowiki-components/references/composition-recipes.md)
for more recipes.

## What you don't need to do

- **No router config.** `unplugin-vue-router` reads `src/prototypes/` and
  generates the route table. Only `**/index` files under `src/prototypes/` are
  routes; other co-located `.vue` files (e.g. `HelpModule.vue`) are normal imports.
- **No gallery edit.** `src/prototypes/index.vue` iterates over the typed route
  table at runtime; new top-level folders appear automatically. Only
  `src/prototypes/<name>/index.vue` shows on the gallery — nested
  `src/prototypes/<proto>/<sub>/index.vue` routes are registered but listed
  only when linked from inside a prototype (e.g. mobile drill-down pages).
- **No skin/theme setup.** `<html data-skin>` / `<html data-theme>` are set
  at boot from URL params + viewport + `prefers-color-scheme`. Codex tokens
  cascade through.
- **No build step for prototypes.** `npm run dev` HMRs every change.

## Sharing your prototype

When the design review is local: `npm run dev`, share the URL.

When you want a stable URL on GitHub Pages: push to `main` (CI builds and
deploys). Open a PR in your fork for an automatic preview URL on the PR.
See [`protowiki-deploy`](../protowiki-deploy/SKILL.md).

## When to break the conventions

The conventions exist to keep the gallery uniform and the file tree
predictable. Break them when the prototype is genuinely different — e.g.,
nested routes (`/edit-check/step-1`, `/edit-check/step-2`) live as
`src/prototypes/edit-check/step-1/index.vue` etc. (any `**/index` under
`src/prototypes/`), and a folder-level layout file can sit at
`src/prototypes/edit-check/index.vue` if there's a shared shell. Nested
`index.vue` files do not appear on the home gallery — only the prototype root
does. Still set `meta.title` / `meta.description` on nested routes when useful
for devtools or direct URLs.
