# `Search`

Wikipedia typeahead search — `CdxTypeaheadSearch` wired to the MediaWiki
**opensearch** Action API. Default search component used by `ChromeHeader`.

## Usage

```vue
<Search @select="onSelect" @submit="onSubmit" />
```

```ts
function onSelect(title: string) {
  router.push(`/article/${encodeURIComponent(title)}`)
}

function onSubmit(query: string) {
  router.push({ path: '/search', query: { q: query } })
}
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `host` | `string` | `'en.wikipedia.org'` | Wiki host the opensearch hits — also picks the language |
| `placeholder` | `string` | `'Search Wikipedia'` | Input placeholder + a11y label |
| `limit` | `number` | `10` | Max suggestions returned |
| `skin` | `'desktop' \| 'mobile'` | `undefined` | |
| `theme` | `'light' \| 'dark'` | `undefined` | |

`lang` / `dir` are inherited from the surrounding wrapper.

## Events

| Event | Payload | Fired when |
| --- | --- | --- |
| `select` | `string` (title) | User clicks / picks a suggestion |
| `submit` | `string` (query) | User presses Enter or clicks the search icon |

## Behaviour

- Each keystroke abort-cancels the previous request via `AbortController`,
  so fast typing doesn't pile up.
- Suggestions render with title + (when present) short description.
- The "Search Wikipedia for pages containing **&lt;query&gt;**" footer goes
  to `Special:Search` on the configured host.
- The form action posts to the same wiki's `/w/index.php` so the user can
  fall back to a real Wikipedia search by hitting Enter when offline-
  rendering this prototype.

## Inside `ChromeHeader`

Desktop Vector chrome always mounts **`<Search />`** in the inline search cluster (no `#search` slot). Most prototypes never import **`Search`** — they use **`ChromeWrapper`**, which renders the default **`ChromeHeader`**.

The chrome user link (**`chrome-header__username-link` → Meta**) is **`ChromeHeader`’s **`username`** prop (**`ChromeWrapper`** forwards the same prop when you use the default header). **`username=""`** hides that link.

For a different search surface, replace **`ChromeWrapper`'s `#header`** with a custom **`ChromeHeader`** (fork the template) or your own header markup.

## Etiquette

- The opensearch endpoint accepts `origin=*` and works from the browser
  without CORS preflight.
- Set `host` to a localized wiki to drive search there (`fr.wikipedia.org`,
  `commons.wikimedia.org`, etc.).
- See [`wiki-apis/references/etiquette.md`](../../wiki-apis/references/etiquette.md)
  for the WMF policy on User-Agent and rate-limits when extending this
  beyond opensearch.
