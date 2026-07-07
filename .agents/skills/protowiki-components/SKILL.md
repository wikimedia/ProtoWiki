---
name: protowiki-components
description: Catalog of every shipped component in src/components/ — the three single-concern layout wrappers (ChromeWrapper, SpecialPageWrapper, PlainWrapper), the chrome primitives (ChromeHeader, ChromeFooter), Article surfaces (`ArticleWrapper` + `ArticleRenderer`, ArticleLive, ArticleSnapshot, ArticleCustom, ArticleHeader), dashboard layout (`Dashboard`, `DashboardModule`), and Search — including hand-authored article HTML in `ArticleRenderer`'s default slot (see `src/prototypes/template-article-custom/`) and newcomer homepage templates (`template-dashboard`, `template-homepage`). Use when picking a wrapper, composing a page, looking up props/slots/events for any ProtoWiki component, or asking "what components does ProtoWiki ship?".
license: MIT
---

# ProtoWiki components

ProtoWiki ships a small, deliberate set of components in `src/components/`.
They're all plain Vue 3 components — no registry, no special mounting, no
"prototype framework". Use them like any other Vue component.

This skill is the cross-cutting guide. Per-component depth lives in
`references/`:

- [`references/wrappers.md`](references/wrappers.md) — `ChromeWrapper`,
  `SpecialPageWrapper`, `PlainWrapper`, `MobileWrapper`
- [`references/chrome-primitives.md`](references/chrome-primitives.md) —
  `ChromeHeader`, `ChromeFooter`
- [`references/article.md`](references/article.md) — `ArticleWrapper`, `ArticleRenderer`,
  `ArticleLive`, `ArticleSnapshot`, `ArticleCustom`, `ArticleHeader`
- [`references/search.md`](references/search.md)
- [`references/editors.md`](references/editors.md) —
  Visual editor prototyping **outside** ProtoWiki (fork Bárbara Martínez Calvo’s article template + suggestion-mode repos)
- [`references/edit-suggestions.md`](references/edit-suggestions.md) —
  Edit Check-style suggestion stream alongside **your** editing surface (payload
  shape, side-by-side layout, `SuggestionCard`, publish interception)
- [`references/dashboard.md`](references/dashboard.md) — `Dashboard`, `DashboardModule`
- [`references/composition-recipes.md`](references/composition-recipes.md)

## The shape of the catalogue

| Component | Concern | Renders chrome? | Renders columns? |
| --- | --- | --- | --- |
| `ChromeWrapper` | Wikipedia chrome (header + footer) around a slot | Yes | No |
| `SpecialPageWrapper` | Special-page shell — title row + optional help/actions + content | No | No (full-width) |
| `PlainWrapper` | Centred narrow column — no chrome (gallery / Component-style demos) | No | No |
| `MobileWrapper` | Phone-frame preview — full width below 480px; centred column + neutral Codex gutters when clamped | No | No |
| `ChromeHeader` | Vector-style chrome when `skin=desktop`, Minerva-style when `skin=mobile` — wordmarks, search cluster, user tools (via ChromeWrapper) | n/a | n/a |
| `ChromeFooter` | Footer chrome (via ChromeWrapper): **desktop** Vector strip with optional mock last-edited + CC lines, or **mobile** Minerva well + optional strip | n/a | n/a |
| `ArticleWrapper` | Reader outer **`<article>`**: always **`ArticleHeader`** + **default slot** (**main column** — usually **`ArticleRenderer`**) — no **`v-html`** by itself | No | No |
| `ArticleRenderer` | Parser column (**`.article-content`**, **`.mw-parser-output`**, **`#default`** only); mobile **`section > h2`** on mobile skin — title chrome lives elsewhere | No | No |
| `ArticleLive` | **`ArticleWrapper`** + nested **`ArticleRenderer`** for REST **`page/html`** (+ cache); progress/errors in **default slot** before **`ArticleRenderer`**. **Omit `article` → random article each load** (**`source`** = `'random'` \| `'vital'`, **`langs`**) | No | No |
| `ArticleSnapshot` | **`ArticleWrapper`** + **`ArticleRenderer`** (omitted until snapshot load succeeds or **`#default`**) + **`public/snapshots/`** | No | No |
| `ArticleCustom` | **`ArticleWrapper`** + **`ArticleRenderer`**: **`#default`** is the parser body — no **`page/html`**, no snapshot file | No | No |
| `ArticleHeader` | Title row, tabs, read/edit/history, tools (**used inside **`ArticleWrapper`**) | No | No |
| `Search` | `CdxTypeaheadSearch` wired to opensearch (default in ChromeHeader) | n/a | n/a |
| `Dashboard` | Newcomer homepage grid — `#banner`, `#mobile`, `#primary`, `#sidebar` slots | No | Yes (desktop) |
| `DashboardModule` | Single module box — link card when `to` is set, static sidebar card otherwise | No | No |

## Defaults, props, and slots (shared contract)

Most regions follow the same pattern:

1. **Default** — sensible markup/CSS in the component.
2. **Prop** — tweak with the **same base name** as the paired slot where it fits (e.g. **`title`** / **`#title`**, **`help`** / **`#help`**). Boolean toggles such as **`actions`** stay plain nouns — no `show*` prefix.
3. **Named slot `#x`** — replaces the default **inner** content for that region; when the slot is supplied, it wins over the prop-fed default.

Examples: `title` / `#title` / `#header` (**`SpecialPageWrapper`** cluster), **`help`** (**`boolean`** or **`#help`**), **`actions`** (**`boolean`** or **`#actions`**), **`username`** / **`#username`**, `ChromeHeader` **`navTools`** vs **`#nav`**.

## The two ideas you need

### 1. Single concern, compose by nesting

Each layout shell does **one** thing. To get a full Wikipedia-shaped article
page, you nest:

```vue
<ChromeWrapper>
  <ArticleLive article="Albert Einstein" />
</ChromeWrapper>
```

Two lines, top-down: chrome → article surface. **`ArticleLive`** and **`ArticleSnapshot`** each compose **`ArticleWrapper`** with an **`ArticleRenderer`** in its default slot (plus fetch or snapshot UI). **`ArticleCustom`** is the same **`ArticleRenderer`** slot without fetching — use for hand-authored markup (**`src/prototypes/template-article-custom/`**).

### 2. Shared `skin` / `theme` on every themable component; `lang` / `dir` on layout shells + article surfaces

Every component in this list (`ChromeWrapper`,
`SpecialPageWrapper`, `PlainWrapper`, `ArticleWrapper`, `ArticleRenderer`,
`ArticleLive`, `ArticleSnapshot`, `ArticleCustom`, `Search`) accepts the same two theming props:

| Prop | Type | Effect |
| --- | --- | --- |
| `skin` | `'desktop' \| 'mobile'` | Sets `data-skin="…"` on the root, locally re-skinning the subtree |
| `theme` | `'light' \| 'dark'` | Sets `data-theme="…"` on the root, locally re-theming the subtree |

The **layout wrappers** (`ChromeWrapper`, `SpecialPageWrapper`,
`PlainWrapper`), **`ArticleWrapper`**, **`ArticleRenderer`**, **`ArticleLive`**, **`ArticleSnapshot`**, **`ArticleCustom`** accept:

| Prop | Type | Effect |
| --- | --- | --- |
| `lang` | `string` (BCP-47) | Sets `lang="…"` on the component root |
| `dir` | `'ltr' \| 'rtl'` | Sets `dir="…"` on the component root — pass it explicitly; ProtoWiki does not infer it from `lang` |

Usually you set `lang` / `dir` once on `ChromeWrapper` (or `<html>`); use **`ArticleWrapper`** /
**`ArticleRenderer`** / **`ArticleLive`** / **`ArticleCustom`** props when you need language or direction on the article subtree only. Chrome primitives inherit `lang` / `dir` through the DOM and do not repeat these props.

When `skin` / `theme` props are omitted, components resolve **effective**
skin/theme from the nearest `ChromeWrapper` (Vue provide/inject for **`ArticleLive`**
/ **`ArticleSnapshot`** / **`ArticleCustom`** / **`SpecialPageWrapper`**), then from global boot state on
`<html>`. Roots set `data-skin` / `data-theme` from that resolution so `[data-skin]` CSS stays aligned with nested previews.

See [`protowiki-skins`](../protowiki-skins/SKILL.md) and
[`protowiki-theme`](../protowiki-theme/SKILL.md) for the full theming
model.

## Imports

All components live at `@/components/<Name>.vue`:

```ts
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import ChromeFooter from '@/components/chrome/ChromeFooter.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import PlainWrapper from '@/components/PlainWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import ArticleWrapper from '@/components/article/ArticleWrapper.vue'
import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import ArticleLive from '@/components/article/ArticleLive.vue'
import ArticleSnapshot from '@/components/article/ArticleSnapshot.vue'
import ArticleCustom from '@/components/article/ArticleCustom.vue'
import ArticleHeader from '@/components/article/ArticleHeader.vue'
import Search from '@/components/Search.vue'
import Dashboard from '@/components/dashboard/Dashboard.vue'
import DashboardModule from '@/components/dashboard/DashboardModule.vue'
```

The `@/` prefix resolves to `src/`.

## Quick props/slots overview

| Component | Key props | Notable slots |
| --- | --- | --- |
| `ChromeWrapper` | `lang?`, `dir?`, `skin?`, `theme?`, **`lastEditedNotice?`**, **`username?`**, **`wordmarkSrc?`**, **`taglineSrc?`**, **`mobileWordmarkSrc?`**, **`navTools?`** (`ChromeNavTool[]`, forwarded to default header) | default, `#header`, `#footer` |
| `SpecialPageWrapper` | `title?`, **`help?`** (**`boolean`**), **`actions?`**, `lang?`, `dir?`, `skin?`, `theme?` | default, **`#header`**, **`#title`**, `#help`, `#actions` |
| `PlainWrapper` | `heading?`, `lang?`, `dir?` | default, `#heading` |
| `MobileWrapper` | `maxWidth?` (default `360px`), `lang?`, `dir?` | default |
| `ChromeHeader` | `skin?`, `theme?`, **`username?`**, **`wordmarkSrc?`**, **`taglineSrc?`**, **`mobileWordmarkSrc?`**, **`navTools?`** | `#logo`, `#username`, `#nav` |
| `ChromeFooter` | `skin?`, `theme?`, **`lastEditedNotice?`**, **`username?`** | default |
| `ArticleWrapper` | **`title?`**, **`header?`**, **`languagesCount?`**, **`lang`**, **`dir`**, **`skin`**, **`theme`** | **default** |
| `ArticleRenderer` | **`lang`/`dir`/`skin`/`theme`** | **default** — parser subtree ( **`ArticleLive`** / **`ArticleSnapshot`** use **`v-html`** here unless **`#default`** is forwarded ) |
| `ArticleLive` | Same **`ArticleWrapper`** chrome **`+`** **`article`** (**`page/html`** title; **omit for random**) **`+`** **`host`** **`+`** random-mode **`source?`** (`'random'`\|`'vital'`) / **`langs?`** / **`vitalLevel?`** (`source="vital"`) | **default** → **`ArticleRenderer`** (**`ArticleLive`** injects **`Cdx`** progress/errors before **`ArticleRenderer`**) |
| `ArticleSnapshot` | **`article`** (snapshot key **`+`** **`ArticleWrapper`** **`title`**) **`+`** chrome passthroughs (**no **`host`** / **`header`**) | **default** → **`ArticleRenderer`** (**`ArticleSnapshot`** injects **`Cdx`** UI before **`ArticleRenderer`**) |
| `ArticleCustom` | Same **`ArticleWrapper`** chrome keys as manual composition (**`title`**, **`header`**, …) — **no `article` / `host`** | **default** → **`ArticleRenderer`** (your **`#default`** is the parser subtree) |
| `ArticleHeader` | **`title`** (required), **`languagesCount?`** (default 18), **`skin?`** | **`#title`**, emits (`languageSelect`, `languageSettingsClick`, tab/action clicks) |
| `Search` | `host?`, `placeholder?`, `limit?`, `skin?`, `theme?` | none |
| `Dashboard` | (none) | `#banner`, `#mobile`, `#primary`, `#sidebar` |
| `DashboardModule` | `title?`, `to?`, `cta?`, `subtle?` | default, `#cta` |

## When to reach beyond this list

If you need a UI primitive (button, form field, dialog, toast, table,
checkbox, tabs, etc.), use a Codex component directly — see
[`codex-components`](../codex-components/SKILL.md). Don't add a new wrapper
for one prototype's needs; put the bespoke layout inside that prototype's
folder.
