import type { WikitabFeed, WikitabSectionId } from '../sections'
import {
  isCacheBypassed,
  previousUtcDay,
  readCacheJsonUnlessBypassed,
  utcDayKey,
  writeCacheJson,
} from './wikitabCacheHelpers'
import {
  feedSliceRequiresUtcDay,
  isFeedSliceFreshByTimestamp,
  type FeedSliceTtlSectionId,
} from './wikitabCacheTtl'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-feed-cache-v22'

export type FeedSliceFetchedAt = Partial<Record<FeedSliceTtlSectionId, number>>

interface CacheEntry {
  day: string
  feed: WikitabFeed
  sliceFetchedAt?: FeedSliceFetchedAt
}

/** Re-export for modules that only need bypass / day key / TTL constants. */
export { DISCUSSIONS_TTL_MS } from './wikitabCacheTtl'
export { isCacheBypassed, previousUtcDay, utcDayKey }

function readRawCacheEntry(): CacheEntry | null {
  const entry = readCacheJsonUnlessBypassed(CACHE_KEY) as CacheEntry | null
  if (!entry?.day || !entry.feed) return null
  return entry
}

/**
 * Full entry for today's day-keyed blob. TTL-only slices (Trending / News / DYK)
 * may still be read from a previous day's entry via `readCachedSectionSlice`.
 */
export function getFeedCacheEntry(day: string): CacheEntry | null {
  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return null
  return entry
}

function feedEntryForSlice(day: string, sectionId: WikitabSectionId): CacheEntry | null {
  const entry = readRawCacheEntry()
  if (!entry) return null
  if (feedSliceRequiresUtcDay(sectionId) && entry.day !== day) return null
  return entry
}

export function isFeedSliceFresh(
  day: string,
  sectionId: WikitabSectionId,
  entry: CacheEntry | null = feedEntryForSlice(day, sectionId),
  now = Date.now(),
): boolean {
  if (!entry) return false
  if (feedSliceRequiresUtcDay(sectionId) && entry.day !== day) return false
  const slice = entry.feed[sectionId]
  if (!slice?.length) return false

  return isFeedSliceFreshByTimestamp(
    sectionId,
    entry.sliceFetchedAt?.[sectionId as FeedSliceTtlSectionId],
    entry.day,
    day,
    now,
  )
}

export function isFeedSliceStale(
  day: string,
  sectionId: WikitabSectionId,
  now = Date.now(),
): boolean {
  const entry = feedEntryForSlice(day, sectionId)
  if (!entry?.feed[sectionId]?.length) return false
  return !isFeedSliceFresh(day, sectionId, entry, now)
}

export function readCachedSectionSlice(
  day: string,
  sectionId: WikitabSectionId,
): WikitabFeed[WikitabSectionId] | null {
  const entry = feedEntryForSlice(day, sectionId)
  if (!entry) return null

  const slice = entry.feed[sectionId]
  if (!slice?.length) return null

  return slice.map((item) => ({ ...item }))
}

export function readCachedFeed(day: string): WikitabFeed | null {
  const entry = readRawCacheEntry()
  if (!entry) return null

  const feed = {} as WikitabFeed
  let any = false
  for (const key of FEED_SLICE_KEYS) {
    if (feedSliceRequiresUtcDay(key) && entry.day !== day) {
      feed[key] = []
      continue
    }
    const slice = entry.feed[key]
    if (slice?.length) {
      feed[key] = slice.map((item) => ({ ...item }))
      any = true
    } else {
      feed[key] = []
    }
  }
  return any ? feed : null
}

/** Storing a single entry means writing today's feed evicts every older day. */
function writeCacheEntry(entry: CacheEntry): void {
  writeCacheJson(CACHE_KEY, entry satisfies CacheEntry)
}

export function writeCachedFeed(
  day: string,
  feed: WikitabFeed,
  sliceFetchedAt?: FeedSliceFetchedAt,
): void {
  writeCacheEntry({ day, feed, sliceFetchedAt })
}

const FEED_SLICE_KEYS: (keyof WikitabFeed)[] = [
  'trending',
  'news',
  'dyk',
  'otd',
  'births',
]

function feedHasAnyContent(feed: WikitabFeed): boolean {
  return FEED_SLICE_KEYS.some((key) => (feed[key]?.length ?? 0) > 0)
}

function stampSliceTimestamps(
  merged: WikitabFeed,
  sliceFetchedAt: FeedSliceFetchedAt,
  sectionIds: readonly WikitabSectionId[],
  now: number,
): FeedSliceFetchedAt {
  const next = { ...sliceFetchedAt }
  for (const key of sectionIds) {
    if (merged[key]?.length) {
      next[key as FeedSliceTtlSectionId] = now
    }
  }
  return next
}

/** Drop one section slice from the day cache before a manual refresh. */
export function clearCachedSectionSlice(day: string, sectionId: WikitabSectionId): void {
  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return

  const feed = { ...entry.feed, [sectionId]: [] as WikitabFeed[WikitabSectionId] }
  const sliceFetchedAt = { ...entry.sliceFetchedAt }
  delete sliceFetchedAt[sectionId as FeedSliceTtlSectionId]

  writeCacheEntry({ day, feed, sliceFetchedAt })
}

export function persistPartialFeed(
  day: string,
  feed: WikitabFeed,
  now = Date.now(),
  updatedSectionIds?: readonly WikitabSectionId[],
): void {
  if (isCacheBypassed()) return

  const existingEntry = readRawCacheEntry()
  const existing =
    existingEntry?.day === day
      ? existingEntry.feed
      : {
          trending: [],
          news: [],
          dyk: [],
          otd: [],
          births: [],
        }

  const merged = { ...existing }
  const touched: WikitabSectionId[] = []

  for (const key of FEED_SLICE_KEYS) {
    const slice = feed[key]
    if (slice?.length) {
      merged[key] = slice
      touched.push(key)
    }
  }

  if (!feedHasAnyContent(merged)) return

  const stampIds = updatedSectionIds?.length
    ? updatedSectionIds
    : touched

  const sliceFetchedAt = stampSliceTimestamps(
    merged,
    { ...existingEntry?.sliceFetchedAt },
    stampIds,
    now,
  )

  writeCacheEntry({ day, feed: merged, sliceFetchedAt })
}

/** Merge thumbnail fields from resolved hook lookups into the persisted feed slice. */
export function patchCachedFeedCardThumbnails(
  day: string,
  sectionId: WikitabSectionId,
  cardKey: string,
  patch: { thumbnailUrl?: string; thumbnailLookupComplete?: boolean },
): void {
  if (isCacheBypassed()) return

  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return

  const slice = entry.feed[sectionId]
  if (!slice?.length) return

  const index = slice.findIndex((card) => card.key === cardKey)
  if (index < 0) return

  const updated = slice.map((card, i) =>
    i === index ? { ...card, ...patch } : card,
  )
  writeCacheEntry({
    day,
    feed: { ...entry.feed, [sectionId]: updated },
    sliceFetchedAt: entry.sliceFetchedAt,
  })
}
