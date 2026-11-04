import type { WikitabCardData } from '../sections'
import {
  buildSavedFingerprint,
  isCacheBypassed,
  readCacheJsonUnlessBypassed,
  utcDayKey,
  writeCacheJson,
} from './wikitabCacheHelpers'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-daily-reads-cache-v5'

interface CacheEntry {
  day: string
  savedFingerprint: string
  items: WikitabCardData[]
  hasMore: boolean
}

export interface CachedDailyReads {
  items: WikitabCardData[]
  hasMore: boolean
  /** Fingerprint the cards were fetched under — may differ from live saves. */
  savedFingerprint: string
}

export const buildDailyReadsSavedFingerprint = buildSavedFingerprint

export { isCacheBypassed, utcDayKey }

/**
 * Read by UTC day only. A saved-fingerprint mismatch is not a miss — callers
 * keep the painted cards and surface a title refresh when live seeds diverge.
 */
export function readCachedDailyReads(day: string): CachedDailyReads | null {
  const entry = readCacheJsonUnlessBypassed(CACHE_KEY) as CacheEntry | null
  if (!entry || entry.day !== day || typeof entry.savedFingerprint !== 'string' || !entry.items) {
    return null
  }

  return {
    items: entry.items.map((item) => ({ ...item })),
    hasMore: entry.hasMore === true,
    savedFingerprint: entry.savedFingerprint,
  }
}

export function writeCachedDailyReads(
  day: string,
  savedFingerprint: string,
  items: WikitabCardData[],
  hasMore: boolean,
): void {
  writeCacheJson(CACHE_KEY, { day, savedFingerprint, items, hasMore } satisfies CacheEntry)
}
