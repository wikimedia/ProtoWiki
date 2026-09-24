# State and storage

Wikitab splits persistence into three layers. Keep them separate — do not fold
feed cache into user config, and do not persist transient view state.

## Authoritative config (`wikitab-config-v*`)

User preferences for this browser profile live in
[`data/wikitabConfig.ts`](../../../../src/prototypes/wikitab/data/wikitabConfig.ts).

- Storage key: `wikitab-config-v1` (bump the suffix on breaking shape changes)
- API: `loadWikitabConfig()`, `saveWikitabConfig()`, `patchWikitabConfig()`
- Each field is normalized on read and write (unknown section ids dropped, etc.)

**Grow one field at a time.** Add a property to `WikitabConfig`, a default in
`DEFAULT_WIKITAB_CONFIG`, and a line in `normalizeConfig`. Do not pre-build a
wikita-lite-style mega schema — the old prototype's 772-line `urlStateSchema.ts`
is the anti-pattern.

Current fields:

- `pinnedSectionIds` — most recently pinned first
- `hiddenSectionIds` — section ids hidden from the home feed and skipped for
  fetching (`useWikitabHiddenSections.ts`)
- `hiddenArticleTitleKeys` — normalized article titles hidden from Trending on
  the home feed (`useWikitabHiddenArticles.ts`)
- `dismissedActivityRevids` — Activity-tab revision ids permanently dismissed
  via the card ellipsis menu (`useWikitabDismissedActivity.ts`)

## Cache-only feed storage (`wikitab-feed-cache-v*`)

[`data/feedCache.ts`](../../../../src/prototypes/wikitab/data/feedCache.ts) caches
the full daily feed — all six sections (Trending, In the news, Did you know,
Active discussions, On this day, Birthdays) — under a UTC-day key. Nothing here
is authoritative — clearing it must only ever cost one refetch.

A new-tab page opens dozens of times a day; caching the daily feed is both fast
and good API etiquette. Writing today's entry evicts older days.

**Active discussions TTL** — the discussions slice carries
`sliceFetchedAt.discussions` (epoch ms). `readCachedSectionSlice('discussions')`
and `readCachedFeed()` treat the slice as a miss after **5 minutes**
(`DISCUSSIONS_TTL_MS`). Other slices remain on the UTC-day key. Legacy entries
without a timestamp are treated as stale. `persistPartialFeed()` stamps the time
when a non-empty discussions slice lands.

**Ordered home load** (`index.vue` → `refreshHomeModulesInOrder` →
`useWikitabFeed.loadSection`) reads and writes through the same cache:

- `prepareForOrderedLoad()` hydrates `feed.value` from `readCachedFeed()` when
  the day key hits, marking cached sections as already fetched via
  `readCachedSectionSlice()` (so stale discussions are not marked fetched).
- Each `loadSection` call reads its slice via `fetchWikitabSectionFeed` (cache
  before network) and patches localStorage via `persistPartialFeed()` after each
  non-empty slice lands. Empty slices are not cached so a later open can retry.
- `feed/featured` is deduped in-memory per UTC day when Trending, News, and DYK
  load separately on a cache miss (`getFeaturedPayload` in
  `fetchDailyFeed.ts`).
- `fetchDailyFeedProgressive()` refetches discussions only when the rest of the
  day cache hits but discussions exceeded the TTL.

Skip caching when Trending is still empty (early UTC) so the next tab open can
retry. `?nocache=1` bypasses reads and writes.

**DYK / In the news** — both are "current day only" in the Wikifeeds API. DYK
normally updates once at ~00:00 UTC; enwiki can switch to twice daily (~00:00 and
~12:00 UTC) during nomination backlog. UTC-day cache is sufficient for normal
days; no separate TTL unless parity with the midday rotation is needed later.

## Cache-only Daily reads storage (`wikitab-daily-reads-cache-v*`)

[`data/dailyReadsCache.ts`](../../../../src/prototypes/wikitab/data/dailyReadsCache.ts)
caches the loaded card list plus `hasMore` under `{ day, savedFingerprint }`.
Refetch only when that key misses (saved pages changed, UTC day rolled, or first
visit) and a Daily reads render is triggered via `refreshHomeSavedModules()` —
not on every save during the session. Only the first batch loads on refresh;
additional cards fetch on Show more. Same `?nocache=1` bypass as the feed cache.

## Cache-only Suggested edits storage (`wikitab-suggested-edits-cache-v*`)

[`data/suggestedEditsCache.ts`](../../../../src/prototypes/wikitab/data/suggestedEditsCache.ts)
mirrors Daily reads: `{ day, savedFingerprint, items, hasMore }`. Same refresh
cadence via `refreshHomeSavedModules()` and the Saved-module snapshot. Resumable
partial loads — `hasMore: true` lets `loadMore()` recreate the Contribute feed
with `seenPageidsFromCards()` so cached cards are not duplicated.

## Transient component state

Revealed page counts (`useSectionReveal`: `reserved` / `ready`) stay in memory
only. A new tab opens fresh every time; persisting scroll/reveal depth would add
complexity with little benefit.

## URL

Wikitab does **not** use the URL for user preferences. A browser new-tab URL is
fixed — pin state would never survive between opens if it lived in query params.

The sole Wikitab-specific URL escape hatch is **`?nocache=1`**, read inline in
`feedCache.ts` to force a feed refetch when developing against the loading
contract.

ProtoWiki-global params (`?theme=`, `?skin=`) are unrelated — they are resolved
onto `<html>` at boot by [`src/theme.ts`](../../../../src/theme.ts) and
[`protowiki-skins`](../protowiki-skins/SKILL.md).

## Legacy migration

On first load, if stored config has empty `pinnedSectionIds` and the URL still
carries `?pinned=trending,dyk`, those ids are imported into config and the param
is stripped via `history.replaceState`.

## Cross-tab sync

`useWikitabPinned.ts`, `useWikitabHiddenArticles.ts`, and
`useWikitabDismissedActivity.ts` listen for the `storage` event on
`WIKITAB_CONFIG_STORAGE_KEY` so pin / hide / dismiss changes in one tab update
open tabs.
