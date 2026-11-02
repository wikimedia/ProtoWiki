import type { WikitabSectionId } from '../sections'

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export const TRENDING_TTL_MS = HOUR_MS
export const NEWS_TTL_MS = 4 * HOUR_MS
export const DYK_TTL_MS = 4 * HOUR_MS
export const DISCUSSIONS_TTL_MS = 10 * MINUTE_MS
export const OTD_TTL_MS = 4 * HOUR_MS
export const FEATURED_MODULE_TTL_MS = 4 * HOUR_MS
export const NEARBY_TTL_MS = 30 * MINUTE_MS
export const REVIEW_CHANGES_RISKY_TTL_MS = 10 * MINUTE_MS
export const REVIEW_CHANGES_SAVED_TTL_MS = HOUR_MS

export type FeedSliceTtlSectionId = Exclude<WikitabSectionId, never>

const FEED_SLICE_TTL_MS: Partial<Record<WikitabSectionId, number>> = {
  trending: TRENDING_TTL_MS,
  news: NEWS_TTL_MS,
  dyk: DYK_TTL_MS,
  discussions: DISCUSSIONS_TTL_MS,
  otd: OTD_TTL_MS,
}

export function feedSliceTtlMs(sectionId: WikitabSectionId): number | null {
  if (sectionId === 'births') return null
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

/** Birthdays refresh on UTC day rollover only — handled via cache `day` key. */
export function isFeedSliceFreshByTimestamp(
  sectionId: WikitabSectionId,
  fetchedAt: number | undefined,
  cacheDay: string,
  currentDay: string,
  now = Date.now(),
): boolean {
  if (sectionId === 'births') {
    return cacheDay === currentDay && typeof fetchedAt === 'number'
  }

  const ttl = feedSliceTtlMs(sectionId)
  if (ttl == null) return false
  return isTimestampFresh(fetchedAt, ttl, now)
}
