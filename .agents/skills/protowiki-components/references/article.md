# Article surface — `ArticleWrapper`, `ArticleRenderer`, `ArticleLive`, `ArticleSnapshot`, `ArticleCustom`, `ArticleHeader`

## Composition model

- **`ArticleWrapper`** — reader layout shell **only**: outer semantic **`<article>`**, always **`ArticleHeader`**, **default slot** for the reader column (**`ArticleLive`** / **`ArticleSnapshot`** put progress/errors **first**, then **`ArticleRenderer`** — typically **`ArticleRenderer`**).

- **`ArticleRenderer`** — parser column (**`.article-content`** shell): **`#default`** is the sole parser subtree (wraps **`<slot />`** in **`.mw-parser-output`** + inner **`:key="effectiveSkin"`** remount for Minerva accordion DOM). Caller supplies authored markup or **`v-html`** wrappers in the slot. Mobile **`section > h2`** affordances apply whenever **`effectiveSkin`** is **`mobile`**. Skin-scoped RL CSS. Title chrome is **`ArticleHeader`** only (not **`ArticleRenderer`**).

- **`ArticleLive`** — **`ArticleWrapper`** + inline progress/error (**`CdxProgressBar`** / **`CdxMessage`**) **`+`** **`ArticleRenderer`**: **`ArticleRenderer`** mounts when **`liveHtml !== null`** or the consumer overrides **`#default`**; fetched body renders as default slot **`v-html`** unless **`#default`** is passed through.

- **`ArticleSnapshot`** — same gate (**`snapshotHtml !== null`** or **`#default`**) with snapshot load / error **`Cdx`** UI before **`ArticleRenderer`**.

- **`ArticleCustom`** — **`ArticleWrapper`** + **`ArticleRenderer`** with **no fetch**: you supply **`.mw-parser-output`** contents in **`#default`**. Same chrome passthroughs as **`ArticleWrapper`** (**`title`**, **`header`**, **`languagesCount`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**) — use when hand-authored markup is easier than **`page/html`** or a snapshot file.

**`ArticleLive`**, **`ArticleSnapshot`**, and **`ArticleCustom`** are independent — none imports the others; **`ArticleLive`** and **`ArticleSnapshot`** each compose **`ArticleWrapper`** and **`ArticleRenderer`** with loading UI; **`ArticleCustom`** is the thin **`ArticleWrapper` → `ArticleRenderer`** shell.

For a **standalone parser embed** without **`ArticleHeader`** (advanced), nest **`ChromeWrapper`** (or **`PlainWrapper`**) + **`ArticleRenderer`**.

When any of these roots sit inside **`ChromeWrapper`**, they **inherit** effective **`skin`** / **`theme`** via Vue inject (same pattern as **`SpecialPageWrapper`**).

## Article title wiring

- **`ArticleWrapper`** uses **`title?`** (+ **`header?`**, optional **`languagesCount?`**): **`ArticleHeader`** shows **`header`** trimmed if set; otherwise underscores in **`title`** become spaces (default **`title`** is **`'Article'`**).

- **`ArticleLive.article`** selects the **`page/html/{title}`** page and forwards the same string to **`ArticleWrapper`** as **`title`** (optional **`header`** overrides **`ArticleHeader`**).

- **`ArticleSnapshot.article`** picks **`public/snapshots/&lt;slug&gt;.html`** via **`articleSnapshotSlug`** and is forwarded to **`ArticleWrapper`** **`title`** (**`ArticleHeader`** label — underscores → spaces the same as **`ArticleLive`**).

- **`header`** (**`ArticleLive`** on **`ArticleWrapper`**, and **`ArticleCustom`**) overrides the derived chrome title; **`ArticleRenderer`** does **not** consume **`title`** or **`header`**.

## `ArticleWrapper`

| Concern | Notes |
| --- | --- |
| Chrome props | **`title?`**, **`header`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**, … |
| Slots | **default** (**main reader column** — **`ArticleRenderer`** or bespoke markup) |

## `ArticleRenderer`

| Concern | Notes |
| --- | --- |
| Props | **`lang`/`dir`/`skin`/`theme`** (no parser string prop — use **`#default`**) |
| Slots | **`#default`** — contents appear inside **`.mw-parser-output`**; omit **`ArticleRenderer`** when there is nothing to render ( **`ArticleLive`** / **`ArticleSnapshot`** gate mounting). |

Companion CSS (**`mobile-wiki-overrides.css`**, **`ArticleRenderer.vue`** unscoped block: wide tables, mobile infobox / lead order, hatnotes) keys off **`.article[data-skin] .mw-parser-output`**, so **`ArticleWrapper`** + bare **`div.mw-parser-output`** behaves like **`ArticleRenderer`** for those rules (the **`.article-content`** wrapper still adds its own padding / **`min-width: 0`**). Prefer **`ArticleRenderer`** for **`ArticleLive`**, **`ArticleSnapshot`**, **`page/html`**, snapshots, and mobile **`innerHTML`** **`section > h2`** affordances. Fetched **`page/html`** emits **`section[data-mw-section-id=&quot;0&quot;]`** for lead/infobox order on mobile — hand-authored prototypes use **`class=&quot;hand-authored-lead&quot;`** on the wrapping **`section`** instead (**`src/prototypes/template-article-custom/`**).

### Hand-authored article markup (no fetch, no snapshot)

When you want full control over article HTML (fixture-free demos, selectively copied sections, UX experiments that must not depend on network or committed Parsoid bundles):

1. **`ChromeWrapper`** → **`ArticleCustom`** (or **`ArticleWrapper`** → **`ArticleRenderer`** for full control).
2. Put all reader body markup in **`ArticleRenderer`’s default slot** — it lands inside **`.mw-parser-output`**, so vendored wiki skin CSS applies.
3. **Lead + infobox on mobile:** wrap the lead block (infobox table + hatnote + first paragraphs) in **`<section class="hand-authored-lead">`**. That opts into the same flex **`order`** rules as **`section[data-mw-section-id=&quot;0&quot;]`** so the lead prose stacks above the infobox in the Minerva column (see **`ArticleRenderer.vue`**).
4. **Infoboxes:** match English Wikipedia’s **Infobox musical artist**-shaped table for familiar chrome: **`table.infobox.vcard.plainlist`**, **`th.infobox-above`** (title), **`td.infobox-image`** + **`div.infobox-caption`**, **`th.infobox-header`** (e.g. “Background information” and empty separator rows), **`th.infobox-label`** / **`td.infobox-data`** for fields. **Pale blue header bands** on enwiki come from **inline `style` on those cells** (`background-color: #b0c4de`, etc.) emitted by the infobox **template** — ProtoWiki’s ResourceLoader skin CSS does **not** ship **`Module:Infobox`** / per-template colours, so copy that markup from **Parsoid HTML** or a committed snapshot (e.g. **`public/snapshots/wet-leg.html`**) if you want parity. **`Module:Infobox/styles.css`** in live pages is mostly layout; do not expect class-only headers to pick up the blue without those template inlines.
5. **Lists inside infoboxes:** enwiki often uses **`plainlist`** + **`<ul>`**; Plainlist **TemplateStyles** are not bundled in **`src/styles/wiki-skins/`**, so unordered lists can show default bullets — use comma-separated links, **`<br>`**-separated lines, or co-locate minimal list reset CSS only if the prototype demands it.

**Canonical example:** **`src/prototypes/template-article-custom/`** (`Template: Article (custom)` in the gallery) — Wet Leg lead + History authored in Vue, local infobox image via **`import.meta.env.BASE_URL`**.

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

Same chrome / i18n / theme surface as **`ArticleWrapper`** — **`title?`**, **`header?`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**. There is no **`article`** prop (unlike **`ArticleLive`** / **`ArticleSnapshot`**).

### Slots

| Slot | Notes |
| --- | --- |
| default | Parser body inside **`ArticleRenderer`** (**`.mw-parser-output`**). |

## `ArticleLive`

Live fetch via **`page/html`** (in-memory cache + **`localStorage`**). Single import for **`ChromeWrapper` → live reader** demos.

### Example

```vue
<ArticleLive article="Albert Einstein" />
<ArticleLive article="Marie Curie" host="en.wikipedia.org" />
<ArticleLive article="Talk:Albert Einstein" />
```

### Props (`ArticleLive`)

**`host`** (**wiki hostname** for **`page/html`** and cache keys; default **`en.wikipedia.org`**), **`article`** (REST page title → **`ArticleWrapper`** **`title`**), **`header`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`**.

### Slots

| Slot | Notes |
| --- | --- |
| default | Forwarded inside **`ArticleRenderer`** when passed — replaces the **`v-html`** wrapper **`ArticleLive`** / **`ArticleSnapshot`** emit for **`page/html`** / snapshot bundles. |

## `ArticleSnapshot`

Loads **`public/snapshots/{slug}.html`** where **`slug`** comes from **`articleSnapshotSlug(article)`** (see **`src/components/article/shared/articleSnapshotSlug.ts`**). **`404`** shows **`CdxMessage`** pull instructions — no REST round-trip.

### Example

```vue
<ArticleSnapshot article="Wet Leg" />
```


### Props (`ArticleSnapshot`)

**`article`** (**required**) — **`articleSnapshotSlug(article)`** → **`public/snapshots/&lt;slug&gt;.html`**, and the same string seeds **`ArticleWrapper`** **`title`**. Same **`ArticleWrapper`** chrome passthroughs as **`ArticleLive`** except **`host`** and **`ArticleLive`'s **`header`** (no title override prop on snapshots).

### Slots

Same as **`ArticleLive`**.

## `ArticleHeader`

Vector-like **page** chrome above the parser output (not the site **`ChromeHeader`**).

| Prop | Notes |
| --- | --- |
| **`title`** | Required display string (usually from **`ArticleWrapper`**). |
| **`languagesCount?`** | Number for the interlanguage control label (default **18** → “18 languages”). Language rows in the popover are fixed mock data. |
| **`skin?`** | Desktop vs mobile layout. |

Fixed copy: desktop tagline **“From Wikipedia, the free encyclopedia”**; Article / Read tabs are visually active (not prop-driven). **`#title`** slot replaces the **`h1`** inner markup. Emits language pick / settings and tab/tool clicks.

## Styling notes

- **`ArticleHeader`** title uses **`--font-family-serif`**; tabs/actions use base UI tokens — **`mw-first-heading`** targets **`PlainWrapper`** (and hand-authored **`h1`** in demos / editors), not **`ArticleHeader`**’s **`article-header__title`** row.

- **`.mw-parser-output`** vendored CSS: **`src/styles/wiki-skins/`** — see **`wiki-snapshot-data`** / **`protowiki-snapshot-data`**.

## Tips

- Prefer **`<ArticleCustom>`** for hand-authored / fixture-free article body HTML (**`ChromeWrapper` → `ArticleCustom`**).
- Prefer **`<ArticleLive>`** inside **`ChromeWrapper`** for live read-mode demos.
- Prefer **`<ArticleSnapshot>`** for committed HTML snapshots.
- Compose **`ArticleWrapper`** + **`ArticleRenderer`** manually when **`ArticleLive`** / **`ArticleSnapshot`** / **`ArticleCustom`** are too opinionated — including **fully hand-authored** **`#default`** (see **Hand-authored article markup** above; reference **`src/prototypes/template-article-custom/`**).
- REST / CORS: **`/api/rest_v1/`** remains **`origin=*`**-friendly.
