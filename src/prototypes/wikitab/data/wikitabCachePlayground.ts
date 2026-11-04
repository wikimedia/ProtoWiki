/**
 * Live cache rows for the card playground "Caches" tab.
 */
import {
  buildActiveDiscussionsSavedFingerprint,
  CACHE_KEY as ACTIVE_DISCUSSIONS_CACHE_KEY,
} from './activeDiscussionsCache'
import {
  buildDailyReadsSavedFingerprint,
  CACHE_KEY as DAILY_READS_CACHE_KEY,
} from './dailyReadsCache'
import { CACHE_KEY as FEATURED_CACHE_KEY } from './featuredCache'
import { CACHE_KEY as FEED_CACHE_KEY, isCacheBypassed, utcDayKey } from './feedCache'
import { CACHE_KEY as POTD_CACHE_KEY } from './fetchPictureOfTheDay'
import {
  buildReviewChangesSavedFingerprint,
  CACHE_KEY as REVIEW_CHANGES_CACHE_KEY,
} from './reviewChangesCache'
import { uniqueArticleSeedsFromSavedItems } from './savedCardHelpers'
import {
  buildSuggestedEditsSavedFingerprint,
  CACHE_KEY as SUGGESTED_EDITS_CACHE_KEY,
} from './suggestedEditsCache'
import { loadWikitabConfig } from './wikitabConfig'
import {
  DISCUSSIONS_NOTICEBOARDS_TTL_MS,
  DISCUSSIONS_SAVED_TALK_TTL_MS,
  FEATURED_MODULE_TTL_MS,
  NEARBY_TTL_MS,
  NEWS_TTL_MS,
  OTD_TTL_MS,
  REVIEW_CHANGES_RISKY_TTL_MS,
  REVIEW_CHANGES_SAVED_TTL_MS,
  TRENDING_TTL_MS,
  isTimestampFresh,
} from './wikitabCacheTtl'
import type { WikitabModuleId, WikitabSectionId } from '../sections'

/** Cache-row status chips — prefer these four over legacy leftovers. */
export type WikitabCacheFreshness =
  | 'up-to-date'
  | 'stale'
  | 'off'
  | 'invalid'
  | 'missing'
  | 'bypassed'

export interface WikitabCacheRow {
  id: string
  module: string
  storageKey: string
  /** Short invalidation summary for the table. */
  invalidates: string
  ttlLabel: string
  /** One or more chips — e.g. Up to date + Invalid + Turned off. */
  statuses: WikitabCacheFreshness[]
  remainingMs: number | null
  fetchedAt: number | null
}

/** Display order for stacked status chips. */
export const WIKITAB_CACHE_STATUS_ORDER: readonly WikitabCacheFreshness[] = [
  'up-to-date',
  'stale',
  'missing',
  'bypassed',
  'invalid',
  'off',
] as const

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function formatCacheRemaining(remainingMs: number | null): string {
  if (remainingMs == null) return '—'
  if (remainingMs <= 0) return 'expired'
  return formatDuration(remainingMs)
}

export function formatCacheAge(fetchedAt: number | null, now = Date.now()): string {
  if (fetchedAt == null) return '—'
  return formatDuration(now - fetchedAt)
}

function readJson(key: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function ttlLabel(ttlMs: number | null): string {
  if (ttlMs == null) return 'UTC day'
  if (ttlMs === TRENDING_TTL_MS || ttlMs === REVIEW_CHANGES_SAVED_TTL_MS) return '1 hour'
  if (
    ttlMs === FEATURED_MODULE_TTL_MS ||
    ttlMs === NEWS_TTL_MS ||
    ttlMs === NEARBY_TTL_MS
  ) {
    return '4 hours'
  }
  if (
    ttlMs === DISCUSSIONS_NOTICEBOARDS_TTL_MS ||
    ttlMs === REVIEW_CHANGES_RISKY_TTL_MS
  ) {
    return '10 minutes'
  }
  return `${Math.round(ttlMs / 60000)} min`
}

function isModuleHidden(moduleId: WikitabModuleId): boolean {
  try {
    return loadWikitabConfig().hiddenSectionIds.includes(moduleId)
  } catch {
    return false
  }
}

function liveSavedArticleFingerprint(
  build: (titleKeys: readonly string[]) => string,
): string {
  try {
    const seeds = uniqueArticleSeedsFromSavedItems(loadWikitabConfig().savedItems)
    return build(seeds.map((seed) => seed.titleKey))
  } catch {
    return ''
  }
}

function orderStatuses(statuses: Iterable<WikitabCacheFreshness>): WikitabCacheFreshness[] {
  const set = new Set(statuses)
  return WIKITAB_CACHE_STATUS_ORDER.filter((status) => set.has(status))
}

/** UTC midnight epoch ms for `YYYY-MM-DD`. */
function utcDayStartMs(day: string): number | null {
  const ms = Date.parse(`${day}T00:00:00.000Z`)
  return Number.isFinite(ms) ? ms : null
}

/** Exclusive end of that UTC calendar day (next midnight). */
function utcDayEndMs(day: string): number | null {
  const start = utcDayStartMs(day)
  return start == null ? null : start + 24 * 60 * 60 * 1000
}

/**
 * Stack independent flags: clock freshness, Invalid (seed/day), Turned off.
 * Day-only TTL (no wall-clock ms): remaining = until end of the UTC day;
 * age falls back to start of that UTC day when `fetchedAt` is missing.
 * @param dayKeyed — when true, a stored `day` ≠ today is Invalid.
 */
function statusFromFetchedAt(
  fetchedAt: number | undefined,
  ttlMs: number | null,
  options: {
    bypassed?: boolean
    /** Source or whole module disabled in settings. */
    turnedOff?: boolean
    /**
     * When set with `liveSavedFingerprint`, a mismatch adds **Invalid** (saved
     * seeds changed — title reload).
     */
    savedFingerprint?: string
    liveSavedFingerprint?: string
    dayKeyed?: boolean
    day?: string
    currentDay?: string
    /** Entry exists with payload even if fetchedAt is missing (legacy). */
    hasPayload?: boolean
  } = {},
  now = Date.now(),
): Pick<WikitabCacheRow, 'statuses' | 'remainingMs' | 'fetchedAt'> {
  const statuses: WikitabCacheFreshness[] = []
  let fetchedAtValue =
    typeof fetchedAt === 'number' && Number.isFinite(fetchedAt) ? fetchedAt : null

  const wrongDay =
    options.dayKeyed === true &&
    options.day != null &&
    options.currentDay != null &&
    options.day !== options.currentDay

  const savedMismatch =
    options.savedFingerprint != null &&
    options.liveSavedFingerprint != null &&
    options.savedFingerprint !== options.liveSavedFingerprint

  // Day-only caches: infer age from UTC midnight of the stored (or current) day.
  if (
    fetchedAtValue == null &&
    ttlMs == null &&
    options.dayKeyed &&
    options.hasPayload &&
    !options.bypassed
  ) {
    const ageDay = wrongDay ? options.day : options.day ?? options.currentDay
    if (ageDay) {
      const start = utcDayStartMs(ageDay)
      if (start != null) fetchedAtValue = start
    }
  }

  if (options.bypassed) {
    statuses.push('bypassed')
  } else if (wrongDay) {
    // Wrong calendar day — still Invalid below; clock chip omitted.
  } else if (fetchedAtValue == null && !options.hasPayload) {
    statuses.push('missing')
  } else if (ttlMs == null) {
    // Day-keyed (or other non-wall TTL): fresh for the calendar day.
    statuses.push(options.hasPayload || fetchedAtValue != null ? 'up-to-date' : 'missing')
  } else if (fetchedAtValue == null) {
    statuses.push(options.hasPayload ? 'up-to-date' : 'missing')
  } else if (isTimestampFresh(fetchedAtValue, ttlMs, now)) {
    statuses.push('up-to-date')
  } else {
    statuses.push('stale')
  }

  if (savedMismatch || wrongDay) {
    statuses.push('invalid')
  }

  if (options.turnedOff) {
    statuses.push('off')
  }

  let remainingMs: number | null = null
  if (!options.bypassed) {
    if (ttlMs != null && fetchedAtValue != null) {
      remainingMs = fetchedAtValue + ttlMs - now
    } else if (ttlMs == null && options.dayKeyed && (options.hasPayload || wrongDay)) {
      if (wrongDay) {
        remainingMs = 0
      } else {
        const endDay = options.currentDay ?? options.day
        const end = endDay ? utcDayEndMs(endDay) : null
        if (end != null) remainingMs = end - now
      }
    }
  }

  return {
    statuses: orderStatuses(statuses),
    remainingMs,
    fetchedAt: options.bypassed ? null : fetchedAtValue,
  }
}

function feedSliceRow(
  sectionId: WikitabSectionId,
  module: string,
  entry: Record<string, unknown> | null,
  options: {
    ttlMs: number | null
    invalidates: string
    dayKeyed: boolean
  },
  now: number,
  bypassed: boolean,
): WikitabCacheRow {
  const currentDay = utcDayKey()
  const day = typeof entry?.day === 'string' ? entry.day : undefined
  const feed = entry?.feed as Record<string, unknown[]> | undefined
  const slice = feed?.[sectionId]
  const hasPayload = Array.isArray(slice) && slice.length > 0
  const sliceFetchedAt = entry?.sliceFetchedAt as Record<string, number> | undefined
  const fetchedAt = sliceFetchedAt?.[sectionId]
  const status = statusFromFetchedAt(fetchedAt, options.ttlMs, {
    bypassed,
    turnedOff: isModuleHidden(sectionId),
    dayKeyed: options.dayKeyed,
    day,
    currentDay,
    hasPayload,
  }, now)

  return {
    id: `feed-${sectionId}`,
    module,
    storageKey: FEED_CACHE_KEY,
    invalidates: options.invalidates,
    ttlLabel: ttlLabel(options.ttlMs),
    ...status,
  }
}

export function snapshotWikitabCaches(now = Date.now()): WikitabCacheRow[] {
  const bypassed = isCacheBypassed()
  const currentDay = utcDayKey()
  const feedEntry = readJson(FEED_CACHE_KEY)
  const rows: WikitabCacheRow[] = []

  rows.push(
    feedSliceRow(
      'trending',
      'Trending',
      feedEntry,
      { ttlMs: TRENDING_TTL_MS, invalidates: '1h TTL', dayKeyed: false },
      now,
      bypassed,
    ),
    feedSliceRow(
      'news',
      'In the news',
      feedEntry,
      { ttlMs: NEWS_TTL_MS, invalidates: '4h TTL', dayKeyed: false },
      now,
      bypassed,
    ),
    feedSliceRow(
      'dyk',
      'Did you know',
      feedEntry,
      { ttlMs: NEWS_TTL_MS, invalidates: '4h TTL', dayKeyed: false },
      now,
      bypassed,
    ),
    feedSliceRow(
      'otd',
      'On this day',
      feedEntry,
      { ttlMs: OTD_TTL_MS, invalidates: 'UTC day · 4h TTL', dayKeyed: true },
      now,
      bypassed,
    ),
    feedSliceRow(
      'births',
      'Birthdays',
      feedEntry,
      { ttlMs: null, invalidates: 'UTC day', dayKeyed: true },
      now,
      bypassed,
    ),
  )

  {
    const entry = readJson(FEATURED_CACHE_KEY)
    const day = typeof entry?.day === 'string' ? entry.day : undefined
    const fetchedAt = typeof entry?.fetchedAt === 'number' ? entry.fetchedAt : undefined
    const items = Array.isArray(entry?.items) ? entry.items : []
    const status = statusFromFetchedAt(fetchedAt, FEATURED_MODULE_TTL_MS, {
      bypassed,
      turnedOff: isModuleHidden('featured'),
      dayKeyed: true,
      day,
      currentDay,
      hasPayload: items.length > 0,
    }, now)
    rows.push({
      id: 'featured',
      module: 'Featured',
      storageKey: FEATURED_CACHE_KEY,
      invalidates: 'UTC day · 4h TTL',
      ttlLabel: ttlLabel(FEATURED_MODULE_TTL_MS),
      ...status,
    })
  }

  {
    const entry = readJson(DAILY_READS_CACHE_KEY)
    const day = typeof entry?.day === 'string' ? entry.day : undefined
    const items = Array.isArray(entry?.items) ? entry.items : []
    const savedFingerprint =
      typeof entry?.savedFingerprint === 'string' ? entry.savedFingerprint : undefined
    const status = statusFromFetchedAt(undefined, null, {
      bypassed,
      turnedOff: isModuleHidden('daily-reads'),
      savedFingerprint,
      liveSavedFingerprint: liveSavedArticleFingerprint(buildDailyReadsSavedFingerprint),
      dayKeyed: true,
      day,
      currentDay,
      hasPayload: entry != null && day != null,
    }, now)
    rows.push({
      id: 'daily-reads',
      module: 'Daily reads',
      storageKey: DAILY_READS_CACHE_KEY,
      invalidates: 'UTC day · saved seeds (title reload)',
      ttlLabel: ttlLabel(null),
      ...status,
    })
    void items
  }

  {
    const entry = readJson(SUGGESTED_EDITS_CACHE_KEY)
    const day = typeof entry?.day === 'string' ? entry.day : undefined
    const savedFingerprint =
      typeof entry?.savedFingerprint === 'string' ? entry.savedFingerprint : undefined
    const status = statusFromFetchedAt(undefined, null, {
      bypassed,
      turnedOff: isModuleHidden('suggested-edits'),
      savedFingerprint,
      liveSavedFingerprint: liveSavedArticleFingerprint(buildSuggestedEditsSavedFingerprint),
      dayKeyed: true,
      day,
      currentDay,
      hasPayload: entry != null && day != null,
    }, now)
    rows.push({
      id: 'help-wanted',
      module: 'Suggested edits',
      storageKey: SUGGESTED_EDITS_CACHE_KEY,
      invalidates: 'UTC day · saved seeds (title reload)',
      ttlLabel: ttlLabel(null),
      ...status,
    })
  }

  {
    const entry = readJson(ACTIVE_DISCUSSIONS_CACHE_KEY)
    const config = loadWikitabConfig()
    const moduleOff = isModuleHidden('discussions')
    const noticeboards = Array.isArray(entry?.noticeboards) ? entry.noticeboards : []
    const articles = Array.isArray(entry?.articles) ? entry.articles : []
    const legacyFetchedAt =
      typeof entry?.fetchedAt === 'number' ? entry.fetchedAt : undefined
    const fetchedAtNoticeboards =
      typeof entry?.fetchedAtNoticeboards === 'number'
        ? entry.fetchedAtNoticeboards
        : legacyFetchedAt
    const fetchedAtArticles =
      typeof entry?.fetchedAtArticles === 'number'
        ? entry.fetchedAtArticles
        : legacyFetchedAt
    const savedFingerprint =
      typeof entry?.savedFingerprint === 'string' ? entry.savedFingerprint : undefined
    const liveTalkFingerprint = liveSavedArticleFingerprint(
      buildActiveDiscussionsSavedFingerprint,
    )

    rows.push({
      id: 'active-discussions-noticeboards',
      module: 'Active discussions · noticeboards',
      storageKey: ACTIVE_DISCUSSIONS_CACHE_KEY,
      invalidates: 'settings',
      ttlLabel: ttlLabel(DISCUSSIONS_NOTICEBOARDS_TTL_MS),
      ...statusFromFetchedAt(fetchedAtNoticeboards, DISCUSSIONS_NOTICEBOARDS_TTL_MS, {
        bypassed,
        turnedOff: moduleOff || !config.discussionsShowNoticeboards,
        dayKeyed: false,
        hasPayload: noticeboards.length > 0 || fetchedAtNoticeboards != null,
      }, now),
    })
    rows.push({
      id: 'active-discussions-talk',
      module: 'Active discussions · talk',
      storageKey: ACTIVE_DISCUSSIONS_CACHE_KEY,
      invalidates: 'settings · saved seeds (title reload)',
      ttlLabel: ttlLabel(DISCUSSIONS_SAVED_TALK_TTL_MS),
      ...statusFromFetchedAt(fetchedAtArticles, DISCUSSIONS_SAVED_TALK_TTL_MS, {
        bypassed,
        turnedOff: moduleOff || !config.discussionsShowSavedTalk,
        savedFingerprint,
        liveSavedFingerprint: liveTalkFingerprint,
        dayKeyed: false,
        hasPayload: articles.length > 0 || fetchedAtArticles != null,
      }, now),
    })
  }

  {
    const entry = readJson(REVIEW_CHANGES_CACHE_KEY)
    const config = loadWikitabConfig()
    const moduleOff = isModuleHidden('review-changes')
    const items = Array.isArray(entry?.items) ? entry.items : []
    const fetchedAtSaved =
      typeof entry?.fetchedAtSaved === 'number' ? entry.fetchedAtSaved : undefined
    const fetchedAtRisky =
      typeof entry?.fetchedAtRisky === 'number' ? entry.fetchedAtRisky : undefined
    const hasPayload = entry != null && items.length > 0
    const savedFingerprint =
      typeof entry?.savedFingerprint === 'string' ? entry.savedFingerprint : undefined
    const liveSavedFingerprint = liveSavedArticleFingerprint(buildReviewChangesSavedFingerprint)

    rows.push({
      id: 'recent-edits-saved',
      module: 'Recent edits · saved',
      storageKey: REVIEW_CHANGES_CACHE_KEY,
      invalidates: 'settings · saved seeds (title reload)',
      ttlLabel: ttlLabel(REVIEW_CHANGES_SAVED_TTL_MS),
      ...statusFromFetchedAt(fetchedAtSaved, REVIEW_CHANGES_SAVED_TTL_MS, {
        bypassed,
        turnedOff: moduleOff || !config.reviewChangesShowSavedEdits,
        savedFingerprint,
        liveSavedFingerprint,
        dayKeyed: false,
        hasPayload: hasPayload || fetchedAtSaved != null,
      }, now),
    })
    rows.push({
      id: 'recent-edits-risky',
      module: 'Recent edits · risky',
      storageKey: REVIEW_CHANGES_CACHE_KEY,
      invalidates: 'settings',
      ttlLabel: ttlLabel(REVIEW_CHANGES_RISKY_TTL_MS),
      ...statusFromFetchedAt(fetchedAtRisky, REVIEW_CHANGES_RISKY_TTL_MS, {
        bypassed,
        turnedOff: moduleOff || !config.reviewChangesShowRecentRiskyEdits,
        dayKeyed: false,
        hasPayload: hasPayload || fetchedAtRisky != null,
      }, now),
    })
  }

  {
    let nearby: { fetchedAt?: number; items?: unknown[] } | null = null
    try {
      nearby = loadWikitabConfig().nearbyCardsCache
    } catch {
      nearby = null
    }
    const fetchedAt = typeof nearby?.fetchedAt === 'number' ? nearby.fetchedAt : undefined
    const items = Array.isArray(nearby?.items) ? nearby.items : []
    const status = statusFromFetchedAt(fetchedAt, NEARBY_TTL_MS, {
      bypassed,
      turnedOff: isModuleHidden('nearby'),
      dayKeyed: false,
      hasPayload: nearby != null && items.length > 0,
    }, now)
    rows.push({
      id: 'nearby',
      module: 'Nearby',
      storageKey: 'config.nearbyCardsCache',
      invalidates: 'coord change · 4h TTL',
      ttlLabel: ttlLabel(NEARBY_TTL_MS),
      ...status,
    })
  }

  {
    const entry = readJson(POTD_CACHE_KEY)
    const day = typeof entry?.day === 'string' ? entry.day : undefined
    const status = statusFromFetchedAt(undefined, null, {
      bypassed,
      dayKeyed: true,
      day,
      currentDay,
      hasPayload: entry?.potd != null && day != null,
    }, now)
    rows.push({
      id: 'potd',
      module: 'Picture of the day',
      storageKey: POTD_CACHE_KEY,
      invalidates: 'UTC day',
      ttlLabel: ttlLabel(null),
      ...status,
    })
  }

  return rows
}

const FRESHNESS_FILTER_LABELS: Record<WikitabCacheFreshness, string> = {
  'up-to-date': 'Up to date',
  stale: 'Stale',
  off: 'Turned off',
  invalid: 'Invalid',
  missing: 'Missing',
  bypassed: 'Bypassed',
}

export function cacheRowMatchesFilter(row: WikitabCacheRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    row.module,
    row.storageKey,
    row.invalidates,
    ...row.statuses,
    ...row.statuses.map((status) => FRESHNESS_FILTER_LABELS[status]),
    row.ttlLabel,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}
