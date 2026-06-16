# Chrome primitives — `ChromeHeader`, `ChromeFooter`

These are the two components `ChromeWrapper` composes to paint the
Wikipedia chrome. They're independently importable when you want the
chrome-without-the-wrapper (e.g., a custom layout that doesn't use
`ChromeWrapper`'s default arrangement).

## Skin variants

`ChromeHeader` renders **two different shells** based on effective skin
(`data-skin` on the header root):

| Skin | Chrome feel | Notes |
| --- | --- | --- |
| `desktop` | **Vector 2022–style** | Wordmark/tagline (**`wordmarkSrc`**, **`taglineSrc`**, **`#logo` override**), **`Search`** + **Search** button, username link (**`username`** + **`#username`**), user-tool cluster ( **`navTools`** preset vs **`#nav`** override ). **Main-menu glyph is icon-only** (mock). Global skin stays **desktop** until the viewport is **≤640px**; **below 1120px**, inline search collapses to a search icon; **below 768px**, watchlist hides (`nav-button-desktop` parity). |
| `mobile` | **Minerva-style** | Grey elevated bar: menu, Wikipedia wordmark (**`mobileWordmarkSrc`** / **`wordmarkSrc`**, **`#logo`**), search icon + notifications — **`navTools` is ignored**. |

**`ChromeFooter`** matches the skin:

- **`desktop`** — Vector-ish reader strip (muted top border on the inner block). When **`lastEditedNotice`**:
  1. Mock line: **“This page was last edited on …”**
  2. Mock **CC BY-SA** licence blurb + Terms / Privacy / Foundation sentence (article-style metadata)
  Then the prototype note and bullet links.
- **`mobile`** — Minerva-ish stack (see `ChromeFooter.vue`):
  1. Optional **mock “Last edited … by …”** row — driven by **`username`** (forwarded from **`ChromeWrapper`**) with **`lastEditedNotice`**; when hidden, the grey well gains a compensating **top border** so the footer still attaches cleanly.
  2. Grey **well**: wordmark, Wikimedia/MediaWiki badge buttons, divider, short licence line, middot-linked footer rows.

That notice is chrome **fiction** for prototypes — not wired to revisions. The toggle is **`lastEditedNotice`** on **`ChromeFooter`** / **`ChromeWrapper`**.

## ChromeHeader

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `skin` | `'desktop' \| 'mobile'` | `undefined` | Local skin override; falls back to global `useSkin()` |
| `theme` | `'light' \| 'dark'` | `undefined` | Local theme override; falls back to global `useTheme()` |
| `username` | `string` | `'Username'` | Desktop chrome: **Meta link** mock before tool icons; trimmed; **`''`** hides that link unless **`#username`** overrides |
| `wordmarkSrc` | `string` | EN CDN SVG | Desktop wordmark **`#logo`** (+ mobile fallback when **`mobileWordmarkSrc`** omitted) |
| `taglineSrc` | `string` | EN CDN SVG | Desktop tagline **`#logo`** stack |
| `mobileWordmarkSrc` | `string` | **`wordmarkSrc`** then EN CDN | Mobile bar wordmark when **`#logo`** default |
| `navTools` | `ChromeNavTool[]` | full set (`src/components/chrome/headerNavTools.ts`) | Which desktop tool icons render; **`#nav`** replaces cluster |

`lang` / `dir` are deliberately not props on the primitives. Set them once
on the surrounding wrapper (or on `<html>`) and the chrome inherits them
through the DOM.

Desktop **inline search** is always **`<Search />`** inside the header (not a slot).

### Slots

| Slot | Default | Use for |
| --- | --- | --- |
| `#logo` | EN Wikipedia wordmark (+ tagline on desktop) via `<img>` | Replace with another project's wordmark / lockup |
| `#username` | Anchor from **`username`** (hidden when empty after trim) | Replace with custom markup before tool icons (**desktop**) |
| `#nav` | Vector-style tool icons on **desktop** only | Replace the default user-tool cluster (**`navTools` ignored**) |

### Example

```vue
<ChromeHeader />
```

## ChromeFooter

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `skin` | `'desktop' \| 'mobile'` | `undefined` | |
| `theme` | `'light' \| 'dark'` | `undefined` | |
| `lastEditedNotice` | `boolean` | `true` | Mock last-edited **notice** — **`false`** hides it on **both** skins (**`ChromeWrapper`** forwards this). |
| `username` | `string` | `'Username'` | Mobile “last edited … by …” line — **`ChromeWrapper`** forwards it |

### Slots

| Slot | Default | Use for |
| --- | --- | --- |
| default | Desktop strip or Minerva well (see skin section above) | Replace the entire footer |

### Example

```vue
<ChromeFooter>
  <p>This prototype is for design review only.</p>
</ChromeFooter>
```

## When to use the primitives directly

Most prototypes use `<ChromeWrapper>`, which composes both primitives.
Use them directly when:

- You want the chrome but with a non-default layout between header and
  footer (e.g., a 3-column layout with sticky toolbars that isn't covered
  by `ArticleLive` / `ArticleSnapshot` / `ArticleCustom` / `ArticleWrapper` / `ArticleRenderer` /
  `SpecialPageWrapper`).
- You want the header but no footer (or vice versa).
- You're building your own wrapper and the new wrapper genuinely warrants
  living in `src/components/` (rare).

```vue
<script setup lang="ts">
import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import ChromeFooter from '@/components/chrome/ChromeFooter.vue'
</script>

<template>
  <div class="custom-shell">
    <ChromeHeader />
    <main class="custom-shell__body">
      <!-- bespoke layout here -->
    </main>
    <ChromeFooter />
  </div>
</template>
```

## Inheriting skin/theme inside `ChromeWrapper`

`ChromeWrapper` **provides** effective skin and theme to descendants.
**`ArticleLive`**, **`ArticleSnapshot`**, **`ArticleCustom`**, **`ArticleWrapper`**, **`ArticleRenderer`** **inject** them when their own
`skin` / `theme` props are omitted, so article columns and special-page
typography track embedded `<ChromeWrapper skin="mobile">` previews without
repeating props on every child.
