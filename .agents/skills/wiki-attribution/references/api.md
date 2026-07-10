# Attribution API and alternative pathways

Technical implementation reference. Live docs: [framework technical page](https://wikimedia-attribution.toolforge.org/technical-implementation.html), [MediaWiki.org Attribution API](https://www.mediawiki.org/wiki/Attribution_API).

## Attribution API (beta, recommended)

MediaWiki **Core REST** — not `/api/rest_v1/`:

```
GET https://{host}/w/rest.php/attribution/v0-beta/pages/{title}/signals
```

### Parameters

| Param | Values | Effect |
| --- | --- | --- |
| `{host}` | e.g. `en.wikipedia.org`, `commons.wikimedia.org` | Project wiki |
| `{title}` | URL-encoded page title | Article or `File:…` media page |
| `expand` | Comma-separated | Optional blocks to include |

### Expand values

| Value | Response block | Notes |
| --- | --- | --- |
| `trust_and_relevance` | `trust_and_relevance` object | Page views, references, trending, last update, contributor_counts (null) |
| `calls_to_action` | `calls_to_action` object | Static participation + donation CTAs |

**Do not use** `ecosystem_growth` — stale name in some framework docs; returns nothing.

Default essential block is always included.

### Example response (abbreviated)

```json
{
  "essential": {
    "title": "Aurora",
    "link": "https://en.wikipedia.org/w/index.php?title=Aurora&wprov=afsw1",
    "license": { "title": "CC BY-SA 4.0", "url": "https://creativecommons.org/licenses/by-sa/4.0/deed.en" },
    "default_brand_marks": [{ "name": "Default logo", "url": "…", "type": "logo" }],
    "source_wiki": { "site_name": "English Wikipedia", "site_id": "enwiki", "site_language": "en" }
  },
  "trust_and_relevance": {
    "last_updated": "2026-07-09T06:50:10Z",
    "contributor_counts": null,
    "page_views": 40822,
    "reference_count": 130,
    "trending": {
      "top": { "read": false, "edited": false, "read_and_edited": false },
      "relative": { "read": false, "edited": false, "read_and_edited": false }
    }
  },
  "calls_to_action": {
    "participation_ctas": {
      "learn_more": { "url": "…", "link_text": "Learn more about Wikipedia", "description": "…" }
    },
    "donation_ctas": {
      "default": { "url": "…", "link_text": "Donate to Wikipedia", "description": "…" }
    }
  }
}
```

Commons media adds `essential.credit` (author name).

### Errors

Missing page → HTTP 404:

```json
{
  "errorKey": "rest-nonexistent-title",
  "messageTranslations": { "en": "The specified page (…) does not exist" },
  "httpCode": 404,
  "httpReason": "Not Found"
}
```

### CORS and browser fetch

`access-control-allow-origin: *` — callable directly from browser JavaScript. Use `Api-User-Agent` header (browsers block setting `User-Agent`).

### Beta known issues (MediaWiki.org)

| Issue | Status |
| --- | --- |
| `contributor_counts` returns null | Pending ~July 2026 |
| `trending.relative` hardcoded false | Pending ~Sept 2026 |
| CTAs are static/hard-coded | Pending |
| License name inconsistency | In progress |
| Remote media (Commons embeds in articles) | Pending |

## Contributor count backfill

While `contributor_counts` is null:

```
GET https://{host}/w/rest.php/v1/page/{title}/history/counts/editors
→ { "count": 3327, "limit": false }
```

CORS `*`. One call vs paginating Action API `prop=contributors`.

## Alternative pathways

| Signal | Attribution API | Enterprise | Action API | REST API | Analytics |
| --- | --- | --- | --- | --- | --- |
| Source | yes | yes | yes | — | — |
| Credit | yes | — | yes | — | — |
| Link | yes | yes | yes | — | — |
| Title | yes | yes | yes | yes | — |
| License | yes | yes | yes | yes | — |
| Brand mark | yes | — | yes | — | — |
| Reference count | yes | partial | parse HTML | partial | — |
| Contributor count | null (soon) | — | yes | yes (editors count) | — |
| Page views | yes | — | — | — | yes |
| Trending | yes (top only) | — | — | — | yes |
| Last update | yes | yes | yes | yes | — |
| Participation CTA | yes (static) | — | — | — | — |

## Etiquette

- **`Api-User-Agent`**: `ProductName/1.0 (https://your-site.example; contact@example.org)`
- Debounce and cache; respect `Retry-After` on 429
- Limit concurrent requests to ~3
- Do not poll faster than once per second per endpoint

See [`wiki-apis/references/etiquette.md`](../../wiki-apis/references/etiquette.md).

## Sandbox

REST API sandbox on any wiki: [English Wikipedia sandbox](https://www.mediawiki.org/w/index.php?title=Special:RestSandbox&api=attribution.v0-beta)
