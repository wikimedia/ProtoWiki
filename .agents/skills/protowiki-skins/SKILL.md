---
name: protowiki-skins
description: How desktop (Vector 2022) vs mobile (Minerva) skins work in ProtoWiki — the boot-time resolution of ?skin= URL param + viewport into a data-skin attribute on <html>, the per-component skin prop for embedding mobile previews on desktop pages, and the read-only useSkin() hook. Use when adding skin-specific styles, embedding a mobile preview, debugging the responsive breakpoint, or wiring a "show mobile" toggle.
license: MIT
---

# ProtoWiki — skins

ProtoWiki ships two Wikipedia-shaped skins:

- **Vector 2022** (`data-skin="desktop"`) — the modern desktop skin.
- **Minerva** (`data-skin="mobile"`) — the mobile-web skin.

Skins control layout (column count, sticky rails, search-bar visibility,
font-sizes) but not colours — those are the
[theme](../protowiki-theme/SKILL.md)'s job.

## How the global skin is resolved

At boot, `src/lib/theming.ts` decides the global skin in this order:

1. `?skin=desktop` or `?skin=mobile` URL param, if either is present.
2. Otherwise, viewport: `window.innerWidth >= 640` → `desktop`, else `mobile`.
   This matches **FakeMediaWiki** (`SpecialView/style.css`): desktop chrome
   (`nav-desktop`) stays until **640px**; below that, mobile chrome (`nav-mobile`).

The result is set as `data-skin="…"` on `<html>`. When the URL param is
**not** pinning the value, the boot script subscribes to a media-query
listener so the global skin updates live as the viewport crosses **640 px**.

`?skin=` URL param wins permanently for that session (no live subscription
when the URL forces a value).

## How CSS skins work

Skin affects layout via **`data-skin="desktop"`** vs **`data-skin="mobile"`**
on component roots (`ChromeWrapper`, `ArticleLive`, `ArticleSnapshot`, `ArticleCustom`, `ChromeHeader`, etc.).
Desktop vs mobile rules live **next to those components** in scoped `<style>`
blocks (e.g. `.article[data-skin='mobile'] { … }` for tighter article padding).

Vector chrome additionally uses **`@media (max-width: 1120px)`** inside
`ChromeHeader.vue` to hide inline search and show the search icon — same idea as
FakeMediaWiki’s `.nav-item-search` / `.nav-button-search` toggle — and
**`@media (max-width: 768px)`** to hide desktop-only tools such as the watchlist mock
(FakeMediaWiki’s `.nav-button-desktop`). Those are **layout** breakpoints inside desktop
chrome, not skin changes; global skin still flips only at **640px**
unless `?skin=` pins it.

Subtree `skin` overrides use the same `data-skin` attributes; prefer those over ad hoc
`@media` for skin switching.

## Per-subtree `skin` prop

Every wrapper (and every other themable component) accepts an optional
`skin` prop. When set, it renders `data-skin="…"` on the component's root
element, locally re-skinning everything inside that subtree.

```vue
<!-- Mobile preview embedded in an otherwise-desktop page -->
<MobileWrapper>
  <ChromeWrapper skin="mobile">
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
</MobileWrapper>
```

When `skin` is **unset**, wrappers resolve **effective** `data-skin` from Vue
inject (inside `ChromeWrapper`) or from global boot state on `<html>`, so
nested previews stay consistent.

[`MobileWrapper`](../protowiki-components/references/wrappers.md#mobilewrapper)
centres the column and adds neutral side gutters on wide viewports; set
`skin="mobile"` on **`ChromeWrapper`** inside it for Minerva chrome.

## `useSkin()` — read-only hook

`src/composables/useSkin.ts` exports a hook that returns a reactive
read-only `Ref<'desktop' | 'mobile'>` reflecting the GLOBAL skin (the
value on `<html>`):

```ts
import { useSkin } from '@/composables/useSkin'

const skin = useSkin()        // Ref<'desktop' | 'mobile'>, read-only

console.log(skin.value)       // 'desktop' or 'mobile'
```

It does **not** mutate page state, and it does **not** reflect local
subtree overrides set via the `skin` prop. A component that received a
`skin` prop already knows its effective skin; it doesn't need this hook.

Use this only when CSS attribute selectors aren't enough — e.g., a piece
of layout that has to vary structurally with skin, or a debug overlay
that displays the current global skin.

## ResourceLoader styles for `.mw-parser-output`

ProtoWiki ships Wikipedia **Vector 2022** and **Minerva** ResourceLoader bundles
under `src/styles/wiki-skins/`, **scoped** so each rule applies only inside an
`.mw-parser-output` subtree under the matching `[data-skin]` attribute (desktop /
mobile). Both bundles load together from `main.ts` after Codex / global CSS, and
subtree `skin` previews pick up the right parser styling.

Why scope to `.mw-parser-output`? RL bundles are written for full Wikipedia chrome,
so they include rules like `a { padding: 0 !important }`, `a:hover { text-decoration:
underline }`, and `body { font-family: … }`. Without scoping, they squash Cdx buttons
that render as `<a>`, underline Cdx cards on hover, and override our chrome styling
generally. We draw chrome with Codex; we only need RL for article HTML rendered
through **`ArticleRenderer`** (**`ArticleLive`** / **`ArticleSnapshot`** / **`ArticleCustom`** nest **`ArticleRenderer`** under **`ArticleWrapper`**).

`scripts/scope-wiki-skin-css.mjs` runs in two passes:

1. **Prefix.** Every selector is rewritten under the matching skin prefix.
   Bare root selectors (`html`, `body`, `:root`, optionally with pseudo-classes)
   collapse onto `[data-skin="…"] .mw-parser-output`. Compound root selectors
   (`html.skin-theme-clientpref-os`, etc.) stay intact under the skin prefix —
   they're dormant in our app because we never set those root classes, and
   keeping them dormant prevents OS-dark or clientpref-night rules from fighting
   `data-theme`.
2. **Drop collapsed-root rules.** Anything whose final selector is exactly
   `[data-skin="…"] .mw-parser-output` is removed. Those are page-level
   declarations from RL — Vector's `body { background-color: var(--background-color-neutral-subtle); … }`
   page chrome, plus token re-paints inside `@media (prefers-color-scheme: dark)`.
   ProtoWiki provides all of that itself: body typography in `global.css`,
   page background / colour in our wrappers, theme tokens via `data-theme`.
   Letting RL paint the article column with the page palette would mean the
   article body shows up in `--background-color-neutral-subtle` instead of
   `--background-color-base`, and the OS dark preference would locally redefine
   the entire token palette inside parser output regardless of `data-theme`.

Refresh periodically with `npm run snapshot:wiki-skins`. Details:
[`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md).

If a future feature needs RL chrome rules to apply outside `.mw-parser-output`, edit
`scripts/scope-wiki-skin-css.mjs` — but plan to also write Codex-side overrides to
beat the `!important` rules RL ships.

## Common pitfalls

- **Don't use `@media (max-width: …)` in skin CSS.** Use `[data-skin]`
  attribute selectors. The viewport is already resolved into `data-skin`.
- **Don't watch `window.innerWidth` from your component.** Use the
  `useSkin()` hook, which is reactive and reflects the boot-time
  resolution + viewport listener.
- **Don't try to read the local skin override from `useSkin()`.** It only
  reflects `<html>`. A component that received a `skin` prop already has
  the answer in props.
