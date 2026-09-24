import type { WikitabCardData } from '../sections'
import { isCacheBypassed, utcDayKey } from './feedCache'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
const CACHE_KEY = 'wikitab-daily-reads-cache-v3'

interface CacheEntry {
  day: string
  savedFingerprint: string
  items: WikitabCardData[]
  hasMore: boolean
}

export interface CachedDailyReads {
  items: WikitabCardData[]
  hasMore: boolean
}

export function buildDailyReadsSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

export { isCacheBypassed }

export function readCachedDailyReads(
  day: string,
  savedFingerprint: string,
): CachedDailyReads | null {
  if (isCacheBypassed()) return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (entry?.day !== day || entry.savedFingerprint !== savedFingerprint || !entry.items) {
      return null
    }

    return {
      items: entry.items.map((item) => ({ ...item })),
      hasMore: entry.hasMore === true,
    }
  } catch {
    return null
  }
}

export function writeCachedDailyReads(
  day: string,
  savedFingerprint: string,
  items: WikitabCardData[],
  hasMore: boolean,
): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ day, savedFingerprint, items, hasMore } satisfies CacheEntry),
    )
  } catch {
    // A full or unavailable localStorage must never break the page.
  }
}

export { utcDayKey }
