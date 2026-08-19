# Chrome primitives — `ChromeHeader`, `ChromeFooter`

These are the two components `ChromeWrapper` composes to paint the
Wikipedia chrome. They're independently importable when you want the
chrome-without-the-wrapper (e.g., a custom layout that doesn't use
`ChromeWrapper`'s default arrangement).

## Skin variants

**`ChromeHeader`** delegates to **`VectorChromeHeader`** (desktop skin)
or **`MinervaChromeHeader`** (mobile skin) based on effective skin:

| Skin | Component | Chrome feel | Notes |
| --- | --- | --- | --- |
| `desktop` | **`VectorChromeHeader`** | **Vector 2022–style** | Wordmark/tagline (**`wordmarkSrc`**, **`taglineSrc`**, **`#logo`**), **`Search`** + **Search** button, username link (**`username`** + **`#username`**), user-tool cluster (**`navTools`** vs **`#nav`**). Main-menu glyph is icon-only (mock). Global skin stays **desktop** until viewport **≤640px**; below **1120px** inline search collapses to a search icon; below **768px** watchlist hides. |
| `mobile` | **`MinervaChromeHeader`** | **Minerva-style** | Grey elevated bar: menu · wordmark · search + notifications + user — prop-driven **`left`** / **`middle`** / **`right`** item arrays. **`navTools`** is ignored. |

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

Public skin-aware delegator — import directly or use via **`ChromeWrapper`'s** default **`#header`** slot.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `skin` | `'desktop' \| 'mobile'` | `undefined` | Local skin override; falls back to global `useSkin()` |
| `theme` | `'light' \| 'dark'` | `undefined` | Local theme override; falls back to global `useTheme()` |
| `username` | `string` | `'Username'` | **Desktop:** Meta link mock before tool icons; trimmed; **`''`** hides unless **`#username`** overrides |
| `wordmarkSrc` | `string` | EN CDN SVG | Desktop wordmark **`#logo`** (+ Minerva fallback when **`mobileWordmarkSrc`** omitted) |
| `taglineSrc` | `string` | EN CDN SVG | Desktop tagline **`#logo`** stack |
| `mobileWordmarkSrc` | `string` | **`wordmarkSrc`** then EN CDN | Minerva bar wordmark when **`middle`** is omitted |
| `navTools` | `ChromeNavTool[]` | full set | **Desktop only** — which Vector tool icons render; **`#nav`** replaces cluster |
| `left` | `HeaderItem[]` | Minerva default | **Mobile only** — override Minerva **`left`** region |
| `middle` | `HeaderItem[]` | built-in wordmark | **Mobile only** — override Minerva **`middle`** region |
| `right` | `HeaderItem[]` | Minerva default | **Mobile only** — override Minerva **`right`** region |

`HeaderItem` matches **`AppChromeHeader`** (`link` / `button` / `component` / `title` with kebab-case icon names).

`lang` / `dir` are deliberately not props on the primitives. Set them once
on the surrounding wrapper (or on `<html>`) and the chrome inherits them
through the DOM.

Desktop **inline search** is always **`<Search />`** inside **`VectorChromeHeader`** (not a slot).

### Slots

| Slot | Skin | Default | Use for |
| --- | --- | --- | --- |
| `#menu` | both | menu button / icon | Replace main-menu control (**`ChromeWrapper`** forwards this) |
| `#logo` | both | EN Wikipedia wordmark (+ tagline on desktop) | Replace wordmark / lockup |
| `#username` | desktop | Anchor from **`username`** | Replace markup before tool icons |
| `#nav` | desktop | Vector tool icons | Replace user-tool cluster (**`navTools`** ignored) |

### Example

```vue
<script setup lang="ts">
import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
</script>

<template>
  <ChromeHeader />
</template>
```

## VectorChromeHeader

Force desktop Vector chrome regardless of global skin. Same props/slots as the desktop path of **`ChromeHeader`** (except **`skin`** / Minerva item arrays).

```ts
import VectorChromeHeader from '@/components/chrome/VectorChromeHeader.vue'
```

Props: **`theme?`**, **`username?`**, **`wordmarkSrc?`**, **`taglineSrc?`**, **`navTools?`**

Slots: **`#menu`**, **`#logo`**, **`#username`**, **`#nav`**

## MinervaChromeHeader

Force mobile Minerva bar regardless of global skin. Prop-driven **`left`** / **`middle`** / **`right`** item arrays — same shape as **`AppChromeHeader`**. No slots.

```ts
import MinervaChromeHeader from '@/components/chrome/MinervaChromeHeader.vue'
import type { MinervaHeaderItem } from '@/components/chrome/MinervaChromeHeader.vue'
```

| Region | Default |
| --- | --- |
| `left` | menu button |
| `middle` | Wikipedia wordmark (`RouterLink` + `<img>`) when **`middle`** omitted |
| `right` | search, notifications, user avatar buttons |

Adjacent icon buttons/links in **`left`** and **`right`** have **no gap** between them (flush groups).

Props: **`theme?`**, **`left?`**, **`middle?`**, **`right?`**, **`wordmarkSrc?`**, **`mobileWordmarkSrc?`**

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
