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
- `discussionsShowNoticeboards` / `discussionsShowSavedTalk` — Active
  discussions home module feed sources (both default on); section **Configure**
  menu → full-screen panel (`useWikitabActiveDiscussionsSettings.ts`)
- `savedItems` — typed saved entries (`WikitabSavedItem` discriminated union in
  `data/wikitabSavedItems.ts`): **article**, **snippet**, **word**, **quote**,
  **suggestion**, **change**, **discussion**, **image**. Each row carries
  `primitive` and optional `seedArticle`. Most recently saved first (`savedAt`).
  No cross-source dedup — each source keeps its own stable id. Composable:
  `useWikitabSavedArticles.ts`. Legacy `type: 'list'` / `list:{titleKey}` rows
  migrate to **article** / `search:{titleKey}` in `wikitabStorageMigration.ts`.

**Article seeds for recommendations** — Daily reads, Help wanted, Recent edits,
and Active discussions (talk-page source) seed from items with `seedArticle` set
(`uniqueArticleSeedsFromSavedItems` in `savedCardHelpers.ts`). Word, Quote,
Discussion, Change, and Image saves typically have no article seed (or a
non-mainspace one) and do not feed those modules.

## Cache-only feed storage (`wikitab-feed-cache-v*`)

[`data/feedCache.ts`](../../../../src/prototypes/wikitab/data/feedCache.ts) caches
the full daily feed — five sections (Trending, In the news, Did you know, On
this day, Birthdays) — under a UTC-day key. Nothing here is authoritative —
clearing it must only ever cost one refetch. Active discussions lives in its
own cache (below).

A new-tab page opens dozens of times a day; caching the daily feed is both fast
and good API etiquette. Writing today's entry evicts older days.

**Per-slice freshness** — constants live in
[`data/wikitabCacheTtl.ts`](../../../../src/prototypes/wikitab/data/wikitabCacheTtl.ts).
Each slice stores `sliceFetchedAt.<id>` (epoch ms) on write. Trending / News /
DYK use wall-clock TTL only (they survive UTC midnight). On this day needs a
matching UTC day **and** a 4 h TTL. Birthdays miss on UTC day rollover only.
When TTL expires, modules paint the cache first and refetch in the background
(same contract as Nearby).

| Slice | Freshness |
| ----- | --- |
| Trending | 1 h TTL |
| In the news | 4 h TTL |
| Did you know | 4 h TTL |
| On this day | UTC day · 4 h TTL |
| Birthdays | UTC day only |

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

- `prepareForOrderedLoad()` hydrates from `readCachedFeed()` and marks sections
  with cached items as fetched — **no** network / stale refresh here.
- Cache miss → `loadSection` → network → `persistPartialFeed(..., [sectionId])`.
- Cache hit that is TTL-stale → `loadSection` awaits a per-section stale refresh
  on that module's turn (`refreshStaleFeedSections`), so lower slices cannot
  race modules above.
- `feed/featured` is deduped in-memory per UTC day when Trending, News, and DYK
  load separately on a miss (`getFeaturedPayload` in `fetchDailyFeed.ts`).
- Stale featured slices share one `feed/featured` request when any of Trending /
  News / DYK needs refresh on its turn.

`?nocache=1` bypasses reads and writes.

## Cache-only Daily reads storage (`wikitab-daily-reads-cache-v*`)

[`data/dailyReadsCache.ts`](../../../../src/prototypes/wikitab/data/dailyReadsCache.ts)
caches `{ day, savedFingerprint, items, hasMore }`. Reads hit on **UTC day**
only — a saved-fingerprint change is not a miss. Home refresh
(`refreshHomeModulesInOrder`) keeps the painted cards; when live seed
fingerprint ≠ `fetchedSavedFingerprint`, the section shows a quiet title reload
(and ⋯ → Refresh still force-refetches). Network on day rollover, empty cache,
`force`, or `?nocache=1`. Only the first batch loads on refresh; additional
cards fetch on Show more. Cached `hasMore: false` reflects the last fetch only
— it does not hide desktop "Show more"; clicks can still retry `loadMore()`.

## Cache-only Help wanted storage (`wikitab-suggested-edits-cache-v*`)

[`data/suggestedEditsCache.ts`](../../../../src/prototypes/wikitab/data/suggestedEditsCache.ts)
mirrors Daily reads: `{ day, savedFingerprint, items, hasMore }` with the same
day-keyed read and signature-gated title refresh. Resumable partial loads —
`hasMore: true` lets `loadMore()` recreate the Contribute feed with
`seenPageidsFromCards()` so cached cards are not duplicated. Cached
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
fetchedAtSaved, fetchedAtRisky }`. Reads hit on **day + settings fingerprint**;
saved-fingerprint mismatch keeps painted cards and surfaces the title reload
only when the Saved articles source is on. Settings toggles still force
refresh. Each item may carry `reviewChangesSource`: `'saved' | 'risky'`. TTL:
seed-article pipeline **1 h**, Recent risky **10 min**. Stale-while-revalidate
runs on the module's ordered-load `refresh()` turn (expired sources only).

## Cache-only Active discussions storage (`wikitab-active-discussions-cache-v*`)

[`data/activeDiscussionsCache.ts`](../../../../src/prototypes/wikitab/data/activeDiscussionsCache.ts)
stores `{ day, savedFingerprint, settingsFingerprint, noticeboards, articles,
articleSeedOffset, fetchedAtNoticeboards, fetchedAtArticles }`
(`wikitab-active-discussions-cache-v11`; legacy single `fetchedAt` still reads).
Reads hit on **day + settings fingerprint**; saved-fingerprint mismatch keeps
painted cards and surfaces the title reload only when Saved talk is on. Settings
toggles still force refresh. Per-source TTL: noticeboards **10 min**, saved talk
**1 h**. Hydrate-from-storage paints cache only (no network). Stale-while-
revalidate runs on the module's ordered-load `refresh()` turn (and on the
periodic timer while home stays mounted). Show more may still append further
saved-talk seed batches via `loadMore()`.

## Transient component state

Revealed page counts (`useSectionReveal`: `reserved`) stay in memory only.
Hook lead-page thumbnails for DYK / news / OTD are persisted on the feed cache
(`thumbnailUrl`, `thumbnailLookupComplete`). A new tab opens fresh reveal depth;
scroll position is not persisted.

## URL

Wikitab does **not** use the URL for user preferences. A browser new-tab URL is
fixed — pin state would never survive between opens if it lived in query params.

Transient **view** state may live in query params (search and full-screen overlays).
Preferences stay in `wikitab-config-v3`.

| Param | Meaning |
| ----- | ------- |
| **`?search=`** / **`?tab=`** | Search results page and active results tab (`useWikitabSearchNavigation.ts`, `useWikitabSearchTab.ts`) |
| **`?screen=`** | Full-screen overlay: chrome (`configure` \| `color` \| `recent-edits-settings` \| `active-discussions-settings`) or any home module id (`saved`, `trending`, `featured`, …). Module titles open `?screen=<moduleId>`; Saved also opens from the bookmark button. |
| **`?nocache=1`** | Dev escape hatch — force feed refetch (`feedCache.ts`) |

`?screen=` open/close **push** history via
[`useWikitabOverlayNavigation.ts`](../../../../src/prototypes/wikitab/useWikitabOverlayNavigation.ts)
so Back closes the panel. Unknown values are stripped. POTD attribution
open/dismiss stays in config (`potdAttributionExpandedDay`), not the URL.

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
