/**
 * Single registry for disposable Wikitab cache keys.
 *
 * Many localStorage keys (and per-slice TTLs) are intentional — do not fold
 * them into one mega-blob. Register each cache here so migration whitelist,
 * quota eviction prefixes, and the playground Caches tab stay in sync.
 *
 * When you add a cache module:
 * 1. Define `CACHE_KEY` next to that module's schema.
 * 2. Add a row below (`whitelist: true` unless the payload lives in config).
 * 3. Prefer shared helpers in `wikitabCacheHelpers.ts` for read/write.
 */
import { CACHE_KEY as ACTIVE_DISCUSSIONS_CACHE_KEY } from './activeDiscussionsCache'
import { CACHE_KEY as DAILY_READS_CACHE_KEY } from './dailyReadsCache'
import { CACHE_KEY as FEATURED_CACHE_KEY } from './featuredCache'
import { CACHE_KEY as FEED_CACHE_KEY } from './feedCache'
import { CACHE_KEY as POTD_CACHE_KEY } from './fetchPictureOfTheDay'
import { CACHE_KEY as REVIEW_CHANGES_CACHE_KEY } from './reviewChangesCache'
import { CACHE_KEY as SUGGESTED_EDITS_CACHE_KEY } from './suggestedEditsCache'
import { WIKITAB_CONFIG_STORAGE_KEY } from './wikitabConfigNormalize'
import {
  DISCUSSIONS_NOTICEBOARDS_TTL_MS,
  DISCUSSIONS_SAVED_TALK_TTL_MS,
  FEATURED_MODULE_TTL_MS,
  NEARBY_TTL_MS,
  NEWS_TTL_MS,
  OTD_TTL_MS,
  REVIEW_CHANGES_RISKY_TTL_MS,
  REVIEW_CHANGES_SAVED_TTL_MS,
  TRENDING_TTL_MS,
} from './wikitabCacheTtl'
import type { WikitabModuleId, WikitabSectionId } from '../sections'

export type WikitabCacheRegistryId =
  | 'feed'
  | 'featured'
  | 'daily-reads'
  | 'suggested-edits'
  | 'active-discussions'
  | 'review-changes'
  | 'potd'
  /** Legacy standalone Nearby keys — cards now live in config. */
  | 'nearby-legacy'

export interface WikitabCacheRegistryEntry {
  id: WikitabCacheRegistryId
  /**
   * Current localStorage key. Null when the live payload is not a standalone
   * key (Nearby → `config.nearbyCardsCache`; nearby-legacy has no current key).
   */
  storageKey: string | null
  /** Prefix matched by `evictWikitabCaches()`. */
  evictionPrefix: string
  /** Include in migration `CURRENT_KEYS` (survives the `wikitab-*` sweep). */
  whitelist: boolean
}

export const WIKITAB_CACHE_REGISTRY: readonly WikitabCacheRegistryEntry[] = [
  {
    id: 'feed',
    storageKey: FEED_CACHE_KEY,
    evictionPrefix: 'wikitab-feed-cache-v',
    whitelist: true,
  },
  {
    id: 'featured',
    storageKey: FEATURED_CACHE_KEY,
    evictionPrefix: 'wikitab-featured-cache-v',
    whitelist: true,
  },
  {
    id: 'daily-reads',
    storageKey: DAILY_READS_CACHE_KEY,
    evictionPrefix: 'wikitab-daily-reads-cache-v',
    whitelist: true,
  },
  {
    id: 'suggested-edits',
    storageKey: SUGGESTED_EDITS_CACHE_KEY,
    evictionPrefix: 'wikitab-suggested-edits-cache-v',
    whitelist: true,
  },
  {
    id: 'active-discussions',
    storageKey: ACTIVE_DISCUSSIONS_CACHE_KEY,
    evictionPrefix: 'wikitab-active-discussions-cache-v',
    whitelist: true,
  },
  {
    id: 'review-changes',
    storageKey: REVIEW_CHANGES_CACHE_KEY,
    evictionPrefix: 'wikitab-review-changes-cache-v',
    whitelist: true,
  },
  {
    id: 'potd',
    storageKey: POTD_CACHE_KEY,
    evictionPrefix: 'wikitab-potd-cache-v',
    whitelist: true,
  },
  {
    id: 'nearby-legacy',
    storageKey: null,
    evictionPrefix: 'wikitab-nearby-cache-v',
    whitelist: false,
  },
] as const

/** Prefixes deleted when config writes hit quota — never touches config itself. */
export const WIKITAB_CACHE_EVICTION_PREFIXES: readonly string[] = WIKITAB_CACHE_REGISTRY.map(
  (entry) => entry.evictionPrefix,
)

/** Live cache keys that must survive `removeStaleKeys()`. */
export const WIKITAB_CURRENT_CACHE_KEYS: ReadonlySet<string> = new Set(
  WIKITAB_CACHE_REGISTRY.filter((entry) => entry.whitelist && entry.storageKey).map(
    (entry) => entry.storageKey as string,
  ),
)

/** Config + current cache keys — anything else starting with `wikitab-` is stale. */
export function wikitabCurrentStorageKeys(): Set<string> {
  return new Set<string>([WIKITAB_CONFIG_STORAGE_KEY, ...WIKITAB_CURRENT_CACHE_KEYS])
}

export function wikitabCacheStorageKey(id: WikitabCacheRegistryId): string | null {
  return WIKITAB_CACHE_REGISTRY.find((entry) => entry.id === id)?.storageKey ?? null
}

/** Playground / docs: feed slices that share `feed` storage. */
export interface WikitabFeedPlaygroundSlice {
  sectionId: WikitabSectionId
  module: string
  ttlMs: number | null
  invalidates: string
  dayKeyed: boolean
}

export const WIKITAB_FEED_PLAYGROUND_SLICES: readonly WikitabFeedPlaygroundSlice[] = [
  {
    sectionId: 'trending',
    module: 'Trending',
    ttlMs: TRENDING_TTL_MS,
    invalidates: '1h TTL',
    dayKeyed: false,
  },
  {
    sectionId: 'news',
    module: 'In the news',
    ttlMs: NEWS_TTL_MS,
    invalidates: '4h TTL',
    dayKeyed: false,
  },
  {
    sectionId: 'dyk',
    module: 'Did you know',
    ttlMs: NEWS_TTL_MS,
    invalidates: '4h TTL',
    dayKeyed: false,
  },
  {
    sectionId: 'otd',
    module: 'On this day',
    ttlMs: OTD_TTL_MS,
    invalidates: 'UTC day · 4h TTL',
    dayKeyed: true,
  },
  {
    sectionId: 'births',
    module: 'Birthdays',
    ttlMs: null,
    invalidates: 'UTC day',
    dayKeyed: true,
  },
]

/** Simple day/TTL playground rows keyed by registry id (not dual-source). */
export interface WikitabSimplePlaygroundModule {
  id: string
  registryId: Exclude<WikitabCacheRegistryId, 'nearby-legacy' | 'feed'>
  module: string
  /** Displayed storage key; defaults to registry `storageKey`. */
  storageKey?: string
  moduleId?: WikitabModuleId
  invalidates: string
  ttlMs: number | null
  dayKeyed: boolean
  /** How to detect payload for status chips. */
  payload: 'items' | 'potd'
  /** Soft-invalid when live saved seeds diverge. */
  savedFingerprint?: boolean
}

export const WIKITAB_SIMPLE_PLAYGROUND_MODULES: readonly WikitabSimplePlaygroundModule[] = [
  {
    id: 'featured',
    registryId: 'featured',
    module: 'Featured',
    moduleId: 'featured',
    invalidates: 'UTC day · 4h TTL',
    ttlMs: FEATURED_MODULE_TTL_MS,
    dayKeyed: true,
    payload: 'items',
  },
  {
    id: 'daily-reads',
    registryId: 'daily-reads',
    module: 'Daily reads',
    moduleId: 'daily-reads',
    invalidates: 'UTC day · saved seeds (title reload)',
    ttlMs: null,
    dayKeyed: true,
    payload: 'items',
    savedFingerprint: true,
  },
  {
    id: 'help-wanted',
    registryId: 'suggested-edits',
    module: 'Suggested edits',
    moduleId: 'suggested-edits',
    invalidates: 'UTC day · saved seeds (title reload)',
    ttlMs: null,
    dayKeyed: true,
    payload: 'items',
    savedFingerprint: true,
  },
  {
    id: 'potd',
    registryId: 'potd',
    module: 'Picture of the day',
    invalidates: 'UTC day',
    ttlMs: null,
    dayKeyed: true,
    payload: 'potd',
  },
]

/** Dual-source playground rows that share one registry storage key. */
export interface WikitabDualSourcePlaygroundRow {
  id: string
  module: string
  invalidates: string
  ttlMs: number
  fetchedAtField: string
  legacyFetchedAtField?: string
  payloadField?: string
  /** Soft-invalid against live saved seeds. */
  savedFingerprint?: boolean
  /** Config flag that turns this source off (in addition to module hide). */
  sourceEnabled?: (config: {
    discussionsShowNoticeboards: boolean
    discussionsShowSavedTalk: boolean
    reviewChangesShowSavedEdits: boolean
    reviewChangesShowRecentRiskyEdits: boolean
  }) => boolean
}

export const WIKITAB_ACTIVE_DISCUSSIONS_PLAYGROUND_ROWS: readonly WikitabDualSourcePlaygroundRow[] =
  [
    {
      id: 'active-discussions-noticeboards',
      module: 'Active discussions · noticeboards',
      invalidates: 'settings',
      ttlMs: DISCUSSIONS_NOTICEBOARDS_TTL_MS,
      fetchedAtField: 'fetchedAtNoticeboards',
      legacyFetchedAtField: 'fetchedAt',
      payloadField: 'noticeboards',
      sourceEnabled: (config) => config.discussionsShowNoticeboards,
    },
    {
      id: 'active-discussions-talk',
      module: 'Active discussions · talk',
      invalidates: 'settings · saved seeds (title reload)',
      ttlMs: DISCUSSIONS_SAVED_TALK_TTL_MS,
      fetchedAtField: 'fetchedAtArticles',
      legacyFetchedAtField: 'fetchedAt',
      payloadField: 'articles',
      savedFingerprint: true,
      sourceEnabled: (config) => config.discussionsShowSavedTalk,
    },
  ]

export const WIKITAB_REVIEW_CHANGES_PLAYGROUND_ROWS: readonly WikitabDualSourcePlaygroundRow[] = [
  {
    id: 'recent-edits-saved',
    module: 'Recent edits · saved',
    invalidates: 'settings · saved seeds (title reload)',
    ttlMs: REVIEW_CHANGES_SAVED_TTL_MS,
    fetchedAtField: 'fetchedAtSaved',
    payloadField: 'items',
    savedFingerprint: true,
    sourceEnabled: (config) => config.reviewChangesShowSavedEdits,
  },
  {
    id: 'recent-edits-risky',
    module: 'Recent edits · risky',
    invalidates: 'settings',
    ttlMs: REVIEW_CHANGES_RISKY_TTL_MS,
    fetchedAtField: 'fetchedAtRisky',
    payloadField: 'items',
    sourceEnabled: (config) => config.reviewChangesShowRecentRiskyEdits,
  },
]

export const WIKITAB_NEARBY_PLAYGROUND = {
  id: 'nearby',
  module: 'Nearby',
  storageKey: 'config.nearbyCardsCache',
  moduleId: 'nearby' as WikitabModuleId,
  invalidates: 'coord change · 4h TTL',
  ttlMs: NEARBY_TTL_MS,
} as const
