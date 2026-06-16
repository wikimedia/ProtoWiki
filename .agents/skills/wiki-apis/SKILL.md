---
name: wiki-apis
description: How to fetch live data from MediaWiki and Wikipedia — the two API surfaces (REST API for read-mostly endpoints, Action API for everything else), which to choose when, and the etiquette every consumer must follow (User-Agent, rate limits, anonymous vs authenticated, exponential backoff). Use when adding live Wikimedia data to a frontend, picking between REST and Action API, or debugging a 4xx / rate-limited response.
license: MIT
---

# Wiki APIs

Wikipedia and the broader Wikimedia ecosystem expose two HTTP surfaces:

- **REST API** (`/api/rest_v1/…`) — clean, versioned, read-mostly. Great
  for "give me page HTML / summary / media list".
- **Action API** (`/w/api.php`) — older, action-based, can do everything
  including writes. Used for search, querying, parsing, login, and edit.

Use whichever expresses your need more cleanly. If both can do it, REST
usually wins on shape and caching.

## Picking the right surface

| You want | Surface | Endpoint |
| --- | --- | --- |
| Page HTML | REST | `/api/rest_v1/page/html/{title}` |
| Page summary (lead extract + thumbnail) | REST | `/api/rest_v1/page/summary/{title}` |
| Media in a page | REST | `/api/rest_v1/page/media-list/{title}` |
| Related articles | REST | `/api/rest_v1/page/related/{title}` |
| Page revision history | REST | `/api/rest_v1/page/history/{title}` |
| Random page | REST | `/api/rest_v1/page/random/summary` |
| Featured / On-this-day | REST | `/api/rest_v1/feed/featured/{date}` |
| Pageviews | REST (Wikimedia metrics) | `https://wikimedia.org/api/rest_v1/metrics/pageviews/…` |
| Typeahead search | Action | `?action=opensearch&search=…` |
| Faceted query (categories, links, etc.) | Action | `?action=query&prop=…` |
| Rendered wikitext | Action | `?action=parse` |
| Login, edit, watch | Action | `?action=login` / `edit` / `watch` |

Detailed call shapes:

- [`references/rest.md`](references/rest.md) — Wikimedia REST (`/api/rest_v1/`).
  Same wiki hosts also serve **MediaWiki Core REST** under `/w/rest.php/` (different
  routes and OpenAPI); see that page’s intro so you don’t confuse the two stacks.
- [`references/action.md`](references/action.md)
- [`references/schemas.md`](references/schemas.md) — pulling and storing
  the live API schemas (REST OpenAPI spec + Action API `paraminfo`) so
  agents and humans can look up endpoints offline.
- [`references/etiquette.md`](references/etiquette.md) — non-optional
  reading.
- [`references/protowiki-integration.md`](references/protowiki-integration.md)
  — how this skill plugs into the ProtoWiki repo specifically (which
  components already wrap which endpoints, where the snapshot script
  lives, etc.).

## URL conventions

```
https://en.wikipedia.org/api/rest_v1/page/html/Albert_Einstein
https://en.wikipedia.org/w/api.php?action=opensearch&search=alb&format=json&origin=*
```

For non-English wikis, swap the host:

```
https://de.wikipedia.org/api/rest_v1/page/summary/Albert_Einstein
https://fr.wikipedia.org/w/api.php?action=opensearch&search=alb&origin=*
```

For sister projects:

```
https://en.wiktionary.org/api/rest_v1/...
https://commons.wikimedia.org/w/api.php?...
```

The host already encodes the language, so a wrapping component
typically only needs a `host` prop, not a separate `lang`.

## CORS

Most public endpoints support CORS for browser fetches. For Action API
calls, append `&origin=*` to opt into the public CORS handler:

```ts
fetch('https://en.wikipedia.org/w/api.php?action=opensearch&search=alb&format=json&origin=*')
```

REST API endpoints don't need `origin=*`.

## Authentication

Prefer anonymous reads of public data. **Don't ship credentials in
client-side code.** If you genuinely need authenticated reads or
writes, that's a sign the work should be a server-rendered app, not a
static SPA.

For short-lived demos that absolutely need a login, use OAuth 2 via
MediaWiki's OAuth extension and proxy the token exchange through a
trusted backend. Don't put a username/password in env vars or
`localStorage`.

## Etiquette — must read

The Wikimedia Foundation publishes a [public API
policy](https://meta.wikimedia.org/wiki/User-Agent_policy). Summarised:

- **Send a descriptive `User-Agent`** identifying your project + a
  contact (e.g., `MyProject/0.1 (https://example.org/myproject; <email>)`).
  Browsers send their own UA, but if you proxy a request server-side,
  set this. **Anonymous, generic UAs may be rate-limited or blocked.**
- **Cache aggressively.** REST API responses include strong `ETag`
  headers; Action API responses are CDN-cached at the edge. Don't poll
  faster than once per second per endpoint.
- **Use exponential backoff** on 429 (Too Many Requests) and 5xx errors.
- **Use the read-only endpoints unless you mean to write.** Don't `edit`
  unless your work is genuinely about editing.
- **Don't load on every keystroke.** Debounce typeahead requests; use
  `AbortController` to cancel superseded requests.

See [`references/etiquette.md`](references/etiquette.md) for the full
checklist.

## Examples

### Fetching article HTML

```ts
const res = await fetch(
  `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent('Albert_Einstein')}`,
)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const html = await res.text()
```

### Typeahead search

```ts
const url = new URL('https://en.wikipedia.org/w/api.php')
url.searchParams.set('action', 'opensearch')
url.searchParams.set('search', query)
url.searchParams.set('limit', '10')
url.searchParams.set('format', 'json')
url.searchParams.set('origin', '*')

const res = await fetch(url, { signal: abort.signal })
const [, titles, descriptions, links] = await res.json()
```

### Pageviews

```ts
const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent('Albert_Einstein')}/daily/2024010100/2024013100`
```

### Related articles

```ts
fetch(
  `https://en.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(title)}`,
)
```

## Looking up endpoints offline

Both APIs publish machine-readable schemas:

- The REST API serves an OpenAPI 2 (Swagger) spec at
  `https://<wiki-host>/api/rest_v1/?spec` — **each deployment has its
  own document** (article wikis, `wikimedia.org`, Commons, Wikidata,
  …). The skill commits a small set of those JSON files side by side.
- The Action API serves module metadata via
  `?action=paraminfo&modules=*&format=json`, plus
  `?action=help&recursivesubmodules=1` for the full prose docs.

This skill ships a small snapshotter (`assets/fetch_schemas.sh`) that
writes **several REST OpenAPI files** plus Action `paraminfo` into
`assets/snapshots/` so an agent or human can read endpoint shapes
without hitting the network. The committed snapshots serve as a
reproducibility anchor — re-run the script when the upstream schemas
change.

```bash
bash .agents/skills/wiki-apis/assets/fetch_schemas.sh
ls .agents/skills/wiki-apis/assets/snapshots/
# rest-api-spec.wikipedia.json   rest-api-spec.wikimedia-org.json
# rest-api-spec.commons.json     rest-api-spec.wikidata.json
# action-api-paraminfo.json
```

See [`references/schemas.md`](references/schemas.md) for the layout, the
format of each file, and how to navigate them.

## See also

- [`wiki-signals`](../wiki-signals/SKILL.md) — *what* data is available
  (catalog of signals).
- [`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md) — when to
  snapshot data ahead of time vs fetch live.

## Inside ProtoWiki

`ArticleLive` calls REST **`page/html/{title}`**; **`Search`** wraps Action **`opensearch`**
(with debouncing and **`AbortController`** cancellation). **`ArticleSnapshot`** loads **`public/snapshots/`**
HTML only (no **`page/html`** hit). Typical usage already covers UA etiquette and sane defaults.

The committed schema snapshots live under
`.agents/skills/wiki-apis/assets/snapshots/` and are refreshed via
`fetch_schemas.sh`. See
[`references/protowiki-integration.md`](references/protowiki-integration.md)
for the repo-specific UA, component pointers, and mock-publish guidance.
