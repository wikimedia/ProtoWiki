---
name: wiki-attribution
description: The Wikimedia Attribution Framework and Attribution API (beta) — principles, attribution levels (Basic / Approaching / Ideal), reuse scenarios (search, AI assistants, media, social, games, audio), all attribution signals (essential, trust/relevance, ecosystem growth), and how to fetch them via the Attribution API and alternative Wikimedia API pathways. Use when building off-wiki surfaces that credit Wikipedia or other Wikimedia content, picking which signals to show, or implementing attribution cards, source panels, or license notices.
license: MIT
---

# Wikimedia attribution

The [Wikimedia Attribution Framework](https://wikimedia-attribution.toolforge.org/) guides reusers on how to fairly credit Wikimedia content in external contexts — search results, AI assistants, blogs, apps, and more.

This skill covers **what** to show and **how** to fetch it. For general API etiquette and non-attribution endpoints, see [`wiki-apis`](../wiki-apis/SKILL.md). For the broader signal catalogue (pageviews, backlinks, etc.), see [`wiki-signals`](../wiki-signals/SKILL.md).

## Principles

1. **Keep Wikimedia content recognizable** — audiences must know where information comes from.
2. **Clear pathways back to the source** — link to the original page.
3. **Trustworthy, verifiable content** — surface quality and recency cues where appropriate.
4. **Made by humans** — highlight volunteer community authorship when contextually appropriate.

## Signal categories

| Category | Purpose | Reference |
| --- | --- | --- |
| Essential | Source, credit, link, title, license, brand mark, modification disclaimer | [`references/signals.md`](references/signals.md) |
| Trust & relevance | Reference count, contributor count, page views, trending, last update | [`references/signals.md`](references/signals.md) |
| Ecosystem growth | Participation and donation CTAs | [`references/signals.md`](references/signals.md) |

## Attribution levels

Based on how many signals you surface and how visible they are:

- **Basic** — essential signals present; path to source; modifications disclosed if any.
- **Approaching** — all essential signals visible in context with the reused content.
- **Ideal** — approaching + at least one trust/relevance signal + at least one participation CTA.

See [`references/levels.md`](references/levels.md) for the full ladder and contributing-back impact tiers.

## Reuse scenarios

Six documented scenarios with required/recommended signals per context:

| Scenario | Typical surface |
| --- | --- |
| Search | Result snippets with inline source |
| AI assistants | Answer + expandable sources panel |
| Social media | Shared cards, embeds |
| Games & rich media | In-world knowledge panels |
| Media & publications | Blog posts, news articles |
| Audio | Voice assistants (under review) |

See [`references/scenarios.md`](references/scenarios.md).

## Fetching attribution data

**Recommended:** [Wikimedia Attribution API](https://www.mediawiki.org/wiki/Attribution_API) (beta) — one endpoint for most signals.

```
GET https://{host}/w/rest.php/attribution/v0-beta/pages/{title}/signals?expand=trust_and_relevance,calls_to_action
```

Full technical details, alternative pathways, beta known issues, and `wprov` provenance guidance: [`references/api.md`](references/api.md).

### Quick example

```ts
const res = await fetch(
  `https://en.wikipedia.org/w/rest.php/attribution/v0-beta/pages/${encodeURIComponent('Aurora')}/signals?expand=trust_and_relevance,calls_to_action`,
  { headers: { 'Api-User-Agent': 'MyApp/1.0 (https://example.org; you@example.org)' } },
)
const signals = await res.json()
// signals.essential.title, .link, .license, .default_brand_marks, .source_wiki
// signals.trust_and_relevance.page_views, .reference_count, .last_updated, …
// signals.calls_to_action.participation_ctas, .donation_ctas
```

### Beta gaps (Jul 2026 — not client bugs)

| Field | Status | Workaround |
| --- | --- | --- |
| `contributor_counts` | Returns `null` by design until ~July 2026 | Core REST `/w/rest.php/v1/page/{title}/history/counts/editors` |
| `trending.relative.*` | Hardcoded `false` until ~Sept 2026 | Use `trending.top.*` only |
| CTAs | Static demo values via `expand=calls_to_action` | Use cautiously in production |
| Commons media | `essential.credit` present; sparse trust signals | Expect partial `trust_and_relevance` |

## See also

- [Attribution framework site](https://wikimedia-attribution.toolforge.org/)
- [Attribution API on MediaWiki.org](https://www.mediawiki.org/wiki/Attribution_API) — known issues table
- [`wiki-apis`](../wiki-apis/SKILL.md) — REST vs Action API, etiquette
- [`wiki-signals`](../wiki-signals/SKILL.md) — broader signal catalogue

## Inside ProtoWiki

ProtoWiki ships a reusable attribution stack:

- **`src/components/attribution/`** — `AttributionCard`, `fetchAttributionSignals`, `fetchContributorCount` (backfill), `useAttributionSignals`
- **Templates:** `example-attribution-search` (Search scenario — hybrid wiki search + REST page/summary snippets)

Component contract: [`protowiki-components/references/attribution.md`](../protowiki-components/references/attribution.md).

Fetch uses `wikimediaApiFetchHeaders('attribution')` from `src/config.ts`. CORS is `*` — works from the static GitHub Pages SPA.
