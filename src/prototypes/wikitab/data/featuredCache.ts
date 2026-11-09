import type { WikitabFeaturedSpotlight } from '../sections'
import {
  isCacheBypassed,
  readCacheJsonUnlessBypassed,
  removeCacheJson,
  utcDayKey,
  wikitabCacheKey,
  writeCacheJson,
} from './wikitabCacheHelpers'
import { FEATURED_MODULE_TTL_MS, isTimestampFresh } from './wikitabCacheTtl'

export const CACHE_KEY = 'wikitab-featured-cache-v21'

interface CacheEntry {
  day: string
  items: WikitabFeaturedSpotlight[]
  fetchedAt: number
}

export interface CachedFeatured {
  items: WikitabFeaturedSpotlight[]
  fetchedAt: number
}

/** In-memory copy for this page load — tagged with its language like the stored key. */
let sessionEntry: (CacheEntry & { lang: string }) | null = null

export function readCachedFeaturedEntry(lang: string, day: string): CachedFeatured | null {
  if (isCacheBypassed()) return null

  if (sessionEntry?.lang === lang && sessionEntry.day === day && sessionEntry.items.length) {
    return {
      items: sessionEntry.items.map((item) => ({ ...item })),
      fetchedAt: sessionEntry.fetchedAt,
    }
  }

  const entry = readCacheJsonUnlessBypassed(wikitabCacheKey(CACHE_KEY, lang)) as CacheEntry | null
  if (!entry || entry.day !== day || !Array.isArray(entry.items) || !entry.items.length) {
    return null
  }

  const fetchedAt =
    typeof entry.fetchedAt === 'number' && Number.isFinite(entry.fetchedAt) ? entry.fetchedAt : 0

  sessionEntry = { lang, day, items: entry.items, fetchedAt }
  return {
    items: entry.items.map((item) => ({ ...item })),
    fetchedAt,
  }
}

export function readCachedFeatured(lang: string, day: string): WikitabFeaturedSpotlight[] | null {
  return readCachedFeaturedEntry(lang, day)?.items ?? null
}

export function isFeaturedCacheFresh(fetchedAt: number, now = Date.now()): boolean {
  return isTimestampFresh(fetchedAt, FEATURED_MODULE_TTL_MS, now)
}

export function writeCachedFeatured(
  lang: string,
  day: string,
  items: WikitabFeaturedSpotlight[],
  fetchedAt = Date.now(),
): void {
  sessionEntry = { lang, day, items, fetchedAt }
  writeCacheJson(wikitabCacheKey(CACHE_KEY, lang), { day, items, fetchedAt } satisfies CacheEntry)
}

export function clearCachedFeatured(lang: string): void {
  if (sessionEntry?.lang === lang) sessionEntry = null
  removeCacheJson(wikitabCacheKey(CACHE_KEY, lang))
}

export { isCacheBypassed, utcDayKey }
