---
name: wiki-signals
description: A catalogue of real-data signals available on Wikipedia / Wikimedia projects — inference signals (revision counts, watchers, infobox shape), analytics (pageviews, top articles), links (incoming, outgoing, redirects, related), curation (featured articles, image of the day, on this day), attribution (license, brand marks, source-wiki metadata), and edit suggestions (Edit Check-style coaching, mockable from rules / Lift Wing). Use when picking what real data to surface in a prototype, asking "what could I show alongside this article?", or grounding a feature idea in observable signals.
license: MIT
---

# Wiki signals

Wikipedia is a rich source of signals — much more than just article
text. This skill is the _catalogue_ of what's available. For _how to
fetch_ any specific signal, see
[`wiki-apis`](../wiki-apis/SKILL.md).

The six families:

- [`references/inference.md`](references/inference.md) — inference and ML
  signals.
- [`references/analytics.md`](references/analytics.md) — pageviews and
  related metrics from the Wikimedia metrics API.
- [`references/links.md`](references/links.md) — incoming / outgoing
  links, redirects, related articles.
- [`references/curation.md`](references/curation.md) — Today's Featured
  Article, Picture of the Day, On This Day, Did You Know.
- [`references/attribution.md`](references/attribution.md) — off-wiki attribution
  (Attribution API beta). **Full framework docs:** [`wiki-attribution`](../wiki-attribution/SKILL.md).
- [`edit-suggestions.md`](edit-suggestions.md) — VisualEditor "Edit Check"
  suggestions: which checks exist, how to mock the stream from fixtures /
  rules / Lift Wing, where the JSON lives. (ProtoWiki-only; not part of
  the FakeMediaWiki [`references/`](references/README.md) mirrors.)

Why this catalogue exists: most Wikipedia prototypes only consume the
article body. But the article _as a node in a graph_ offers far more
that grounds product ideas in real signals.

## Quick map of signals

| Signal                                             | Surface                                                                        | Skill reference  |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------- |
| Article text / HTML                                | REST `/page/html`                                                              | `wiki-apis`      |
| Lead summary + thumbnail                           | REST `/page/summary`                                                           | `wiki-apis`      |
| Pageviews (article / aggregate / top)              | Metrics REST                                                                   | `analytics.md`   |
| Watcher count                                      | Action `query&prop=info&inprop=watchers`                                       | `inference.md`   |
| Recent contributors                                | Action `query&prop=revisions&rvlimit=N`                                        | `inference.md`   |
| Edit frequency                                     | Action `query&prop=revisions` (count)                                          | `inference.md`   |
| Page age                                           | Action `query&prop=info` (`firstrevid`)                                        | `inference.md`   |
| Stub / start / B / GA / FA                         | Categories + page-assessment data                                              | `inference.md`   |
| Infobox shape                                      | Parse the rendered HTML — `.infobox`                                           | `inference.md`   |
| Outgoing links                                     | Action `query&prop=links`                                                      | `links.md`       |
| Incoming links (backlinks)                         | Action `query&list=backlinks`                                                  | `links.md`       |
| Redirects to a page                                | Action `query&list=backlinks&blfilterredir=redirects`                          | `links.md`       |
| Related articles                                   | REST `/page/related`                                                           | `links.md`       |
| Categories of a page                               | Action `query&prop=categories`                                                 | `links.md`       |
| Pages in a category                                | Action `query&list=categorymembers`                                            | `links.md`       |
| Articles from category (related titles)            | Toolforge `POST https://microtask-generator.toolforge.org/related-articles`    | `inference.md`   |
| Category name prefix suggestions                   | Toolforge `GET https://microtask-generator.toolforge.org/category-suggestions` | `inference.md`   |
| Article quality + suggested edits (batched titles) | Toolforge `POST https://microtask-generator.toolforge.org/quality-check`       | `inference.md`   |
| Today's Featured Article                           | REST `/feed/featured/{date}`                                                   | `curation.md`    |
| Picture of the Day                                 | REST `/feed/featured/{date}`                                                   | `curation.md`    |
| On This Day                                        | REST `/feed/onthisday/{type}/{mm}/{dd}`                                        | `curation.md`    |
| Most-read articles                                 | REST `/feed/featured/{date}`                                                   | `curation.md`    |
| Page attribution (license, brand marks, trust, CTAs) | REST `/attribution/v0-beta/pages/{title}/signals` | [`wiki-attribution`](../wiki-attribution/SKILL.md) |
| Tone / quality predictions                         | Lift Wing `edit-check:predict`                                                 | `edit-suggestions.md` |
| Mocked Edit Check suggestion stream                | Static per-page JSON fixtures                                                  | `edit-suggestions.md` |

## Don't fake what you can fetch

The principle: if a real signal is one HTTP call away, **show real
data**. Fake data is acceptable for impossible / unbuilt signals
("imagine an LLM-generated topic strip") but for anything Wikipedia
already has, fetching it grounds the prototype in real edge cases —
long titles, multilingual surprises, missing thumbnails, weird redirect
chains, RTL languages, cyrillic, and so on.

## How signals compose into ideas

Examples of recent feature ideas grounded in two or more signals:

| Feature                                  | Signals                                            |
| ---------------------------------------- | -------------------------------------------------- |
| "Why this article is recommended to you" | related articles + pageviews + categories          |
| "Hot edits this week"                    | recent revisions + pageviews + watcher count       |
| "Articles that link here" panel          | backlinks + summary + thumbnail                    |
| "Featured today across languages"        | featured + interlanguage links                     |
| "Did this fact change?"                  | revisions + parsed infobox shape                   |
| Off-wiki answer card with proper credit  | summary + attribution (license + brand marks + trust) | [`wiki-attribution`](../wiki-attribution/SKILL.md) |
| "Coach my edit" overlay                  | suggestion stream + tone prediction + diff preview |

The catalogue isn't a feature list — it's the raw material for one.

## See also

- [`references/README.md`](references/README.md) — index of the
  FakeMediaWiki-synced signal reference files in this folder.
- [`wiki-apis`](../wiki-apis/SKILL.md) — how to actually fetch each of
  these.
- [`wiki-snapshot-data`](../wiki-snapshot-data/SKILL.md) — when fetching
  every load is wasteful.

## Inside ProtoWiki

In the ProtoWiki repo:

- The convention for committed Edit Check fixtures is
  `public/edit-suggestions/<slug>.json`, loaded at runtime via `fetch`.
  Nothing committed today — the folder is created the moment the first
  fixture lands. See [`edit-suggestions.md`](edit-suggestions.md)
  for how to author one.
- For the per-component contract that consumes those fixtures (payload
  shape, `SuggestionCard`, dismiss state, "apply" semantics), see
  [`protowiki-components/references/edit-suggestions.md`](../protowiki-components/references/edit-suggestions.md).
- The off-wiki attribution stack lives in **`src/components/attribution/`**
  and **`example-attribution-search`**. See
  [`wiki-attribution`](../wiki-attribution/SKILL.md) and
  [`protowiki-components/references/attribution.md`](../protowiki-components/references/attribution.md).
