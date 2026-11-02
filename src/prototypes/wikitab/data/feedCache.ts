import type { WikitabFeed, WikitabSectionId } from '../sections'
import {
  isFeedSliceFreshByTimestamp,
  type FeedSliceTtlSectionId,
} from './wikitabCacheTtl'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-feed-cache-v21'

export type FeedSliceFetchedAt = Partial<Record<FeedSliceTtlSectionId, number>>

interface CacheEntry {
  day: string
  feed: WikitabFeed
  sliceFetchedAt?: FeedSliceFetchedAt
}

/** Re-export for modules that only need bypass / day key. */
export { DISCUSSIONS_TTL_MS } from './wikitabCacheTtl'

/** `YYYY-MM-DD` in UTC — the granularity of the featured feed itself. */
export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** Previous UTC calendar day as `YYYY-MM-DD`. */
export function previousUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** `?nocache=1` forces a refetch, for when the day's content has gone stale. */
export function isCacheBypassed(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('nocache') === '1'
}

function readRawCacheEntry(): CacheEntry | null {
  if (isCacheBypassed()) return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry?.day || !entry.feed) return null
    return entry
  } catch {
    return null
  }
}

export function getFeedCacheEntry(day: string): CacheEntry | null {
  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return null
  return entry
}

export function isFeedSliceFresh(
  day: string,
  sectionId: WikitabSectionId,
  entry: CacheEntry | null = getFeedCacheEntry(day),
  now = Date.now(),
): boolean {
  if (!entry || entry.day !== day) return false
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
  const entry = getFeedCacheEntry(day)
  if (!entry?.feed[sectionId]?.length) return false
  return !isFeedSliceFresh(day, sectionId, entry, now)
}

/** @deprecated Use isFeedSliceStale(day, 'discussions') */
export function isDiscussionsCacheStale(day: string, now = Date.now()): boolean {
  return isFeedSliceStale(day, 'discussions', now)
}

export function readCachedSectionSlice(
  day: string,
  sectionId: WikitabSectionId,
): WikitabFeed[WikitabSectionId] | null {
  const entry = getFeedCacheEntry(day)
  if (!entry) return null

  const slice = entry.feed[sectionId]
  if (!slice?.length) return null

  return slice.map((item) => ({ ...item }))
}

export function readCachedFeed(day: string): WikitabFeed | null {
  const entry = getFeedCacheEntry(day)
  if (!entry) return null

  const feed = {} as WikitabFeed
  for (const key of FEED_SLICE_KEYS) {
    const slice = entry.feed[key]
    feed[key] = slice?.length ? slice.map((item) => ({ ...item })) : []
  }
  return feed
}

/** Storing a single entry means writing today's feed evicts every older day. */
function writeCacheEntry(entry: CacheEntry): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry satisfies CacheEntry))
  } catch {
    // A full or unavailable localStorage must never break the page.
  }
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
  'discussions',
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
          discussions: [],
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
