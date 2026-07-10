# Attribution levels

From [Principles and levels](https://wikimedia-attribution.toolforge.org/principles-and-levels.html).

## Attribution levels (signal usage)

### Basic

- Explicit mention of source
- Path to source (appropriate to the medium)
- Content reused without modification, or modifications disclosed
- All **essential** signals for the use case and format are provided

### Approaching

- All Basic items, **and**
- All essential signals visible **in context** with the reused content

### Ideal

- All Approaching items, **and**
- One or more **trust/relevance** signals beyond essential
- One or more **participation CTAs** in the reuse scenario

ProtoWiki's `example-attribution-search` page demonstrates **Ideal** level for the Search scenario using `SEARCH_ATTRIBUTION_DISPLAY`.

## Contributing-back impact levels

Separate from signal visibility — measures whether reuse drives engagement back to Wikimedia:

| Level | Threshold |
| --- | --- |
| Minimum | More than zero monthly visitors or equivalent engagement |
| Expected | More than X% of reuser traffic converts to Wikimedia engagement |
| Elevated | More than X+Y% converts |

Concrete X/Y percentages are TBD in the framework. Implement **`wprov`** provenance on outbound links to help Wikimedia measure conversion.

## Traffic referral practices

Where feasible:

1. **Do not strip referrers** — avoid `rel="noreferrer"` and `content="no-referrer"` on Wikimedia links
2. **Preserve `wprov`** — the Attribution API appends this to `essential.link` (e.g. `wprov=afsw1`); keep it on CTA URLs too
3. **Set `Api-User-Agent`** — identifies your product for rate-limit fairness and contact

See [`api.md`](api.md) for header format.
