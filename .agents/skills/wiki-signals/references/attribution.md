# Attribution signals

Off-wiki attribution (license, brand marks, trust signals, CTAs) is documented in the dedicated **[`wiki-attribution`](../../wiki-attribution/SKILL.md)** skill.

That skill covers:

- The [Wikimedia Attribution Framework](https://wikimedia-attribution.toolforge.org/)
- The [Attribution API](https://www.mediawiki.org/wiki/Attribution_API) (beta) endpoint and `expand` parameters
- All signal categories, reuse scenarios, and attribution levels
- Beta gaps (`contributor_counts` null, static CTAs) and workarounds

Quick endpoint reference:

```
GET https://{host}/w/rest.php/attribution/v0-beta/pages/{title}/signals?expand=trust_and_relevance,calls_to_action
```

See [`wiki-attribution/references/api.md`](../../wiki-attribution/references/api.md) for the full technical reference.
