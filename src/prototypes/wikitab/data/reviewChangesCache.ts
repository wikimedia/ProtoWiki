import type { WikitabSearchActivityItem } from './fetchWikitabSearchActivity'
import { isCacheBypassed, utcDayKey } from './feedCache'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
const CACHE_KEY = 'wikitab-review-changes-cache-v1'

interface CacheEntry {
  day: string
  savedFingerprint: string
  items: WikitabSearchActivityItem[]
  hasMore: boolean
}

export interface CachedReviewChanges {
  items: WikitabSearchActivityItem[]
  hasMore: boolean
}

export function buildReviewChangesSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

export { isCacheBypassed }

function dedupeCachedItems(items: WikitabSearchActivityItem[]): WikitabSearchActivityItem[] {
  const seen = new Set<number>()
  const deduped: WikitabSearchActivityItem[] = []

  for (const item of items) {
    if (seen.has(item.revid)) continue
    seen.add(item.revid)
    deduped.push(item)
  }

  return deduped
}

export function readCachedReviewChanges(
  day: string,
  savedFingerprint: string,
): CachedReviewChanges | null {
  if (isCacheBypassed()) return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (entry?.day !== day || entry.savedFingerprint !== savedFingerprint || !entry.items) {
      return null
    }

    return {
      items: dedupeCachedItems(entry.items.map((item) => ({ ...item }))),
      hasMore: entry.hasMore === true,
    }
  } catch {
    return null
  }
}

export function writeCachedReviewChanges(
  day: string,
  savedFingerprint: string,
  items: WikitabSearchActivityItem[],
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
