import type { WikitabSearchActivityItem } from './fetchWikitabSearchActivity'
import {
  buildSavedFingerprint,
  buildSettingsFingerprint,
  isCacheBypassed,
  readCacheJson,
  readCacheJsonUnlessBypassed,
  utcDayKey,
  wikitabCacheKey,
  writeCacheJson,
} from './wikitabCacheHelpers'
import {
  isTimestampFresh,
  REVIEW_CHANGES_RISKY_TTL_MS,
  REVIEW_CHANGES_SAVED_TTL_MS,
} from './wikitabCacheTtl'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-review-changes-cache-v5'

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
  /** Fingerprint the cards were fetched under — may differ from live saves. */
  savedFingerprint: string
  fetchedAtSaved?: number
  fetchedAtRisky?: number
}

export const buildReviewChangesSavedFingerprint = buildSavedFingerprint

export function buildReviewChangesSettingsFingerprint(options: {
  showSavedEdits: boolean
  showRecentRiskyEdits: boolean
}): string {
  return buildSettingsFingerprint([options.showSavedEdits, options.showRecentRiskyEdits])
}

export { isCacheBypassed, utcDayKey }

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

/**
 * Read by UTC day + settings fingerprint. A saved-fingerprint mismatch is not a
 * miss — callers keep the painted cards and surface a title refresh when live
 * seeds diverge. Settings mismatch still misses (toggles change the feed shape).
 */
export function readCachedReviewChanges(
  lang: string,
  day: string,
  settingsFingerprint: string,
): CachedReviewChanges | null {
  const entry = readCacheJsonUnlessBypassed(wikitabCacheKey(CACHE_KEY, lang)) as CacheEntry | null
  if (
    !entry ||
    entry.day !== day ||
    typeof entry.savedFingerprint !== 'string' ||
    entry.settingsFingerprint !== settingsFingerprint ||
    !entry.items
  ) {
    return null
  }

  return {
    items: dedupeCachedItems(entry.items.map((item) => ({ ...item }))),
    hasMore: entry.hasMore === true,
    savedFingerprint: entry.savedFingerprint,
    fetchedAtSaved: entry.fetchedAtSaved,
    fetchedAtRisky: entry.fetchedAtRisky,
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
  lang: string,
  day: string,
  savedFingerprint: string,
  settingsFingerprint: string,
  items: WikitabSearchActivityItem[],
  hasMore: boolean,
  fetchedAt?: { saved?: number; risky?: number },
): void {
  let fetchedAtSaved = fetchedAt?.saved
  let fetchedAtRisky = fetchedAt?.risky

  const existing = readCacheJson(wikitabCacheKey(CACHE_KEY, lang)) as CacheEntry | null
  if (
    existing &&
    existing.day === day &&
    existing.savedFingerprint === savedFingerprint &&
    existing.settingsFingerprint === settingsFingerprint
  ) {
    if (fetchedAtSaved === undefined) fetchedAtSaved = existing.fetchedAtSaved
    if (fetchedAtRisky === undefined) fetchedAtRisky = existing.fetchedAtRisky
  }

  writeCacheJson(wikitabCacheKey(CACHE_KEY, lang), {
    day,
    savedFingerprint,
    settingsFingerprint,
    items,
    hasMore,
    fetchedAtSaved,
    fetchedAtRisky,
  } satisfies CacheEntry)
}
