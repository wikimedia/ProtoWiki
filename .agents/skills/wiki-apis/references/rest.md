# REST API reference

Base URL: `https://{lang}.wikipedia.org/api/rest_v1/`. The paths below are
read-only (plus CDN-friendly caching) on article wikis and are CORS-enabled for
browser use.

Canonical docs: <https://en.wikipedia.org/api/rest_v1/>.

## Wikimedia REST API vs MediaWiki Core REST API

Production wikis expose **two different REST HTTP stacks**. This page documents
the **Wikimedia REST API** (`/api/rest_v1/`), which ProtoWiki components use for
article HTML, summaries, feeds, etc.

The other stack is **MediaWiki Core REST API**, routed under **`/w/rest.php/`**
(e.g. `https://en.wikipedia.org/w/rest.php/v1/page/{title}/html`). It ships
with MediaWiki Core and mounts extra routes from extensions (OAuth-backed page
updates, transforms, GrowthExperiments, and many others). Its shape is **not**
the same as the OpenAPI bundle at `/api/rest_v1/?spec`. Discovery for Core REST
often starts from:

`https://en.wikipedia.org/w/rest.php/specs/v0/module/-`

Upstream docs:

- [Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API) —
  `/api/rest_v1/` (this reference).
- [MediaWiki Core REST API](https://www.mediawiki.org/wiki/API:REST_API) —
  `/w/rest.php/`.

Some signals documented in [`wiki-signals`](../../wiki-signals/SKILL.md) hit
Core REST paths (for example attribution routes under `/w/rest.php/`).

Community-facing skill packs sometimes label everything “Wikipedia REST API” and
emphasise Core REST (`rest.php`) plus editing workflows — for example [Santhosh
Thottingal’s wiki-skills → `wikipedia-rest-api`](https://gitlab.wikimedia.org/santhosh/wiki-skills/-/blob/master/skills/wikipedia-rest-api/SKILL.md),
which complements this skill rather than replacing it.

## Page endpoints

| Path | Returns |
| --- | --- |
| `page/html/{title}` | Full rendered article HTML (the same HTML you'd see on the page, minus chrome) |
| `page/html/{title}/{revision}` | HTML at a specific revision |
| `page/mobile-html/{title}` | **Experimental.** Full HTML document for mobile apps: `#pcs` root, PCS stylesheet URLs in `<head>`, section collapse / lazy images / table collapse handled by pagelib JS after load |
| `page/mobile-html/{title}/{revision}` | Mobile HTML at a specific revision |
| `page/mobile-html-offline-resources/{title}` | Bundled offline PCS assets for a title (apps) |
| `page/summary/{title}` | JSON: title, lead extract, thumbnail, description |
| `page/media-list/{title}` | JSON: images, videos, audio in the article |
| `page/related/{title}` | JSON: related-articles strip (4 cards) |
| `page/history/{title}` | JSON: revision history (paginated) |
| `page/random/summary` | JSON: random article summary |
| `page/mobile-sections/{title}` | JSON: page split into lead + sections (mobile-friendly) |
| `page/mobile-sections-lead/{title}` | JSON: lead section only |
| `page/mobile-sections-remaining/{title}` | JSON: everything after the lead |
| `page/talk/{title}` | JSON: parsed talk page (threaded) |

## Feed endpoints

| Path | Returns |
| --- | --- |
| `feed/featured/{yyyy}/{mm}/{dd}` | Featured article + most-read + image-of-the-day + on-this-day |
| `feed/onthisday/{type}/{mm}/{dd}` | Selected / births / deaths / events / holidays for a date |
| `feed/announcements` | Banner messages (rare) |

## Title encoding

Titles are URL-encoded and use underscores for spaces (matching the URL
form):

```ts
const slug = encodeURIComponent('Albert Einstein'.replace(/ /g, '_'))
fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)
```

## Status codes

- `200` — success.
- `301/302` — redirect to canonical title (follow with `redirect: 'follow'`,
  the default in `fetch`).
- `404` — page does not exist.
- `429` — too many requests (back off).
- `5xx` — transient server error (retry with backoff).

## Caching

Each REST response carries an `ETag` and `Cache-Control` header. CDN edge
caching is aggressive (often hours for HTML). For client-side caching,
`If-None-Match` round-trips are cheap and avoid re-downloading bodies.

## Wikimedia metrics REST

Pageviews (and other metrics) live on a separate host:

```
https://wikimedia.org/api/rest_v1/metrics/pageviews/…
```

Common endpoints:

- `metrics/pageviews/per-article/{project}/{access}/{agent}/{title}/{granularity}/{start}/{end}`
- `metrics/pageviews/aggregate/{project}/{access}/{agent}/{granularity}/{start}/{end}`
- `metrics/pageviews/top/{project}/{access}/{year}/{month}/{day}`

Example:

```
https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Albert_Einstein/daily/2024010100/2024013100
```

## Snippets

```ts
async function fetchSummary(title: string, lang = 'en') {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`)
  if (!res.ok) throw new Error(`Summary ${res.status}`)
  return res.json()
}

async function fetchHtml(title: string, lang = 'en'): Promise<string> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/html/${slug}`)
  if (!res.ok) throw new Error(`HTML ${res.status}`)
  return res.text()
}

/** Mobile app pipeline: full document with #pcs + PCS CSS URLs in head. */
async function fetchMobileHtml(title: string, lang = 'en'): Promise<string> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${slug}`)
  if (!res.ok) throw new Error(`mobile-html ${res.status}`)
  return res.text()
}
```
