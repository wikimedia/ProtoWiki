---
name: protowiki-create-prototype
description: How to add a new prototype to ProtoWiki via file-based routing — create a folder under src/prototypes/, register nothing, and the gallery picks it up from definePage meta (category, platform, order, hidden, spotlight). Platform-agnostic: works the same for web prototypes (ChromeWrapper) and app prototypes (AppChromeWrapper, see protowiki-app-prototyping). Never AI-generate gallery title or description — ask the author or omit (title falls back to folder name). Use when asked to "build a prototype", "add a new page", "make a demo", or any variant that creates a new prototype experience under src/prototypes/.
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

Then edit `src/prototypes/my-feature/index.vue`. A **web** prototype:

```vue
<script setup lang="ts">
definePage({
  meta: {
    // title + description: ask the author, or omit
    category: 'prototype',
    platform: 'web',
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

An **app** prototype is the same file with the other platform and the other
wrapper:

```vue
<script setup lang="ts">
definePage({
  meta: {
    category: 'prototype',
    platform: 'app',
  },
})

import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
import ArticleLive from '@/components/article/ArticleLive.vue'
</script>

<template>
  <AppChromeWrapper>
    <ArticleLive app article="Albert Einstein" />
  </AppChromeWrapper>
</template>
```

Reload — the home gallery (`/`) auto-lists the new entry, the route is live,
no other file needs to change.

Everything below applies to both platforms. For the app specifics — iOS vs
Android, app chrome, which `template-app-*` to copy — see
[`protowiki-app-prototyping`](../protowiki-app-prototyping/SKILL.md).

## Conventions

- **Folder naming by kind.** The folder name is the URL path (`src/prototypes/<name>/index.vue`):
  - **Templates** (starters to copy): `template-<name>/` — e.g. `template-chrome`, `template-article-live`. Set `meta.category: 'template'` so the home gallery groups them below regular prototypes.
  - **Examples** (worked demos): `example-<name>/` — e.g. `example-event-worklist`. Set `meta.category: 'example'`.
  - **Feature prototypes** (real work in progress): unprefixed kebab-case — e.g. `edit-check`, `related-strip`. Omit `category` (defaults to `'prototype'`).
- **One folder per prototype.** Keep names short and unique.
- **Gallery copy is human-written when present.** Set `meta.title` and
  `meta.description` only from author-provided copy — ask the author or omit;
  never AI-generate. See [Gallery copy (never AI-generated)](#gallery-copy-never-ai-generated).
- **Co-locate prototype-specific assets** inside the folder
  (`my-feature/data.json`, `my-feature/HelpModule.vue`, `my-feature/dashpage-fixtures.ts`).
  Only **`index.vue`** files become routes — co-located `*.vue` modules are
  imported by the page (`vite.config.ts` sets `filePatterns: ['**/index']` on
  `src/prototypes/`). Anything reusable belongs in `src/components/` and gets a skill.
- **Wrap in the chrome for your platform** unless the prototype is intentionally
  a bare fragment. Most prototypes start with chrome → content.
  - **Web** (`platform: 'web'`) — **`ChromeWrapper`**, which includes the default
    **`ChromeHeader`** (with inline **`Search`** on desktop). Set
    **`username`** for the Meta user link; replace **`#header`** only for fully
    custom chrome.
  - **App** (`platform: 'app'`) — **`AppChromeWrapper`**, which includes the app
    top bar and bottom icon nav. See
    [`protowiki-app-prototyping`](../protowiki-app-prototyping/SKILL.md).
- **Don't write per-prototype CSS for what Codex tokens already cover** —
  that's the [`codex-usage`](../codex-usage/SKILL.md) discipline that keeps
  prototypes looking like production.

## Gallery copy (never AI-generated)

`meta.title` and `meta.description` are **product copy** for the home gallery
card — not implementation scaffolding.

**Agents must not invent them.** Two options:

- **Ask the author** for both strings before setting meta (preferred when the
  card will be shared).
- **Omit** them — the route still works; the gallery derives `title` from the
  folder name via `deriveTitleFromPath`; `description` is blank.

Use the author's exact wording when they provide it; only light copy-editing if
they ask.

**Never:**

- AI-generate or guess title/description
- Use generic agent placeholders ("My feature prototype", "One-sentence pitch…")
- Keep a copied template's title/description on a new prototype without
  confirmation

## Home gallery

Gallery cards are driven by flat `definePage` meta on each top-level
`src/prototypes/<name>/index.vue`:

- **`category`** — `'prototype'` (default), `'template'`, or `'example'`; controls
  which block the card appears in (prototypes first, then a divider, then
  templates+examples) and the gallery title prefix for templates and examples (`Template:` / `Example:`)
- **`platform`** — `'web'` (default) or `'app'`; shown as a chip on the gallery
  card (Web / App), and splits the Templates tab into a **Web templates** section
  followed by an **App templates** section
- **`order`** — optional sort key within a block (lower first; default alphabetical)
- **`hidden`** — omit from gallery while keeping the route live
- **`spotlight`** — when any prototype is spotlighted, the gallery shows only
  spotlighted entries (DAW-style solo)

Full field reference, layout rules, and examples:
[`references/gallery-meta.md`](references/gallery-meta.md).

## Common shapes

### Web (`platform: 'web'`)

| Goal | Composition |
| --- | --- |
| Article-style page with chrome (live) | `<ChromeWrapper><ArticleLive article="…"/></ChromeWrapper>` |
| Article-style page with committed snapshot fixture | `<ChromeWrapper><ArticleSnapshot article="…"/></ChromeWrapper>` |
| Article-style page with **hand-written** body HTML (no REST, no snapshot file) | `<ChromeWrapper><ArticleCustom>…</ArticleCustom></ChromeWrapper>` — canonical: **`src/prototypes/template-article-custom/`**; see [`protowiki-components` → `article.md`](../protowiki-components/references/article.md) (infobox classes, lead markup order) |
| Special-page-style page | `<ChromeWrapper><SpecialPageWrapper title="…">…</SpecialPageWrapper></ChromeWrapper>` |
| Newcomer homepage / dashboard | `<ChromeWrapper :last-edited-notice="false"><SpecialPageWrapper title="Dashboard" help><Dashboard>…</Dashboard></SpecialPageWrapper></ChromeWrapper>` — starter: **`template-dashboard/`**; full modules: **`template-homepage/`** |
| Bare canvas with chrome | `<ChromeWrapper>…</ChromeWrapper>` |
| A/B preview, two themes side by side | Two `<ChromeWrapper>`s, one `theme="light"`, one `theme="dark"` |
| Mobile-web preview embedded in a desktop page | `<MobileWrapper><ChromeWrapper skin="mobile">…</ChromeWrapper></MobileWrapper>` |

### App (`platform: 'app'`)

| Goal | Composition |
| --- | --- |
| App shell with header + bottom nav | `<AppChromeWrapper>…</AppChromeWrapper>` — starter: **`template-app-chrome/`** |
| In-app article reader | `<AppChromeWrapper><ArticleLive app article="…"/></AppChromeWrapper>` — starter: **`template-app-article/`** |
| In-app search | `AppChromeHeader` with a search-field item — starter: **`template-app-search/`** |
| iOS vs Android differences | `useIsIos()` / `[data-app-platform]` — see [`protowiki-app-prototyping`](../protowiki-app-prototyping/SKILL.md) |

See [`protowiki-components`](../protowiki-components/SKILL.md) for full
component docs and [`protowiki-components/references/composition-recipes.md`](../protowiki-components/references/composition-recipes.md)
for more recipes.

## What you don't need to do

- **No router config.** `unplugin-vue-router` reads `src/prototypes/` and
  generates the route table. Only `**/index` files under `src/prototypes/` are
  routes; other co-located `.vue` files (e.g. `HelpModule.vue`) are normal imports.
- **No gallery edit.** `src/prototypes/index.vue` reads route `meta` at runtime;
  new top-level folders appear automatically when their `definePage` meta is set.
  Only `src/prototypes/<name>/index.vue` shows on the gallery — nested
  `src/prototypes/<proto>/<sub>/index.vue` routes are registered but listed
  only when linked from inside a prototype (e.g. mobile drill-down pages).
- **No skin/theme/platform setup.** `<html data-skin>`, `<html data-theme>` and
  `<html data-app-platform>` are all set at boot from URL params + viewport +
  `prefers-color-scheme` + stored preferences. Codex tokens cascade through.
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
