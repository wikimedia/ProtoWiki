# `Search`

Wikipedia typeahead search — `CdxTypeaheadSearch` wired to the MediaWiki
**opensearch** Action API. Default search component used by **`VectorChromeHeader`**.

## Usage

```vue
<Search @select="onSelect" @submit="onSubmit" />
```

```ts
import type { SearchSubmitPayload } from '@/components/Search.vue'

function onSelect(title: string) {
  // Load the article in your prototype — do not navigate off-site.
}

function onSubmit({ query, title }: SearchSubmitPayload) {
  // `title` is the first typeahead suggestion when results are shown.
  if (title) {
    // Load `title` in your prototype.
  }
}
```

Inside **`ChromeWrapper`**, prototypes can opt in without forking the header:

```ts
import { provideChromeSearchHandlers } from '@/composables/useChromeSearch'

provideChromeSearchHandlers({
  onSelect(title) { /* … */ },
  onSubmit({ title }) { if (title) { /* … */ } },
})
```

The same handlers drive search at every breakpoint — the Vector inline box
(and its folded icon below 1120px) and Minerva's full-screen
**`MobileSearchOverlay`** below 640px.

**Reference:** **`src/prototypes/template-article-live/`** loads the picked title
into **`ArticleLive`**.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `host` | `string` | `'en.wikipedia.org'` | Wiki host the opensearch hits — also picks the language |
| `placeholder` | `string` | `'Search Wikipedia'` | Input placeholder + a11y label |
| `limit` | `number` | `10` | Max suggestions returned |
| `useButton` | `boolean` | `false` | Integrated submit button (Vector inline search) |
| `autoExpandWidth` | `boolean` | `false` | Widen input on focus when thumbnails are shown |
| `skin` | `'desktop' \| 'mobile'` | `undefined` | |
| `theme` | `'light' \| 'dark'` | `undefined` | |

`lang` / `dir` are inherited from the surrounding wrapper.

## Events

| Event | Payload | Fired when |
| --- | --- | --- |
| `select` | `string` (title) | User clicks / picks a suggestion |
| `submit` | `{ query: string; title?: string }` | User presses Enter or clicks the search icon without a highlighted result; `title` is the first suggestion when the typeahead list is populated |

## Behaviour

- Each keystroke abort-cancels the previous request via `AbortController`,
  so fast typing doesn't pile up.
- Suggestions render with title, description (when present), and thumbnail.
- **No off-wiki navigation by default.** Suggestions omit result URLs, the
  Special:Search footer is hidden, and the form action is inert — interaction
  only emits `select` / `submit`. Prototypes wire those events (or
  **`provideChromeSearchHandlers`**) to stay in the prototype.
- Native form submit is prevented so Enter never leaves the page.
- A pick (or Enter that resolves to a title) clears the field and its
  suggestions, as production does when the new page loads.

## Inside `VectorChromeHeader`

Desktop Vector chrome always mounts **`<Search />`** in the inline search cluster (no `#search` slot). Most prototypes never import **`Search`** — they use **`ChromeWrapper`**, which renders the default **`ChromeHeader`**.

The chrome user link is **`ChromeHeader`'s **`username`** prop (**`ChromeWrapper`** forwards the same prop when you use the default header). **`username=""`** hides that link.

Below **1120px** the inline box folds into a search icon; clicking it shows
the box in place of the menu and wordmark (the user tools stay), ending where the icon was and filling the space to its left, and focuses it. Escape, or focus leaving
the box, folds it back.

## Inside `MinervaChromeHeader` — `MobileSearchOverlay`

On the mobile skin, the default **Search** button opens
**`src/components/search/MobileSearchOverlay.vue`**: a full-screen field over
title suggestions from REST `search/title` (**`titleSearch.ts`**, rows in
**`TitleSearchResults.vue`**). It uses the same
**`provideChromeSearchHandlers`** as desktop:

- Plain click on a row → `onSelect(title)`, then the overlay closes.
- Enter → `onSubmit({ query, title })` with the first suggestion; closes when
  there was one.
- Back arrow / Escape closes. The page underneath doesn't scroll while open.
- Rows are real links to the wiki, so a modified click (⌘/Ctrl/middle) opens
  a new tab. A plain click never leaves the prototype.

A prototype passing its own Minerva **`right`** items drops the default
button, and the overlay with it.

For a different search surface, replace **`ChromeWrapper`'s `#header`** with a custom **`ChromeHeader`** (fork the template) or your own header markup.

## Etiquette

- The opensearch endpoint accepts `origin=*` and works from the browser
  without CORS preflight.
- Set `host` to a localized wiki to drive search there (`fr.wikipedia.org`,
  `commons.wikimedia.org`, etc.).
- See [`wiki-apis/references/etiquette.md`](../../wiki-apis/references/etiquette.md)
  for the WMF policy on User-Agent and rate-limits when extending this
  beyond opensearch.
