# Reuse scenarios

The [framework scenarios overview](https://wikimedia-attribution.toolforge.org/scenarios/overview.html) documents six contexts where Wikimedia content is commonly reused. Each scenario page lists required essential signals and recommended trust/growth signals.

## Scenario summary

| Scenario | Context | Essential highlights | Trust signals (recommended) | Growth signals |
| --- | --- | --- | --- | --- |
| [Search](https://wikimedia-attribution.toolforge.org/scenarios/search.html) | Search result snippets | Source, link, title, license | Page views, reference count, contributor count, trending, last update | Participation CTA |
| [AI assistants](https://wikimedia-attribution.toolforge.org/scenarios/ai-assistants.html) | Chat answers blending sources | All essential + **modification disclaimer** (aggregated content) | Reference count, page views, contributor count, trending, last update | Participation CTA |
| [Social media](https://wikimedia-attribution.toolforge.org/scenarios/social-media.html) | Shared cards, embeds | Source/link, license (esp. media), brand mark when space-limited | Page views, last update | Participation CTA |
| [Games & rich media](https://wikimedia-attribution.toolforge.org/scenarios/games-and-rich-media.html) | In-world knowledge panels | Source, link, title; brand mark in immersive UIs | Reference count, last update | Participation CTA |
| [Media & publications](https://wikimedia-attribution.toolforge.org/scenarios/media-and-publications.html) | Blogs, news, journals | Full essential set; credit for media files | Reference count, contributor count, page views, last update | Optional |
| [Audio](https://wikimedia-attribution.toolforge.org/scenarios/audio.html) | Voice assistants (under review) | Source via audio brand marks; link in companion UI | Last update | — |

## Choosing a scenario for your prototype

Match the **surface affordances**, not the product category:

- **Inline under a snippet** → Search pattern (`AttributionCard` `variant="inline"`)
- **Side panel listing sources** → AI assistant pattern (`variant="compact"`)
- **Card below quoted content** → Media & publications pattern (`variant="full"`)

ProtoWiki ships one interactive example:

| Example | Scenario | Notes |
| --- | --- | --- |
| `example-attribution-search` | Search | Hybrid wiki search (full-text + semantic) with page-summary snippets and Ideal-level attribution |

## Modification disclaimer

Especially critical for **AI assistants** and any context where content from multiple sources is blended. Must be determined externally — the API does not provide this field.

Example copy: "Content adapted from multiple Wikimedia sources. Responses may not reflect the current state of the original pages."

## Space constraints

When horizontal space is limited:

- Replace textual source with **brand mark** (logo/icon)
- Omit media file **title** if the link to the file page is present
- Truncate title with ellipsis; keep link intact
