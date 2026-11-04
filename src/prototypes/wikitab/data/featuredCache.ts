import type { WikitabFeaturedSpotlight } from '../sections'
import {
  isCacheBypassed,
  readCacheJsonUnlessBypassed,
  removeCacheJson,
  utcDayKey,
  writeCacheJson,
} from './wikitabCacheHelpers'
import { FEATURED_MODULE_TTL_MS, isTimestampFresh } from './wikitabCacheTtl'

export const CACHE_KEY = 'wikitab-featured-cache-v20'

interface CacheEntry {
  day: string
  items: WikitabFeaturedSpotlight[]
  fetchedAt: number
}

export interface CachedFeatured {
  items: WikitabFeaturedSpotlight[]
  fetchedAt: number
}

let sessionEntry: CacheEntry | null = null

export function readCachedFeaturedEntry(day: string): CachedFeatured | null {
  if (isCacheBypassed()) return null

  if (sessionEntry?.day === day && sessionEntry.items.length) {
    return {
      items: sessionEntry.items.map((item) => ({ ...item })),
      fetchedAt: sessionEntry.fetchedAt,
    }
  }

  const entry = readCacheJsonUnlessBypassed(CACHE_KEY) as CacheEntry | null
  if (!entry || entry.day !== day || !Array.isArray(entry.items) || !entry.items.length) {
    return null
  }

  const fetchedAt =
    typeof entry.fetchedAt === 'number' && Number.isFinite(entry.fetchedAt) ? entry.fetchedAt : 0

  sessionEntry = { day, items: entry.items, fetchedAt }
  return {
    items: entry.items.map((item) => ({ ...item })),
    fetchedAt,
  }
}

export function readCachedFeatured(day: string): WikitabFeaturedSpotlight[] | null {
  return readCachedFeaturedEntry(day)?.items ?? null
}

export function isFeaturedCacheFresh(fetchedAt: number, now = Date.now()): boolean {
  return isTimestampFresh(fetchedAt, FEATURED_MODULE_TTL_MS, now)
}

export function writeCachedFeatured(
  day: string,
  items: WikitabFeaturedSpotlight[],
  fetchedAt = Date.now(),
): void {
  sessionEntry = { day, items, fetchedAt }
  writeCacheJson(CACHE_KEY, { day, items, fetchedAt } satisfies CacheEntry)
}

export function clearCachedFeatured(): void {
  sessionEntry = null
  removeCacheJson(CACHE_KEY)
}

export { isCacheBypassed, utcDayKey }
