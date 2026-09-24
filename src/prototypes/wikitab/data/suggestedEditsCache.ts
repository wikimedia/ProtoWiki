import type { WikitabCardData } from '../sections'
import { isCacheBypassed, utcDayKey } from './feedCache'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
const CACHE_KEY = 'wikitab-suggested-edits-cache-v1'

interface CacheEntry {
  day: string
  savedFingerprint: string
  items: WikitabCardData[]
  hasMore: boolean
}

export interface CachedSuggestedEdits {
  items: WikitabCardData[]
  hasMore: boolean
}

export function buildSuggestedEditsSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

export { isCacheBypassed }

export function readCachedSuggestedEdits(
  day: string,
  savedFingerprint: string,
): CachedSuggestedEdits | null {
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

export function writeCachedSuggestedEdits(
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
