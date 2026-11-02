import type { WikitabSearchActivityItem } from './fetchWikitabSearchActivity'
import { isCacheBypassed, utcDayKey } from './feedCache'
import {
  isTimestampFresh,
  REVIEW_CHANGES_RISKY_TTL_MS,
  REVIEW_CHANGES_SAVED_TTL_MS,
} from './wikitabCacheTtl'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-review-changes-cache-v4'

interface CacheEntry {
  day: string
  savedFingerprint: string
  settingsFingerprint: string
  items: WikitabSearchActivityItem[]
  hasMore: boolean
  fetchedAtSaved?: number
  fetchedAtRisky?: number
}

export interface CachedReviewChanges {
  items: WikitabSearchActivityItem[]
  hasMore: boolean
  fetchedAtSaved?: number
  fetchedAtRisky?: number
}

export function buildReviewChangesSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

export function buildReviewChangesSettingsFingerprint(options: {
  showSavedEdits: boolean
  showRecentRiskyEdits: boolean
}): string {
  return `${options.showSavedEdits ? '1' : '0'}${options.showRecentRiskyEdits ? '1' : '0'}`
}

export { isCacheBypassed }

function dedupeCachedItems(items: WikitabSearchActivityItem[]): WikitabSearchActivityItem[] {
  const seen = new Set<number>()
  const deduped: WikitabSearchActivityItem[] = []

  for (const item of items) {
    if (seen.has(item.revisionId)) continue
    seen.add(item.revisionId)
    deduped.push(item)
  }

  return deduped
}

export function readCachedReviewChanges(
  day: string,
  savedFingerprint: string,
  settingsFingerprint: string,
): CachedReviewChanges | null {
  if (isCacheBypassed()) return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (
      entry?.day !== day ||
      entry.savedFingerprint !== savedFingerprint ||
      entry.settingsFingerprint !== settingsFingerprint ||
      !entry.items
    ) {
      return null
    }

    return {
      items: dedupeCachedItems(entry.items.map((item) => ({ ...item }))),
      hasMore: entry.hasMore === true,
      fetchedAtSaved: entry.fetchedAtSaved,
      fetchedAtRisky: entry.fetchedAtRisky,
    }
  } catch {
    return null
  }
}

export function isReviewChangesSavedCacheFresh(
  fetchedAt: number | undefined,
  now = Date.now(),
): boolean {
  return isTimestampFresh(fetchedAt, REVIEW_CHANGES_SAVED_TTL_MS, now)
}

export function isReviewChangesRiskyCacheFresh(
  fetchedAt: number | undefined,
  now = Date.now(),
): boolean {
  return isTimestampFresh(fetchedAt, REVIEW_CHANGES_RISKY_TTL_MS, now)
}

export function writeCachedReviewChanges(
  day: string,
  savedFingerprint: string,
  settingsFingerprint: string,
  items: WikitabSearchActivityItem[],
  hasMore: boolean,
  fetchedAt?: { saved?: number; risky?: number },
): void {
  try {
    const existingRaw = window.localStorage.getItem(CACHE_KEY)
    let fetchedAtSaved = fetchedAt?.saved
    let fetchedAtRisky = fetchedAt?.risky

    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as CacheEntry
        if (
          existing.day === day &&
          existing.savedFingerprint === savedFingerprint &&
          existing.settingsFingerprint === settingsFingerprint
        ) {
          if (fetchedAtSaved === undefined) fetchedAtSaved = existing.fetchedAtSaved
          if (fetchedAtRisky === undefined) fetchedAtRisky = existing.fetchedAtRisky
        }
      } catch {
        // ignore
      }
    }

    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        day,
        savedFingerprint,
        settingsFingerprint,
        items,
        hasMore,
        fetchedAtSaved,
        fetchedAtRisky,
      } satisfies CacheEntry),
    )
  } catch {
    // A full or unavailable localStorage must never break the page.
  }
}

export { utcDayKey }
