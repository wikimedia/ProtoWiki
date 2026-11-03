# State and storage

Wikitab splits persistence into three layers. Keep them separate — do not fold
feed cache into user config, and do not persist transient view state.

## Authoritative config (`wikitab-config-v3`)

User preferences for this browser profile live in
[`data/wikitabConfig.ts`](../../../../src/prototypes/wikitab/data/wikitabConfig.ts).

- Storage key: **`wikitab-config-v3`** — do not bump the suffix. Old shapes are
  upgraded in place on load by
  [`data/wikitabStorageMigration.ts`](../../../../src/prototypes/wikitab/data/wikitabStorageMigration.ts).
- API: `loadWikitabConfig()`, `saveWikitabConfig()`, `patchWikitabConfig()`
- **Current shape only:** `normalizeWikitabConfig()` and `normalizeSavedItems()`
  validate the present schema (unknown section ids dropped, etc.). All knowledge
  of v1/v2 keys, renamed fields, theme aliases, and dodgy rows lives in the
  migration module — nowhere else in the app.

**Grow one field at a time.** Add a property to `WikitabConfig`, a default in
`DEFAULT_WIKITAB_CONFIG`, and a line in `normalizeWikitabConfig`. When you
rename or reshape stored data, teach `wikitabStorageMigration.ts` to read the old
form; do not add a second migration step or runtime fallbacks in components.

Do not pre-build a wikita-lite-style mega schema — the old prototype's 772-line
`urlStateSchema.ts` is the anti-pattern.

Current fields:

- `pinnedSectionIds` — most recently pinned first
- `moduleOrderIds` — Configure-panel / home-feed order (`useWikitabModuleOrder.ts`);
  empty uses `defaultModuleOrder()` from `sections.ts`; unknown ids dropped and
  new modules appended on read
- `hiddenSectionIds` — section ids hidden from the home feed and skipped for
  fetching (`useWikitabHiddenSections.ts`); defaults to
  `WIKITAB_DEFAULT_HIDDEN_MODULE_IDS` (Saved off)
- `hiddenArticleTitleKeys` — normalized article titles hidden from Trending on
  the home feed (`useWikitabHiddenArticles.ts`)
- `dismissedActivityRevids` — Activity-tab revision ids permanently dismissed
  via the card ellipsis menu (`useWikitabDismissedActivity.ts`)
- `reviewChangesShowSavedEdits` / `reviewChangesShowRecentRiskyEdits` — Recent
  edits home module feed sources (both default on); section **Configure** menu
  → full-screen panel (`useWikitabReviewChangesSettings.ts`)
- `savedItems` — typed saved entries (`WikitabSavedItem` discriminated union in
  `data/wikitabSavedItems.ts`): **article**, **snippet**, **word**, **quote**,
  **suggestion**, **change**, **discussion**, **image**. Each row carries
  `primitive` and optional `seedArticle`. Most recently saved first (`savedAt`).
  No cross-source dedup — each source keeps its own stable id. Composable:
  `useWikitabSavedArticles.ts`. Legacy `type: 'list'` / `list:{titleKey}` rows
  migrate to **article** / `search:{titleKey}` in `wikitabStorageMigration.ts`.

**Article seeds for recommendations** — Daily reads, Help wanted, and Recent
edits seed from items with `seedArticle` set
(`uniqueArticleSeedsFromSavedItems` in `savedCardHelpers.ts`). Word, Quote,
Discussion, Change, and Image saves typically have no article seed (or a
non-mainspace one) and do not feed those modules.

## Cache-only feed storage (`wikitab-feed-cache-v*`)

[`data/feedCache.ts`](../../../../src/prototypes/wikitab/data/feedCache.ts) caches
the full daily feed — all six sections (Trending, In the news, Did you know,
Active discussions, On this day, Birthdays) — under a UTC-day key. Nothing here
is authoritative — clearing it must only ever cost one refetch.

A new-tab page opens dozens of times a day; caching the daily feed is both fast
and good API etiquette. Writing today's entry evicts older days.

**Per-slice TTL (stale-while-revalidate)** — constants live in
[`data/wikitabCacheTtl.ts`](../../../../src/prototypes/wikitab/data/wikitabCacheTtl.ts).
Each slice stores `sliceFetchedAt.<id>` (epoch ms) on write. Reads **always**
return cached card data for the UTC day; when TTL expires, modules paint the
cache first and refetch in the background (same contract as Nearby).

| Slice | TTL |
| ----- | --- |
| Trending | 1 h |
| In the news | 4 h |
| Did you know | 4 h |
| Active discussions | 10 min |
| On this day | 4 h |
| Birthdays | UTC day only (new date) |

Legacy entries without timestamps are **displayable** but treated as stale
(background refetch). `persistPartialFeed()` merges non-empty slices and stamps
timestamps only for sections updated in that write. It persists when **any**
slice is non-empty (not only when Trending is populated).

**Hook thumbnails (DYK / news / OTD)** — resolved lead-page thumbnails and
`thumbnailLookupComplete` are patched into the feed cache via
`patchCachedFeedCardThumbnails()` so a new tab does not repeat full-card
skeletons for known hooks.

**Ordered home load** (`index.vue` → `refreshHomeModulesInOrder` →
`useWikitabFeed.loadSection`) reads and writes through the same cache:

- `prepareForOrderedLoad()` hydrates from `readCachedFeed()`, marks sections with
  cached items as fetched, then `scheduleStaleFeedRefresh()` for TTL-expired slices.
- Cache miss → `loadSection` → network → `persistPartialFeed(..., [sectionId])`.
- `feed/featured` is deduped in-memory per UTC day when Trending, News, and DYK
  load separately on a miss (`getFeaturedPayload` in `fetchDailyFeed.ts`).
- Stale featured slices share one `feed/featured` request when any of Trending /
  News / DYK needs refresh.

`?nocache=1` bypasses reads and writes.

## Cache-only Daily reads storage (`wikitab-daily-reads-cache-v*`)

[`data/dailyReadsCache.ts`](../../../../src/prototypes/wikitab/data/dailyReadsCache.ts)
caches the loaded card list plus `hasMore` under `{ day, savedFingerprint }`.
Refetch only when that key misses (saved pages changed, UTC day rolled, or first
visit) and a Daily reads render is triggered via `refreshHomeSavedModules()` —
not on every save during the session. Only the first batch loads on refresh;
additional cards fetch on Show more. Cached `hasMore: false` reflects the last
fetch only — it does not hide desktop "Show more"; clicks can still retry
`loadMore()`. Same `?nocache=1` bypass as the feed cache.

## Cache-only Help wanted storage (`wikitab-suggested-edits-cache-v*`)

[`data/suggestedEditsCache.ts`](../../../../src/prototypes/wikitab/data/suggestedEditsCache.ts)
mirrors Daily reads: `{ day, savedFingerprint, items, hasMore }`. Same refresh
cadence via `refreshHomeSavedModules()` and the Saved-module snapshot. Resumable
partial loads — `hasMore: true` lets `loadMore()` recreate the Contribute feed
with `seenPageidsFromCards()` so cached cards are not duplicated. Cached
`hasMore: false` does not remove desktop "Show more" — same retry contract as
Daily reads.

## Cache-only Featured module storage (`wikitab-featured-cache-v*`)

[`data/featuredCache.ts`](../../../../src/prototypes/wikitab/data/featuredCache.ts)
stores sister-wiki spotlights under `{ day, items, fetchedAt }`. **4-hour TTL**
(`FEATURED_MODULE_TTL_MS`); stale entries paint from cache then background-refetch
via `useWikitabFeatured.ts`.

## Cache-only Recent edits storage (`wikitab-review-changes-cache-v*`)

[`data/reviewChangesCache.ts`](../../../../src/prototypes/wikitab/data/reviewChangesCache.ts)
stores `{ day, savedFingerprint, settingsFingerprint, items, hasMore,
fetchedAtSaved, fetchedAtRisky }`. Each item may carry `reviewChangesSource`:
`'saved' | 'risky'`. TTL: seed-article pipeline **1 h**, Recent risky **10 min**.
Stale-while-revalidate refreshes only expired sources in the background.

## Transient component state

Revealed page counts (`useSectionReveal`: `reserved`) stay in memory only.
Hook lead-page thumbnails for DYK / news / OTD are persisted on the feed cache
(`thumbnailUrl`, `thumbnailLookupComplete`). A new tab opens fresh reveal depth;
scroll position is not persisted.

## URL

Wikitab does **not** use the URL for user preferences. A browser new-tab URL is
fixed — pin state would never survive between opens if it lived in query params.

The sole Wikitab-specific URL escape hatch is **`?nocache=1`**, read inline in
`feedCache.ts` to force a feed refetch when developing against the loading
contract.

ProtoWiki-global params (`?theme=`, `?skin=`) are unrelated — they are resolved
onto `<html>` at boot by [`src/theme.ts`](../../../../src/theme.ts) and
[`protowiki-skins`](../protowiki-skins/SKILL.md).

## One-step storage migration

[`wikitabStorageMigration.ts`](../../../../src/prototypes/wikitab/data/wikitabStorageMigration.ts)
runs once per page load (via `loadWikitabConfig()` / `patchWikitabConfig()`):

- Reads `wikitab-config-v3`, v2, and v1; merges `savedItems` from all sources
  (latest `savedAt` wins per id).
- Best-effort upgrade: v1 `savedArticles`, v2 `savedCards`, pre-typed `snippet`
  rows, renamed fields, theme aliases, missing `primitive` / `seedArticle`, old
  `?pinned=` when pins are empty.
- Writes v3 if the normalized config changed; deletes legacy config keys and any
  `wikitab-*` localStorage key that is not the config key or a current cache
  `CACHE_KEY` (feed, daily reads, suggested edits, review changes, POTD, featured).

Caches are disposable; config is not.

## Cross-tab sync

`useWikitabPinned.ts`, `useWikitabModuleOrder.ts`, `useWikitabHiddenArticles.ts`, and
`useWikitabDismissedActivity.ts` listen for the `storage` event on
`WIKITAB_CONFIG_STORAGE_KEY` so pin / hide / dismiss changes in one tab update
open tabs.
