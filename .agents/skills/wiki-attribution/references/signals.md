# Attribution signals

Each signal maps to a field in the [Attribution API](https://www.mediawiki.org/wiki/Attribution_API) response where noted. Signals marked **external** must be determined by the reuser (e.g. modification disclaimer, attribution count).

## Essential attribution

| Signal | Required? | API field | Notes |
| --- | --- | --- | --- |
| Source | Yes | `essential.source_wiki.site_name` | Text or brand mark when space is limited |
| Credit | License-dependent | `essential.credit` | Present on Commons media; for articles, link to history |
| Link | Yes | `essential.link` | Includes `wprov` provenance param — keep it |
| Title | Yes (exceptions for media) | `essential.title` | Omit unwieldy file titles when link is present |
| License | License-dependent | `essential.license` | `{ title, url }` |
| Brand mark | If source not stated | `essential.default_brand_marks[]` | `{ name, url, type: logo \| icon \| audio }` |
| Modification disclaimer | License-dependent | **external** | Required when content is modified or aggregated |

## Trust and relevance

| Signal | Recommended? | API field | Notes |
| --- | --- | --- | --- |
| Reference count | Yes | `trust_and_relevance.reference_count` | Wikipedia articles only |
| Contributor count | Yes | `trust_and_relevance.contributor_counts` | **Returns `null` in beta** — backfill via editors-count endpoint |
| Page views | Yes | `trust_and_relevance.page_views` | Last 30 days; label the window |
| Attribution count | Contextual | **external** | How often *your* product cites this source |
| Trending indicator | Yes | `trust_and_relevance.trending.top.*` | `{ read, edited, read_and_edited }` booleans; `relative.*` not yet implemented |
| Last update | Yes | `trust_and_relevance.last_updated` | ISO 8601 timestamp |

### Contributor count backfill (beta)

Until `contributor_counts` is populated:

```
GET https://{host}/w/rest.php/v1/page/{title}/history/counts/editors
→ { "count": 3327, "limit": false }
```

Alternative: Action API `prop=contributors` (paginated list + `anoncontributors`).

## Ecosystem growth

| Signal | Recommended? | API field | Notes |
| --- | --- | --- | --- |
| Participation CTA | Yes | `calls_to_action.participation_ctas.*` | Requires `expand=calls_to_action`; static demo values |
| Donation CTA | Coming soon (docs) | `calls_to_action.donation_ctas.*` | Already returned by API; static demo values |

### Fetching CTAs

Use `expand=calls_to_action` (not `ecosystem_growth` — stale name in some docs).

Each CTA object: `{ url, link_text, description }`.

Keys include `learn_more`, `create_account`, `download_app` (participation) and `default`, `foundation`, `special` (donation).

## Display guidance

- Keep trust signals **secondary** to essential attribution.
- Label page views with the time window ("41K views last month").
- Do not equate popularity with correctness.
- Preserve `wprov` on outbound links for traffic referral analytics.

## Data source priority

1. **Attribution API** (beta) — canonical for most signals
2. **Core REST editors count** — contributor backfill
3. **Action API** — credit for Commons, contributor lists
4. **Analytics API** — pageviews if Attribution API unavailable
5. **Enterprise API** — commercial/high-volume reusers

See [`api.md`](api.md) for the full pathway matrix.
