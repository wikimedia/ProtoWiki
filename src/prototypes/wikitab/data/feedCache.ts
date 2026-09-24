import type { WikitabFeed, WikitabSectionId } from '../sections'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 *
 * A new tab page is opened dozens of times a day and `feed/featured` is a daily
 * resource, so the first open of a day fetches and every open after it paints
 * from this cache.
 */
const CACHE_KEY = 'wikitab-feed-cache-v19'

/** Active discussions can go stale within a day — shorter TTL than other slices. */
export const DISCUSSIONS_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  day: string
  feed: WikitabFeed
  sliceFetchedAt?: Partial<Record<'discussions', number>>
}

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

export function isDiscussionsSliceFresh(entry: CacheEntry, now = Date.now()): boolean {
  const fetchedAt = entry.sliceFetchedAt?.discussions
  if (typeof fetchedAt !== 'number') return false
  return now - fetchedAt < DISCUSSIONS_TTL_MS
}

export function readCachedSectionSlice(
  day: string,
  sectionId: WikitabSectionId,
): WikitabFeed[WikitabSectionId] | null {
  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return null

  const slice = entry.feed[sectionId]
  if (!slice?.length) return null

  if (sectionId === 'discussions' && !isDiscussionsSliceFresh(entry)) return null

  return slice
}

export function readCachedFeed(day: string): WikitabFeed | null {
  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return null

  const feed = { ...entry.feed }
  if (feed.discussions?.length && !isDiscussionsSliceFresh(entry)) {
    feed.discussions = []
  }

  return feed
}

/** Whether discussions were cached but have exceeded the TTL. */
export function isDiscussionsCacheStale(day: string): boolean {
  const entry = readRawCacheEntry()
  if (!entry || entry.day !== day) return false
  if (!entry.feed.discussions?.length) return false
  return !isDiscussionsSliceFresh(entry)
}

/** Storing a single entry means writing today's feed evicts every older day. */
function writeCacheEntry(entry: CacheEntry): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry satisfies CacheEntry))
  } catch {
    // A full or unavailable localStorage must never break the page.
  }
}

export function writeCachedFeed(day: string, feed: WikitabFeed, sliceFetchedAt?: CacheEntry['sliceFetchedAt']): void {
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

/**
 * Merge non-empty section slices into the day cache. Skips when Trending is
 * still empty so a later tab open can retry early-UTC gaps.
 */
export function persistPartialFeed(day: string, feed: WikitabFeed): void {
  if (isCacheBypassed()) return
  if (feed.trending.length === 0) return

  const existingEntry = readRawCacheEntry()
  const existing = existingEntry?.day === day ? existingEntry.feed : {
    trending: [],
    news: [],
    dyk: [],
    discussions: [],
    otd: [],
    births: [],
  }

  const merged = { ...existing }
  for (const key of FEED_SLICE_KEYS) {
    const slice = feed[key]
    if (slice?.length) merged[key] = slice
  }

  const sliceFetchedAt = { ...existingEntry?.sliceFetchedAt }
  if (feed.discussions?.length) {
    sliceFetchedAt.discussions = Date.now()
  }

  writeCacheEntry({ day, feed: merged, sliceFetchedAt })
}
