import type { WikitabCardData } from '../sections'
import { isCacheBypassed, utcDayKey } from './feedCache'

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

export function buildDailyReadsSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

export { isCacheBypassed }

/**
 * Read by UTC day only. A saved-fingerprint mismatch is not a miss — callers
 * keep the painted cards and surface a title refresh when live seeds diverge.
 */
export function readCachedDailyReads(day: string): CachedDailyReads | null {
  if (isCacheBypassed()) return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (entry?.day !== day || typeof entry.savedFingerprint !== 'string' || !entry.items) {
      return null
    }

    return {
      items: entry.items.map((item) => ({ ...item })),
      hasMore: entry.hasMore === true,
      savedFingerprint: entry.savedFingerprint,
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
