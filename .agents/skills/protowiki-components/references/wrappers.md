# Wrappers

`ChromeWrapper`, `SpecialPageWrapper`, `PlainWrapper`, `MobileWrapper`.
Each is a layout shell with one concern. Compose by nesting — there is no
chrome-bundled convenience wrapper. **`ArticleLive`**, **`ArticleSnapshot`**, and **`ArticleCustom`**
(reader surfaces) live in [`article.md`](article.md).

## Defaults, props, and slots

For each named region: **sensible default markup** in the component → **props**
for simple tweaks (same base name as the slot where it makes sense) → **named
slot `#x`** replaces the default inner content and **wins** when provided.
Boolean region toggles use **names like `actions`**, not `show*`.

## Primary headings (on-rails)

Reader-style **underlined first headings** use MediaWiki’s **`mw-first-heading`**
class; ProtoWiki defines its look once in `src/styles/global.css`.

Components **emit** that class from their templates — you pass a **prop** or
**named slot** instead of hand-writing `<h1>`:

| Surface              | Prop                                                                                                                                 | Slot                                            | Notes                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PlainWrapper`       | `heading?`                                                                                                                           | `#heading`                                      | Omit both when there is no primary title                                                                                     |
| `ArticleWrapper`     | `title?`, **`header?`**, **`languagesCount?`**, **`lang?`, `dir?`**, … chrome only                                                   | **default**                                     | Always **`ArticleHeader`**; **`ArticleRenderer`** (or bespoke markup) in **default**.                                        |
| `ArticleRenderer`    | **`lang?`/`dir?`/`skin?`/`theme?`**                                                                                                  | **default**                                     | **`.article-content`** + **`.mw-parser-output`** + keyed slot root; **`ArticleLive`** / **`ArticleSnapshot`** gate mounting. |
| `ArticleLive`        | **`article`** (REST title) + chrome keys (same **`ArticleWrapper`**) + **`host`**                                                    | **default** → **`ArticleRenderer`**             | Fetches **`page/html`**; progress/errors ship in **default** before **`ArticleRenderer`**.                                   |
| `ArticleSnapshot`    | **`article`** + chrome (**no **`host\*\*)                                                                                            | **default** → **`ArticleRenderer`**             | Snapshot HTML; **`Cdx`** load/error UI **default** before **`ArticleRenderer`**.                                             |
| `ArticleCustom`      | **`title?`**, **`header?`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`** (no **`article`**, no **`host`**) | **default** → **`ArticleRenderer`**             | Hand-authored parser body only.                                                                                              |
| `SpecialPageWrapper` | `title?` (`null` hides default **`h1`** unless `#title`); `#header` replaces cluster                                                 | `title` / `#title` (inner), `#header` (cluster) | Scoped special-page title typography (not **`mw-first-heading`**)                                                            |

`ChromeWrapper` does **not** render a page title — compose with
the rows above.

## ChromeWrapper

Adds the Wikipedia chrome (header + footer) around its default slot. **No
layout columns**: anything goes inside the chrome.

**`ChromeWrapper`** forwards the same props to the default **`ChromeHeader`** /
**`ChromeFooter`** (when you keep the default **`#header`** / **`#footer`** slots):
footer mock last-edited chrome, username, and header logo / nav-tool configuration.

### Props

| Prop                | Type                    | Default          | Notes                                                                                                                                                                                                               |
| ------------------- | ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lang`              | `string`                | `undefined`      | BCP-47 language tag; sets `lang` on the wrapper root and is inherited by descendants via the DOM                                                                                                                    |
| `dir`               | `'ltr' \| 'rtl'`        | `undefined`      | Writing direction; sets `dir` on the wrapper root. Pass explicitly — we don't infer it from `lang`                                                                                                                  |
| `skin`              | `'desktop' \| 'mobile'` | `undefined`      | Local skin override; forwarded to **`ChromeHeader`** / **`ChromeFooter`**                                                                                                                                           |
| `theme`             | `'light' \| 'dark'`     | `undefined`      | Local theme override; forwarded to **`ChromeHeader`** / **`ChromeFooter`**                                                                                                                                          |
| `lastEditedNotice`  | `boolean`               | `true`           | Forwarded to **`ChromeFooter`**: mock **last edited** notice — **desktop:** Vector-style timestamp + CC licence lines; **mobile:** Minerva strip above the grey well. Set **`false`** for special-page–style shells |
| `username`          | `string`                | `'Username'`     | Forwarded to **`ChromeHeader`** / **`ChromeFooter`**: desktop chrome user link + mobile “last edited by …”. Trimmed; **`''`** hides the header link (footer still falls back to **`Username`** for that line)       |
| `wordmarkSrc`       | `string`                | `undefined`      | Forwarded to **`ChromeHeader`** — desktop default wordmark **`#logo`** image URL                                                                                                                                    |
| `taglineSrc`        | `string`                | `undefined`      | Forwarded to **`ChromeHeader`** — desktop tagline image under the wordmark                                                                                                                                          |
| `mobileWordmarkSrc` | `string`                | `undefined`      | Forwarded to **`ChromeHeader`** — Minerva bar wordmark; defaults to **`wordmarkSrc`** then EN constant                                                                                                              |
| `navTools`          | `ChromeNavTool[]`       | full desktop set | Forwarded to **`ChromeHeader`** — which mocked Vector tool icons appear (**desktop**); **`#nav`** still replaces the cluster                                                                                        |

`ChromeNavTool` literals: `'appearance' \| 'notifications' \| 'notices' \| 'watchlist' \| 'user'` (see `src/components/chrome/headerNavTools.ts`).

`lang` and `dir` are the usual top-of-tree handles: primitives inside don't need their
own `lang` prop because the value is inherited via the DOM. **`ArticleLive`**, **`ArticleSnapshot`**, and **`ArticleCustom`** also accept
`lang` / `dir` when you need them on the article subtree only.

### Slots

| Slot      | Default content                                                             | Use for                                                                              |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| default   | (your prototype)                                                            | Page body between header and footer                                                  |
| `#header` | `<ChromeHeader>` with props above                                           | Replace the entire header (custom header does not receive automatic prop forwarding) |
| `#footer` | `<ChromeFooter>` (`lastEditedNotice` + `username` from **`ChromeWrapper`**) | Replace the entire footer                                                            |

The chrome user link and search are **built-ins** on **`ChromeHeader`**; tweak them via **`ChromeWrapper`** props unless you replace **`#header`**.

### Example

```vue
<ChromeWrapper>
  <h1 class="mw-first-heading">My prototype</h1>
  <p>Paragraph text rendered between Wikipedia chrome.</p>
</ChromeWrapper>

<!-- Chrome user label (Meta link mock); empty string hides the link -->
<ChromeWrapper username="ExamplePatroller">
  <p>…</p>
</ChromeWrapper>

<!-- RTL preview embedded next to an LTR one -->
<div class="grid grid-cols-2 gap-4">
  <ChromeWrapper lang="en" dir="ltr">…</ChromeWrapper>
  <ChromeWrapper lang="ar" dir="rtl">…</ChromeWrapper>
</div>
```

## SpecialPageWrapper

Special-page shell — a title row, an actions row above the content, and a
full-width content area. **No chrome, no columns.**

Regions appear when **`actions`** is true **or** the matching **slot** is supplied; **`help`** reserves the help cell when **`true`** **`or`** when **`#help`** is used.

### Props

| Prop      | Type                    | Default     | Notes                                                                                                                                                                                                                |
| --------- | ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`   | `string \| null`        | `undefined` | Default inner text of the special-page **`h1`**; **`#title`** overrides inner markup. **`null`** suppresses that default **`h1`** unless **`#title`** is supplied, or use **`#header`** for the whole title cluster. |
| `help`    | `boolean`               | `false`     | **`true`** shows default **"Help"** link to Codex docs (**desktop**). **`#help`** overrides inner markup. URL is fixed in the component.                                                                             |
| `actions` | `boolean`               | `false`     | Reserve the actions aside (**empty** when no **`#actions`**)                                                                                                                                                         |
| `lang`    | `string`                | `undefined` | BCP-47 language tag; sets `lang` on the root                                                                                                                                                                         |
| `dir`     | `'ltr' \| 'rtl'`        | `undefined` | Pass `'rtl'` explicitly for RTL previews                                                                                                                                                                             |
| `skin`    | `'desktop' \| 'mobile'` | `undefined` |                                                                                                                                                                                                                      |
| `theme`   | `'light' \| 'dark'`     | `undefined` |                                                                                                                                                                                                                      |

### Slots

| Slot       | Use for                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| default    | Page body                                                                                                                                                                                        |
| `#header`  | Replaces the **title cluster** on the left (default: scoped **`h1`** + **`#title`** / **`title`** inner). Unrelated to **`ChromeWrapper`'s **`#header`** slot (whole site **`ChromeHeader`\*\*). |
| `#title`   | Replaces inner content of the default **`h1`** (not used when **`#header`** replaces the cluster).                                                                                               |
| `#help`    | Right side of the title row (**overrides** default Help link; still **desktop**-only in the default skin)                                                                                        |
| `#actions` | Secondary toolbar beside `#help`                                                                                                                                                                 |

### Example

```vue
<!-- Omit mock last-edited notice (typical special pages): -->
<ChromeWrapper :last-edited-notice="false">
  <SpecialPageWrapper title="Suggested edits">
    <template #actions>
      <CdxButton action="progressive" weight="primary">Pick task</CdxButton>
    </template>
    <p>Body content here.</p>
  </SpecialPageWrapper>
</ChromeWrapper>

<!-- Title + canned Help affordance -->
<SpecialPageWrapper title="My special page" help />
```

Mirror FakeMediaWiki `SpecialView`: title row flex + optional Help. See **`src/prototypes/template-special-page/index.vue`**.

## PlainWrapper

Minimal shell — a **centred column** (`max-width: 45rem`) with horizontal
padding. **No Wikipedia chrome**, no article columns. Matches FakeMediaWiki’s
**Component** wrapper (bare prototype surface).

The **home gallery** (`src/prototypes/index.vue`) uses `PlainWrapper`. Each card
is a `CdxCard` whose title and description come from route `meta` set in
`definePage`. See [`protowiki-create-prototype` → `gallery-meta.md`](../../protowiki-create-prototype/references/gallery-meta.md)
for `category`, `order`, `hidden`, `spotlight`, and the human-written copy rule.

### Props

| Prop      | Type             | Default     | Notes                                                                |
| --------- | ---------------- | ----------- | -------------------------------------------------------------------- |
| `heading` | `string`         | `undefined` | Plain-text primary heading — renders `<h1 class="mw-first-heading">` |
| `lang`    | `string`         | `undefined` | Sets `lang` on the root                                              |
| `dir`     | `'ltr' \| 'rtl'` | `undefined` | Sets `dir` on the root                                               |

### Slots

| Slot       | Use for                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `#heading` | Replaces inner content of the `<h1>` (use with or instead of `heading`) |
| `#actions` | Controls inside the same `<header>` as the `h1` (right side)            |
| default    | Body below the heading                                                  |

### Example

```vue
<PlainWrapper heading="Widget title">
  <p>Body below the reader-style title.</p>
</PlainWrapper>

<!-- Rich heading -->
<PlainWrapper>
  <template #heading>
    <router-link to="/">Home</router-link>
  </template>
  <p>Default slot only — no <code>heading</code> prop.</p>
</PlainWrapper>
```

## MobileWrapper

Phone-frame preview shell — **not** Wikipedia chrome. Below **480px** viewport
width the default slot is full width with no side gutters. At **480px** and up,
the slot is centred in a **`max-width: 360px`** column; **`--background-color-neutral`**
fills the side gutters; the column uses **`--background-color-base`** and a
**`--border-color-muted`** side borders only (Codex light / dark).

Does **not** set `data-skin` / `data-theme` — pass those on content inside the slot
(usually **`ChromeWrapper skin="mobile"`**). **`Dashboard`** keys its mobile/desktop slots off ancestor **`data-skin`**, so pass **`skin="mobile"`** when previewing a phone layout inside this frame.

### Props

| Prop       | Type             | Default   | Notes                                      |
| ---------- | ---------------- | --------- | ------------------------------------------ |
| `maxWidth` | `string`         | `'360px'` | Centred column width when clamped (wide)   |
| `lang`     | `string`         | `undefined` | Sets `lang` on the inner column          |
| `dir`      | `'ltr' \| 'rtl'` | `undefined` | Sets `dir` on the inner column           |

### Slots

| Slot    | Use for                                      |
| ------- | -------------------------------------------- |
| default | Preview content (e.g. mobile-skinned chrome) |

### Example

```vue
<MobileWrapper>
  <ChromeWrapper skin="mobile" :last-edited-notice="false">
    <ArticleLive article="Albert Einstein" />
  </ChromeWrapper>
</MobileWrapper>
```

## Why these wrappers?

The earlier draft of this repo had `ArticleLayout`, `ArticleBody`,
`ArticleWrapper-with-chrome`, `PhoneFrame`, `SideBySide` and similar.
They overlapped: every author had to learn which one bundled chrome, which
one bundled columns, which one was a presentation device.

The current set covers:

- chrome (`ChromeWrapper`)
- article reader surface (`ArticleLive` / `ArticleSnapshot` / `ArticleCustom`; see [`article.md`](article.md))
- special-page shell (`SpecialPageWrapper`)
- newcomer homepage grid (`Dashboard` + `DashboardModule`; see [`dashboard.md`](dashboard.md) and **`src/prototypes/template-homepage/`**)
- plain centred column (`PlainWrapper`)
- mobile phone-frame preview (`MobileWrapper` + `ChromeWrapper skin="mobile"`)

A/B comparison and dark snippet on a light page use the shared `skin` /
`theme` props on those same components. See [`composition-recipes.md`](composition-recipes.md).
