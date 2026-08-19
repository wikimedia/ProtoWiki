# Article surface — `ArticleWrapper`, `ArticleRenderer`, `ArticleLive`, `ArticleSnapshot`, `ArticleCustom`, `ArticleHeader`

**Web or app is one prop.** All three article surfaces (**`ArticleLive`**, **`ArticleSnapshot`**, **`ArticleCustom`**) take **`app?: boolean`** and forward it to **`ArticleWrapper`** + **`ArticleRenderer`**; there are no separate **`App…`** article components. See [In-app articles](#in-app-articles-app).

## Composition model

- **`ArticleWrapper`** — reader layout shell **only**: outer semantic **`<article>`**, then **`ArticleHeader`** (web) or the apps' lead block (**`app`**), and a **default slot** for the reader column (**`ArticleLive`** / **`ArticleSnapshot`** put progress/errors **first**, then **`ArticleRenderer`** — typically **`ArticleRenderer`**).

- **`ArticleRenderer`** — parser column (**`.article-content`** shell): **`#default`** is the sole parser subtree (wraps **`<slot />`** in **`.mw-parser-output`** + inner **`:key="effectiveSkin"`** remount for Minerva accordion DOM). Caller supplies authored markup or **`v-html`** wrappers in the slot. Mobile **`section > h2`** affordances apply whenever **`effectiveSkin`** is **`mobile`**. Skin-scoped RL CSS. Title chrome is **`ArticleHeader`** only (not **`ArticleRenderer`**).

- **`ArticleLive`** — **`ArticleWrapper`** + inline progress/error (**`CdxProgressBar`** / **`CdxMessage`**) **`+`** **`ArticleRenderer`**: **`ArticleRenderer`** mounts when **`liveHtml !== null`** or the consumer overrides **`#default`**; fetched body renders as default slot **`v-html`** unless **`#default`** is passed through.

- **`ArticleSnapshot`** — same gate (**`snapshotHtml !== null`** or **`#default`**) with snapshot load / error **`Cdx`** UI before **`ArticleRenderer`**.

- **`ArticleCustom`** — **`ArticleWrapper`** + **`ArticleRenderer`** with **no fetch**: you supply **`.mw-parser-output`** contents in **`#default`**. Same chrome passthroughs as **`ArticleWrapper`** (**`title`**, **`header`**, **`languagesCount`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**) — use when hand-authored markup is easier than **`page/html`** or a snapshot file.

**`ArticleLive`**, **`ArticleSnapshot`**, and **`ArticleCustom`** are independent — none imports the others; **`ArticleLive`** and **`ArticleSnapshot`** each compose **`ArticleWrapper`** and **`ArticleRenderer`** with loading UI; **`ArticleCustom`** is the thin **`ArticleWrapper` → `ArticleRenderer`** shell.

For a **standalone parser embed** without **`ArticleHeader`** (advanced), nest **`ChromeWrapper`** (or **`PlainWrapper`**) + **`ArticleRenderer`**.

When any of these roots sit inside **`ChromeWrapper`**, they **inherit** effective **`skin`** / **`theme`** via Vue inject (same pattern as **`SpecialPageWrapper`**).

## Article title wiring

- **`ArticleWrapper`** uses **`title?`** (+ **`header?`**, optional **`languagesCount?`**): **`ArticleHeader`** shows **`header`** trimmed if set; otherwise underscores in **`title`** become spaces. With neither, web chrome falls back to **`'Article'`**, while the **`app`** lead block simply omits its **`h1`** (so a random article shows no placeholder title while it resolves).

- **`ArticleLive.article`** selects the **`page/html/{title}`** page and forwards the same string to **`ArticleWrapper`** as **`title`** (optional **`header`** overrides **`ArticleHeader`**). **When `article` is omitted, a random title is selected each load** (see **Random mode** below) and that resolved title feeds **`ArticleWrapper`**.

- **`ArticleSnapshot.article`** picks **`public/snapshots/&lt;slug&gt;.html`** via **`articleSnapshotSlug`** and is forwarded to **`ArticleWrapper`** **`title`** (**`ArticleHeader`** label — underscores → spaces the same as **`ArticleLive`**).

- **`header`** (**`ArticleLive`** on **`ArticleWrapper`**, and **`ArticleCustom`**) overrides the derived chrome title; **`ArticleRenderer`** does **not** consume **`title`** or **`header`**.

- With **`app`**, that same title becomes the lead-block **`h1`** instead of the **`ArticleHeader`** label, and **`ArticleLive`** upgrades it to the canonical title once **`fetchArticleView()`** answers.

## `ArticleWrapper`

| Concern      | Notes                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome props | **`title?`**, **`header`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**, …                                            |
| App props    | **`app?`** (lead block instead of **`ArticleHeader`**, skin pinned to **`mobile`**), **`description?`**, **`leadImageUrl?`** — **`app`** only |
| Slots        | **default** (**main reader column** — **`ArticleRenderer`** or bespoke markup)                                                                  |

In **`app`** mode the wrapper drops its own inline padding — the app chrome already pads the screen edges — and the lead image bleeds back out through that gutter.

## `ArticleRenderer`

| Concern | Notes                                                                                                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props   | **`lang`/`dir`/`skin`/`theme`** (no parser string prop — use **`#default`**), **`app?`**                                                                                |
| Slots   | **`#default`** — contents appear inside **`.mw-parser-output`**; omit **`ArticleRenderer`** when there is nothing to render ( **`ArticleLive`** / **`ArticleSnapshot`** gate mounting). |

**`app`** (default **`false`**) switches the mobile reading affordances from web to in-app, and **pins the skin to `mobile`** (app chrome provides no **`data-skin`** to inherit). The article surfaces forward their own **`app`** prop, so you only pass it here when composing **`ArticleRenderer`** by hand.

| Behaviour            | **`app: false`** (web mobile)                     | **`app: true`** (in-app)                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`section > h2`**   | every section collapsible, all starting **open**  | only **References** / **External links** collapse, starting **closed**; every other heading is static (same look, no chevron, no toggle)                                                                            |
| Heading rule         | rule under each **`h2`**                          | no rule; the boundary is drawn once as a **top border** on the first end-matter **`section`** (**`.protowiki-mobile-end-matter-start`**, absent when neither section exists)                                          |
| Tables               | styled in place                                   | folded into **Quick facts** / **More information** widgets — see below                                                                                                                                              |
| Navboxes             | rendered                                          | hidden (**`.navbox`**, **`.vertical-navbox`** — authority control is a navbox too), matching the apps' article HTML; hatnotes and sister-site boxes stay                                                             |

App-mode CSS keys off **`.article-content--app`** on the renderer root, and **`.article--app`** on the wrapper root.

End-matter headings match by text or anchor id, so **`External links`** matches **`id="External_links"`**; the list is the module constant **`APP_END_MATTER`** in **`ArticleRenderer.vue`**.

**Collapsed table widgets** come from **`shared/collapseArticleTables.ts`**, a port of the apps' **`CollapseTable`** page-library transform (which can't be used directly — it only runs inside a PCS **`mobile-html`** document). Each eligible table is wrapped in **`.protowiki-collapse-table-container`** with a header button (**`Quick facts`** for **`.infobox`**, **`More information`** otherwise, plus a caption made of the first two usable **`th`** texts and an ellipsis), the table in a scrolling **`.protowiki-collapse-table__content`**, and a **`Close`** footer button. All start collapsed. **`navbox`**, **`vertical-navbox`**, **`navbox-inner`**, **`metadata`** and **`mbox-small`** tables are left alone, as are non-infobox tables with no usable headers. Re-running is a no-op, so hot reloads and re-renders are safe.

Companion CSS (**`mobile-wiki-overrides.css`**, **`ArticleRenderer.vue`** unscoped block: wide tables, mobile infobox / lead order, hatnotes) keys off **`.article[data-skin] .mw-parser-output`**, so **`ArticleWrapper`** + bare **`div.mw-parser-output`** behaves like **`ArticleRenderer`** for those rules (the **`.article-content`** wrapper still adds its own padding / **`min-width: 0`**). Prefer **`ArticleRenderer`** for **`ArticleLive`**, **`ArticleSnapshot`**, **`page/html`**, snapshots, and mobile **`innerHTML`** **`section > h2`** affordances. Fetched **`page/html`** emits **`section[data-mw-section-id=&quot;0&quot;]`**; on mobile, **`enhanceMobileLeadInfoboxOrder()`** in **`ArticleRenderer.vue`** reorders that section’s DOM so lead prose stacks above the infobox.

### Hand-authored article markup (no fetch, no snapshot)

When you want full control over article HTML (fixture-free demos, selectively copied sections, UX experiments that must not depend on network or committed Parsoid bundles):

1. **`ChromeWrapper`** → **`ArticleCustom`** (or **`ArticleWrapper`** → **`ArticleRenderer`** for full control).
2. Put all reader body markup in **`ArticleRenderer`’s default slot** — it lands inside **`.mw-parser-output`**, so vendored wiki skin CSS applies.
3. **Lead + infobox on mobile:** put hatnote and first lead paragraph **before** the infobox in source order (see **`src/prototypes/template-article-custom/`**). Live/snapshot Parsoid HTML uses the opposite order; **`ArticleRenderer`** reorders **`section[data-mw-section-id=&quot;0&quot;]`** at runtime — hand-authored markup has no equivalent hook, so author the desired visual order directly.
4. **Infoboxes:** match English Wikipedia’s **Infobox musical artist**-shaped table for familiar chrome: **`table.infobox.vcard.plainlist`**, **`th.infobox-above`** (title), **`td.infobox-image`** + **`div.infobox-caption`**, **`th.infobox-header`** (e.g. “Background information” and empty separator rows), **`th.infobox-label`** / **`td.infobox-data`** for fields. **Pale blue header bands** on enwiki come from **inline `style` on those cells** (`background-color: #b0c4de`, etc.) emitted by the infobox **template** — ProtoWiki’s ResourceLoader skin CSS does **not** ship **`Module:Infobox`** / per-template colours, so copy that markup from **Parsoid HTML** or a committed snapshot (e.g. **`public/snapshots/wet-leg.html`**) if you want parity. **`Module:Infobox/styles.css`** in live pages is mostly layout; do not expect class-only headers to pick up the blue without those template inlines.
5. **Lists inside infoboxes:** enwiki often uses **`plainlist`** + **`<ul>`**; Plainlist **TemplateStyles** are not bundled in **`src/styles/wiki-skins/`**, so unordered lists can show default bullets — use comma-separated links, **`<br>`**-separated lines, or co-locate minimal list reset CSS only if the prototype demands it.

**Canonical example:** **`src/prototypes/template-article-custom/`** (`Template: Article (custom)` on the gallery via `category: 'template'`) — Wet Leg lead + History authored in Vue, local infobox image via **`import.meta.env.BASE_URL`**.

**Attribution:** if prose is copied from Wikipedia, keep licences in mind ([CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/)) and cite the source in the prototype (the hand-written Wet Leg demo links the article).

See also [`composition-recipes.md`](composition-recipes.md#hand-authored-article-no-live-fetch-or-snapshot).

## `ArticleCustom`

**`ArticleWrapper`** + **`ArticleRenderer`**: hand-filled **`#default`** only — no network, no snapshot file.

### Example

```vue
<ArticleCustom>
  <p>Your <strong>markup</strong> lands inside <code>.mw-parser-output</code>.</p>
</ArticleCustom>
```

### Props (`ArticleCustom`)

Same chrome / i18n / theme surface as **`ArticleWrapper`** — **`title?`**, **`header?`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**, plus **`app?`** / **`description?`** / **`leadImageUrl?`** for a hand-authored in-app screen. There is no **`article`** prop (unlike **`ArticleLive`** / **`ArticleSnapshot`**).

### Slots

| Slot    | Notes                                                               |
| ------- | ------------------------------------------------------------------- |
| default | Parser body inside **`ArticleRenderer`** (**`.mw-parser-output`**). |

## `ArticleLive`

Live fetch via **`page/html`** (in-memory cache + **`localStorage`**). Single import for **`ChromeWrapper` → live reader** demos.

### Random mode (omit `article`)

**Leaving `article` off loads a random article on every mount** — there is no `random` boolean; absence of `article` _is_ random mode. Two extra props tune the draw (they only apply in random mode and are **type-gated** to the no-`article` case via the exported **`ArticleLiveProps`** union — passing them alongside `article` is a type error):

- **`source`**: **`'random'`** (default) draws a live random page via REST **`page/random/title`**; **`'vital'`** draws a Wikipedia **Vital article** (title list fetched once via the Action API and cached in memory + **`localStorage`**; falls back to the random pool when a language has no Vital list).
- **`langs`**: `string[]` (default **`['en']`**). One language is picked at random per mount; the wiki host is derived from it via **`wikiHostFromLang()`**.
- **`vitalLevel`**: `number` (default **`2`** ≈ 100 titles; **`3`** ≈ 1,000). Only used when **`source`** is **`'vital'`** — picks which `Wikipedia:Vital articles/Level/{n}` list to draw from.

The selection is memoized per **`source`** + **`langs`** + **`vitalLevel`**, so component remounts (and HMR while editing) reuse the same article; a hard page refresh re-selects.

Selection only resolves a **title** (a lightweight, title-only request for the random pool; a local pick from the cached list for vital); the article **body** still loads through the existing **`page/html`** fetch + cache.

### Example

```vue
<!-- Fixed article -->
<ArticleLive article="Albert Einstein" />
<ArticleLive article="Marie Curie" host="en.wikipedia.org" />
<ArticleLive article="Talk:Albert Einstein" />

<!-- Random article each load -->
<ArticleLive />
<ArticleLive source="vital" />
<ArticleLive source="vital" :vital-level="3" />
<ArticleLive :langs="['en', 'fr', 'es']" />

<!-- Random, in an app screen -->
<ArticleLive app />
```

### Props (`ArticleLive`)

**`host`** (**wiki hostname** for **`page/html`** and cache keys; default derived from **`lang`** via **`wikiHostFromLang()`**, so **`en.wikipedia.org`** unless you set **`lang`** — random mode derives it from the chosen `langs` instead), **`article`** (REST page title → **`ArticleWrapper`** **`title`**; **omit for random mode**), **`app?`** (in-app reading screen — see [In-app articles](#in-app-articles-app)), **`source?`** (**`'random'`** | **`'vital'`**, random mode only), **`langs?`** (**`string[]`**, random mode only), **`vitalLevel?`** (**`number`**, default **`2`**, `source="vital"` only), **`header`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**.

Emits **`parserReady`** with the rendered article root once the body is in the DOM (see [Putting your own components in the article](#putting-your-own-components-in-the-article)).

### Slots

| Slot    | Notes                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| default | Forwarded inside **`ArticleRenderer`** when passed — replaces the **`v-html`** wrapper **`ArticleLive`** / **`ArticleSnapshot`** emit for **`page/html`** / snapshot bundles. |

## In-app articles (`app`)

**`app`** turns any article surface into an in-app reading screen for **`AppChromeWrapper`** prototypes. Same one-document path as the web article components — app chrome around it instead of web chrome, no separate component.

| Concern | Notes                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Fetch   | REST **`page/html`** via **`fetchArticleBody()`** — the same fetch the web path uses                                                        |
| Chrome  | **`ArticleWrapper`** lead block: lead image, title, description. **`ArticleLive`** fills those from **`fetchArticleView()`** (Action API **`query`** + **`pageimages\|description`**); **`ArticleSnapshot`** / **`ArticleCustom`** take **`description`** / **`leadImageUrl`** as props |
| Render  | **`ArticleRenderer`** with **`app`**, which pins **`skin="mobile"`** inside **`.article[data-skin="mobile"]`**                              |
| Styling | Vendored Minerva snapshot + **`mobile-wiki-overrides.css`**, exactly as the web mobile skin                                                 |

The in-app reading behaviour itself lives in **`ArticleRenderer`**: static **`h2`** headings with an edit button, collapsed **References** / **External links** end matter behind a single divider, and **Quick facts** / **More information** table widgets (see **`ArticleRenderer`** above). **`ArticleWrapper`** adds the app's own lead block on top — lead image, title, description, then the short 60px rule closing it off.

**`app`** implies **`skin="mobile"`** on both the wrapper and the renderer, so you never pass **`skin`** in an app prototype.

[Random mode](#random-mode-omit-article) works the same in an app screen — omit **`article`** and the lead block (title, description, image) fills in once the random title resolves; **`template-app-article/`** does this when there is no **`?article=`**.

### Do not use REST `page/mobile-html` / PCS here

It was tried and reverted. PCS ships stylesheets rooted at **`html`** / **`body`** sized by **viewport** media queries, plus bare-element rules (**`h1`–`h6 { font: inherit }`**, **`ul { margin: 0 }`**, **`table { display: none }`**, **`body, html { height: unset !important }`**), so it only renders correctly in a document of its own. Inlining it leaks that CSS across all of ProtoWiki; putting it in an iframe fixes the rendering but puts the article beyond the reach of ProtoWiki CSS, Codex components and devtools.

Prototypes need to reach **into** the article, and the audience is designers and PMs. One document wins.

### Example

```vue
<AppChromeWrapper …>
  <ArticleLive app article="Baltimore" lang="en" />
</AppChromeWrapper>

<AppChromeWrapper …>
  <!-- Random article each load -->
  <ArticleLive app />
</AppChromeWrapper>
```

### Putting your own components in the article

**`parserReady`** hands out a plain element in the **same document**, so **`<Teleport>`** and any Codex component work with no plumbing — no stylesheet copying, no token scoping, and no components that misbehave.

```vue
<script setup>
const target = ref(null)
function onParserReady(root) {
  target.value = root.querySelector('#Etymology')?.closest('section')
}
</script>

<template>
  <ArticleLive app :article="article" @parser-ready="onParserReady" />
  <Teleport v-if="target" :to="target">
    <CdxCard>Your thing, in the article</CdxCard>
  </Teleport>
</template>
```

Reference: **`src/prototypes/template-app-article/`**.

## `ArticleSnapshot`

Loads **`public/snapshots/{slug}.html`** where **`slug`** comes from **`articleSnapshotSlug(article)`** (see **`src/components/article/shared/articleSnapshotSlug.ts`**). **`404`** shows **`CdxMessage`** pull instructions — no REST round-trip.

### Example

```vue
<ArticleSnapshot article="Wet Leg" />
```

### Props (`ArticleSnapshot`)

**`article`** (**required**) — **`articleSnapshotSlug(article)`** → **`public/snapshots/&lt;slug&gt;.html`**, and the same string seeds **`ArticleWrapper`** **`title`**. Same **`ArticleWrapper`** chrome passthroughs as **`ArticleLive`** except **`host`** and **`header`** (no title override prop on snapshots), plus **`app?`** / **`description?`** / **`leadImageUrl?`** for an in-app snapshot screen.

### Slots

Same as **`ArticleLive`**.

## `ArticleHeader`

Vector-like **page** chrome above the parser output (not the site **`ChromeHeader`**).

| Prop                  | Notes                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **`title`**           | Required display string (usually from **`ArticleWrapper`**).                                                                    |
| **`languagesCount?`** | Number for the interlanguage control label (default **18** → “18 languages”). Language rows in the popover are fixed mock data. |
| **`skin?`**           | Desktop vs mobile layout.                                                                                                       |

Fixed copy: desktop tagline **“From Wikipedia, the free encyclopedia”**; Article / Read tabs are visually active (not prop-driven). **`#title`** slot replaces the **`h1`** inner markup. Emits language pick / settings and tab/tool clicks.

## Styling notes

- **`ArticleHeader`** title uses **`--font-family-serif`**; tabs/actions use base UI tokens — **`mw-first-heading`** targets **`PlainWrapper`** (and hand-authored **`h1`** in demos / editors), not **`ArticleHeader`**’s **`article-header__title`** row.

- **`.mw-parser-output`** vendored CSS: **`src/styles/wiki-skins/`** — see **`wiki-snapshot-data`** / **`protowiki-snapshot-data`**.

## Tips

- Prefer **`<ArticleCustom>`** for hand-authored / fixture-free article body HTML (**`ChromeWrapper` → `ArticleCustom`**).
- Prefer **`<ArticleLive>`** inside **`ChromeWrapper`** for live read-mode demos.
- Prefer **`<ArticleLive app>`** inside **`AppChromeWrapper`** for in-app live articles — same **`page/html`** path, app chrome instead of web chrome.
- Prefer **`<ArticleSnapshot>`** for committed HTML snapshots.
- Compose **`ArticleWrapper`** + **`ArticleRenderer`** manually when **`ArticleLive`** / **`ArticleSnapshot`** / **`ArticleCustom`** are too opinionated — including **fully hand-authored** **`#default`** (see **Hand-authored article markup** above; reference **`src/prototypes/template-article-custom/`**).
- REST / CORS: **`/api/rest_v1/`** remains **`origin=*`**-friendly.
