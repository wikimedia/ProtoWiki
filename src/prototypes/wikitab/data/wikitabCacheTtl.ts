import type { WikitabSectionId } from '../sections'

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export const TRENDING_TTL_MS = HOUR_MS
export const NEWS_TTL_MS = 4 * HOUR_MS
export const DYK_TTL_MS = 4 * HOUR_MS
/** Active discussions — noticeboards. */
export const DISCUSSIONS_TTL_MS = 10 * MINUTE_MS
export const DISCUSSIONS_NOTICEBOARDS_TTL_MS = DISCUSSIONS_TTL_MS
/** Active discussions — saved-article talk pages. */
export const DISCUSSIONS_SAVED_TALK_TTL_MS = HOUR_MS
/** On this day — wall-clock TTL on top of UTC day key. */
export const OTD_TTL_MS = 4 * HOUR_MS
export const FEATURED_MODULE_TTL_MS = 4 * HOUR_MS
/** Safety net — primary invalidation is coord change (`nearbyCache` epsilon). */
export const NEARBY_TTL_MS = 4 * HOUR_MS
export const REVIEW_CHANGES_RISKY_TTL_MS = 10 * MINUTE_MS
export const REVIEW_CHANGES_SAVED_TTL_MS = HOUR_MS

export type FeedSliceTtlSectionId = Exclude<WikitabSectionId, never>

const FEED_SLICE_TTL_MS: Partial<Record<WikitabSectionId, number>> = {
  trending: TRENDING_TTL_MS,
  news: NEWS_TTL_MS,
  dyk: DYK_TTL_MS,
  otd: OTD_TTL_MS,
}

/** On this day + Birthdays miss when the UTC calendar day rolls. */
export function feedSliceRequiresUtcDay(sectionId: WikitabSectionId): boolean {
  return sectionId === 'births' || sectionId === 'otd'
}

export function feedSliceTtlMs(sectionId: WikitabSectionId): number | null {
  return FEED_SLICE_TTL_MS[sectionId] ?? null
}

export function isTimestampFresh(
  fetchedAt: number | undefined,
  ttlMs: number,
  now = Date.now(),
): boolean {
  if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return false
  return now - fetchedAt < ttlMs
}

/**
 * Freshness for a feed slice. Birthdays: UTC day only. On this day: UTC day +
 * 4 h TTL. Trending / News / DYK: wall-clock TTL only.
 */
export function isFeedSliceFreshByTimestamp(
  sectionId: WikitabSectionId,
  fetchedAt: number | undefined,
  cacheDay: string,
  currentDay: string,
  now = Date.now(),
): boolean {
  if (feedSliceRequiresUtcDay(sectionId)) {
    if (cacheDay !== currentDay || typeof fetchedAt !== 'number') return false
    const ttl = feedSliceTtlMs(sectionId)
    if (ttl == null) return true
    return isTimestampFresh(fetchedAt, ttl, now)
  }

  const ttl = feedSliceTtlMs(sectionId)
  if (ttl == null) return false
  return isTimestampFresh(fetchedAt, ttl, now)
}
