# Attribution components

Off-wiki attribution UI for crediting Wikimedia content. Framework background: [`wiki-attribution`](../../wiki-attribution/SKILL.md).

## Files

| File | Role |
| --- | --- |
| `src/components/attribution/types.ts` | Response types, display enums, `AttributionApiError` |
| `src/components/attribution/fetchAttributionSignals.ts` | Core REST Attribution API fetch + parse |
| `src/components/attribution/fetchContributorCount.ts` | Editors-count backfill while beta returns null |
| `src/components/attribution/useAttributionSignals.ts` | Composable: fetch + merge + abort |
| `src/components/attribution/formatAttribution.ts` | Display helpers (compact counts, relative dates) |
| `src/components/attribution/resolveEcosystemCta.ts` | Resolve a CTA key from `calls_to_action` |
| `src/components/attribution/AttributionCard.vue` | Presentational card |

## `AttributionCard`

Renders attribution signals from a fetched (or passed-in) `AttributionSignals` object.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `signals` | `AttributionSignals \| null` | `null` | Fetched signal payload |
| `variant` | `'full' \| 'compact' \| 'inline'` | `'inline'` | Layout |
| `loading` | `boolean` | `false` | Show progress indicator |
| `error` | `string \| null` | `null` | Error message |
| `sourceDisplay` | `'name-and-mark' \| 'name-only' \| 'mark-only'` | `'name-and-mark'` | Source / brand mark presentation |
| `titleDisplay` | `'linked-title' \| 'title-only' \| 'link-only'` | `'linked-title'` | Title and link presentation |
| `licenseDisplay` | `'text-only' \| 'linked-text' \| 'hidden'` | `'text-only'` | License presentation |
| `showCredit` | `boolean` | `false` | Show `essential.credit` when present |
| `showReferenceCount` | `boolean` | `true` | Reference count trust signal |
| `showContributorCount` | `boolean` | `true` | Contributor count trust signal |
| `showPageViews` | `boolean` | `true` | Page views trust signal |
| `showTrending` | `boolean` | `true` | Allow trending badge |
| `showLastUpdate` | `boolean` | `false` | Last update trust signal |
| `showSourceLink` | `boolean` | `false` | Search scenario: show canonical article URL under source name |
| `ecosystemCta` | `AttributionEcosystemCta` | `'none'` | Participation or donation CTA key |
| `trendingMode` | `'api' \| 'most-read' \| 'not-trending'` | `'api'` | Override trending when API is sparse |
| `snippet` | `string` | `''` | Search scenario: lead extract below the title |
| `thumbnailUrl` | `string \| null` | `null` | Search scenario: 65×65 thumbnail from page summary |
| `showThumbnail` | `boolean` | `true` | Show thumbnail when `thumbnailUrl` is set |

### Variants

| Variant | Use case | Layout |
| --- | --- | --- |
| `inline` | Search results | Brand mark + source (+ optional URL), Heading 4 linked title, subtitle trust row, snippet + thumbnail, footer (reference count, optional license, CTA) |

### Search scenario preset

`SEARCH_ATTRIBUTION_DISPLAY` in `types.ts` — Ideal-level props matching the [framework Search demo](https://wikimedia-attribution.toolforge.org/scenarios/search.html):

```ts
import { SEARCH_ATTRIBUTION_DISPLAY } from '@/components/attribution/types'

// Spread onto AttributionCard: v-bind="SEARCH_ATTRIBUTION_DISPLAY"
```

| Prop | Value |
| --- | --- |
| `sourceDisplay` | `name-and-mark` |
| `titleDisplay` | `linked-title` |
| `licenseDisplay` | `hidden` |
| `showSourceLink` | `true` |
| `showReferenceCount` / `showContributorCount` / `showPageViews` / `showTrending` | `true` |
| `showLastUpdate` / `showCredit` | `false` |
| `ecosystemCta` | `donation:default` |
| `trendingMode` | `most-read` |
| `compact` | AI assistant sources | Bordered panel for source list sidebar |
| `full` | Media & publications | Card below quoted content; trust chips + license + CTA |

### Example

```vue
<script setup lang="ts">
import AttributionCard from '@/components/attribution/AttributionCard.vue'
import { SEARCH_ATTRIBUTION_DISPLAY } from '@/components/attribution/types'
import { useAttributionSignals } from '@/components/attribution/useAttributionSignals'

const { signals, loading, error } = useAttributionSignals('Aurora')
</script>

<template>
  <AttributionCard
    :signals="signals"
    :loading="loading"
    :error="error"
    variant="inline"
    v-bind="SEARCH_ATTRIBUTION_DISPLAY"
  />
</template>
```

## `useAttributionSignals`

```ts
useAttributionSignals(title: Ref<string> | string, options?: {
  host?: string
  expand?: AttributionExpand[]
  apiContact?: string
  backfillContributorCount?: boolean  // default true
})
→ { signals, loading, error }
```

## Example

| Route | Description |
| --- | --- |
| `/example-attribution-search` | Plain search page — `CdxSearchInput` + attributed result card (`SEARCH_ATTRIBUTION_DISPLAY`) |

## Notes

- Outbound links preserve `wprov` from `essential.link` — do not strip it.
- CTAs from the API are static demo values (beta known issue).
- `trendingMode` helps demos when live `trending.top.*` flags are often false.
- Commons media pages include `essential.credit`; articles do not.
