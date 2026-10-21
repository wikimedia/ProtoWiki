# Chrome primitives — `ChromeHeader`, `ChromeFooter`

These are the two components `ChromeWrapper` composes to paint the
Wikipedia chrome. They're independently importable when you want the
chrome-without-the-wrapper (e.g., a custom layout that doesn't use
`ChromeWrapper`'s default arrangement).

## Skin variants

**`ChromeHeader`** delegates to **`VectorChromeHeader`** (desktop skin)
or **`MinervaChromeHeader`** (mobile skin) based on effective skin:

| Skin      | Component                 | Chrome feel           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `desktop` | **`VectorChromeHeader`**  | **Vector 2022–style** | Wordmark/tagline (**`wordmarkSrc`**, **`taglineSrc`**, **`#logo`**), **`Search`** + **Search** button, username link (**`username`** + **`#username`**), user-tool cluster (**`navTools`** vs **`#nav`**: appearance, notifications, notices, bookmarks, watchlist, user + chevron). When **`prototypingSettings`** (default **`true`**) and logged in, **appearance** opens web appearance settings (no App OS) and **user** opens mock user settings; wordmarks link to **`/template-main-page`** (no **`?title=`**; appearance query preserved — see **`useWordmarkMainPageLink`**). Main-menu glyph is icon-only (mock) unless **`#menu`** overrides. Global skin stays **desktop** until viewport **≤640px**; below **1120px** inline search collapses to a search icon that opens the search box in place of the menu and wordmark, as in production: it ends where the icon was and fills the space to its left (Escape or blur folds it back). |
| `mobile`  | **`MinervaChromeHeader`** | **Minerva-style**     | Grey elevated bar: menu · wordmark · search + notifications + user — the default search button opens a full-screen **`MobileSearchOverlay`**. When **`#menu`** is omitted, **`MinervaChromeMainMenu`** opens Minerva's off-canvas drawer (mock Wikipedia nav + donate banner). Prop-driven **`left`** / **`middle`** / **`right`** item arrays override regions. Default user control opens mock user settings when **`prototypingSettings`**; default wordmark links to the **Main Page** when **`prototypingSettings`**. **`navTools`** is ignored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

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

| Prop                  | Type                    | Default                       | Notes                                                                                                                                                                                                      |
| --------------------- | ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skin`                | `'desktop' \| 'mobile'` | `undefined`                   | Local skin override; falls back to global `useSkin()`                                                                                                                                                      |
| `theme`               | `'light' \| 'dark'`     | `undefined`                   | Local theme override; falls back to global `useTheme()`                                                                                                                                                    |
| `username`            | `string`                | `'Username'`                  | **Desktop:** Meta link mock before tool icons; trimmed; **`''`** hides unless **`#username`** overrides                                                                                                    |
| `wordmarkSrc`         | `string`                | EN CDN SVG                    | Desktop wordmark **`#logo`** (+ Minerva fallback when **`mobileWordmarkSrc`** omitted)                                                                                                                     |
| `taglineSrc`          | `string`                | EN CDN SVG                    | Desktop tagline **`#logo`** stack                                                                                                                                                                          |
| `mobileWordmarkSrc`   | `string`                | **`wordmarkSrc`** then EN CDN | Minerva bar wordmark when **`middle`** is omitted                                                                                                                                                          |
| `navTools`            | `ChromeNavTool[]`       | full set                      | **Desktop only** — which Vector tool icons render; **`#nav`** replaces cluster                                                                                                                             |
| `left`                | `HeaderItem[]`          | Minerva default               | **Mobile only** — override Minerva **`left`** region                                                                                                                                                       |
| `middle`              | `HeaderItem[]`          | built-in wordmark             | **Mobile only** — override Minerva **`middle`** region                                                                                                                                                     |
| `right`               | `HeaderItem[]`          | Minerva default               | **Mobile only** — override Minerva **`right`** region                                                                                                                                                      |
| `prototypingSettings` | `boolean`               | `true`                        | **Both skins:** when **`true`**, default appearance/user tools open prototyping popovers and wordmarks link to the **Main Page**; when **`false`**, those controls stay mock-only and wordmarks are static |

`HeaderItem` matches **`AppChromeHeader`** (`link` / `button` / `component` / `title` with kebab-case icon names).

`lang` / `dir` are deliberately not props on the primitives. Set them once
on the surrounding wrapper (or on `<html>`) and the chrome inherits them
through the DOM.

Desktop **inline search** is always **`<Search />`** inside **`VectorChromeHeader`** (not a slot).

### Slots

| Slot         | Skin    | Default                                      | Use for                                                       |
| ------------ | ------- | -------------------------------------------- | ------------------------------------------------------------- |
| `#menu`      | both    | **`MinervaChromeMainMenu`** drawer (mobile) when **`#menu`** omitted; mock icon-only menu on desktop | Replace the entire main-menu control (**`ChromeWrapper`** forwards this) |
| `#logo`      | both    | EN Wikipedia wordmark (+ tagline on desktop) | Replace wordmark / lockup                                     |
| `#username`  | desktop | Anchor from **`username`**                   | Replace markup before tool icons                              |
| `#nav`       | desktop | Vector tool icons                            | Replace user-tool cluster (**`navTools`** ignored)            |
| `#user-menu` | desktop | User avatar + caret (or prototyping popover) | Replace only the user-menu control                            |

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

Props: **`theme?`**, **`username?`**, **`wordmarkSrc?`**, **`taglineSrc?`**, **`navTools?`**, **`prototypingSettings?`**

Slots: **`#menu`**, **`#logo`**, **`#username`**, **`#nav`**, **`#user-menu`**

## MinervaChromeHeader

Force mobile Minerva bar regardless of global skin. Prop-driven **`left`** / **`middle`** / **`right`** item arrays — same shape as **`AppChromeHeader`**. No slots.

```ts
import MinervaChromeHeader from '@/components/chrome/MinervaChromeHeader.vue'
import type { MinervaHeaderItem } from '@/components/chrome/MinervaChromeHeader.vue'
```

| Region   | Default                                                                                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `left`   | **`MinervaChromeMainMenu`** (via **`ChromeHeader`** when **`#menu`** omitted) — interactive drawer; plain menu button only when **`left`** is passed explicitly without a menu component                |
| `middle` | Wikipedia wordmark (`RouterLink` to **`/template-main-page`** when **`prototypingSettings`**, else static) when **`middle`** omitted                                                                  |
| `right`  | search (opens **`MobileSearchOverlay`**), notifications, user avatar (mock user settings popover when **`prototypingSettings`**, unless **`ChromeHeader`** **`#user-menu`** or **`right`** overrides) |

Passing your own **`right`** replaces the default search button, so the overlay goes with it — bring your own search.

Adjacent icon buttons/links in **`left`** and **`right`** have **no gap** between them (flush groups).

Props: **`theme?`**, **`left?`**, **`middle?`**, **`right?`**, **`wordmarkSrc?`**, **`mobileWordmarkSrc?`**, **`prototypingSettings?`**

## Main menu components

Shared pieces (import from **`src/components/chrome/`**):

| Component | Use |
| --- | --- |
| **`MinervaMainMenuDrawer`** | Off-canvas shell only — scrim, slide panel, scroll lock, Escape / route-close. Slots: default (scroll body), **`#footer`** (pinned). |
| **`MinervaChromeMainMenu`** | Default mobile main menu: mock Minerva nav rows, donate banner, About / Disclaimers (inert — no off-wiki links). Prop **`prototypingSettings`** — when **`true`**, **Main Page** → **`useWordmarkMainPageLink`**, **Random** → **`/template-article?title=`** (live random title via **`selectRandomArticle`**). Other rows close the drawer only. Slot **`#prototype-footer`**: extra pinned rows (wrap each in **`<li class="minerva-chrome-main-menu__item">`**). |
| **`accountActions`** / **`registerAccountActions`** | Module-level hooks (like **`articleOpener`**) so chrome menus can wire **Create account**, **User page**, or **Log out** without knowing the prototype. Call **`registerAccountActions`** from the prototype wrapper. |

Custom mobile menus can compose **`MinervaMainMenuDrawer`** + their own rows, or replace **`#menu`** entirely.

## ChromeFooter

### Props

| Prop               | Type                    | Default      | Notes                                                                                                     |
| ------------------ | ----------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `skin`             | `'desktop' \| 'mobile'` | `undefined`  |                                                                                                           |
| `theme`            | `'light' \| 'dark'`     | `undefined`  |                                                                                                           |
| `lastEditedNotice` | `boolean`               | `true`       | Mock last-edited **notice** — **`false`** hides it on **both** skins (**`ChromeWrapper`** forwards this). |
| `username`         | `string`                | `'Username'` | Mobile “last edited … by …” line — **`ChromeWrapper`** forwards it                                        |

### Slots

| Slot    | Default                                                | Use for                   |
| ------- | ------------------------------------------------------ | ------------------------- |
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
  by `ArticleLive` / `ArticleCustom` / `ArticleWrapper` / `ArticleRenderer` /
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
**`ArticleLive`**, **`ArticleCustom`**, **`ArticleWrapper`**, **`ArticleRenderer`** **inject** them when their own
`skin` / `theme` props are omitted, so article columns and special-page
typography track embedded `<ChromeWrapper skin="mobile">` previews without
repeating props on every child.
