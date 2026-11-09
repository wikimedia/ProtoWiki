/**
 * Live cache rows for the card playground "Caches" tab.
 *
 * Storage keys and row metadata come from `wikitabCacheRegistry` — keep
 * dual-source / Nearby status logic here; do not invent a second key list.
 */
import { buildActiveDiscussionsSavedFingerprint } from './activeDiscussionsCache'
import { buildDailyReadsSavedFingerprint } from './dailyReadsCache'
import { isCacheBypassed, readCacheJson, utcDayKey } from './wikitabCacheHelpers'
import {
  WIKITAB_ACTIVE_DISCUSSIONS_PLAYGROUND_ROWS,
  WIKITAB_FEED_PLAYGROUND_SLICES,
  WIKITAB_NEARBY_PLAYGROUND,
  WIKITAB_REVIEW_CHANGES_PLAYGROUND_ROWS,
  WIKITAB_SIMPLE_PLAYGROUND_MODULES,
  wikitabCacheStorageKey,
  type WikitabDualSourcePlaygroundRow,
  type WikitabSimplePlaygroundModule,
} from './wikitabCacheRegistry'
import {
  DISCUSSIONS_NOTICEBOARDS_TTL_MS,
  FEATURED_MODULE_TTL_MS,
  NEARBY_TTL_MS,
  NEWS_TTL_MS,
  REVIEW_CHANGES_RISKY_TTL_MS,
  REVIEW_CHANGES_SAVED_TTL_MS,
  TRENDING_TTL_MS,
  isTimestampFresh,
} from './wikitabCacheTtl'
import { buildReviewChangesSavedFingerprint } from './reviewChangesCache'
import {
  savedArticleSeedFingerprintKey,
  uniqueArticleSeedsFromSavedItems,
} from './savedCardHelpers'
import { buildSuggestedEditsSavedFingerprint } from './suggestedEditsCache'
import { loadWikitabConfig } from './wikitabConfig'
import { WIKITAB_LANGUAGE } from './wikitabLanguage'
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
    return build(seeds.map(savedArticleSeedFingerprintKey))
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

function asCacheRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
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
  storageKey: string,
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
    storageKey,
    invalidates: options.invalidates,
    ttlLabel: ttlLabel(options.ttlMs),
    ...status,
  }
}

function fingerprintBuilderForRegistry(
  registryId: WikitabSimplePlaygroundModule['registryId'] | 'active-discussions' | 'review-changes',
): ((titleKeys: readonly string[]) => string) | null {
  switch (registryId) {
    case 'daily-reads':
      return buildDailyReadsSavedFingerprint
    case 'suggested-edits':
      return buildSuggestedEditsSavedFingerprint
    case 'active-discussions':
      return buildActiveDiscussionsSavedFingerprint
    case 'review-changes':
      return buildReviewChangesSavedFingerprint
    default:
      return null
  }
}

function simpleModuleRow(
  spec: WikitabSimplePlaygroundModule,
  now: number,
  bypassed: boolean,
  currentDay: string,
): WikitabCacheRow {
  const storageKey =
    spec.storageKey ?? wikitabCacheStorageKey(spec.registryId, WIKITAB_LANGUAGE) ?? ''
  const entry = asCacheRecord(readCacheJson(storageKey))
  const day = typeof entry?.day === 'string' ? entry.day : undefined
  const items = Array.isArray(entry?.items) ? entry.items : []
  const hasPayload =
    spec.payload === 'potd'
      ? entry?.potd != null && day != null
      : spec.id === 'daily-reads' || spec.id === 'help-wanted'
        ? entry != null && day != null
        : items.length > 0

  const fetchedAt =
    typeof entry?.fetchedAt === 'number' ? entry.fetchedAt : undefined
  const savedFingerprint =
    typeof entry?.savedFingerprint === 'string' ? entry.savedFingerprint : undefined
  const fingerprintBuild = spec.savedFingerprint
    ? fingerprintBuilderForRegistry(spec.registryId)
    : null

  const status = statusFromFetchedAt(fetchedAt, spec.ttlMs, {
    bypassed,
    turnedOff: spec.moduleId ? isModuleHidden(spec.moduleId) : false,
    savedFingerprint: spec.savedFingerprint ? savedFingerprint : undefined,
    liveSavedFingerprint: fingerprintBuild
      ? liveSavedArticleFingerprint(fingerprintBuild)
      : undefined,
    dayKeyed: spec.dayKeyed,
    day,
    currentDay,
    hasPayload,
  }, now)

  return {
    id: spec.id,
    module: spec.module,
    storageKey,
    invalidates: spec.invalidates,
    ttlLabel: ttlLabel(spec.ttlMs),
    ...status,
  }
}

function dualSourceRows(
  registryId: 'active-discussions' | 'review-changes',
  moduleId: WikitabModuleId,
  specs: readonly WikitabDualSourcePlaygroundRow[],
  now: number,
  bypassed: boolean,
): WikitabCacheRow[] {
  const storageKey = wikitabCacheStorageKey(registryId, WIKITAB_LANGUAGE) ?? ''
  const entry = asCacheRecord(readCacheJson(storageKey))
  const config = loadWikitabConfig()
  const moduleOff = isModuleHidden(moduleId)
  const items = Array.isArray(entry?.items) ? entry.items : []
  const fingerprintBuild = fingerprintBuilderForRegistry(registryId)
  const liveFingerprint = fingerprintBuild
    ? liveSavedArticleFingerprint(fingerprintBuild)
    : ''
  const savedFingerprint =
    typeof entry?.savedFingerprint === 'string' ? entry.savedFingerprint : undefined

  return specs.map((spec) => {
    const legacy =
      spec.legacyFetchedAtField && typeof entry?.[spec.legacyFetchedAtField] === 'number'
        ? (entry[spec.legacyFetchedAtField] as number)
        : undefined
    const fetchedAt =
      typeof entry?.[spec.fetchedAtField] === 'number'
        ? (entry[spec.fetchedAtField] as number)
        : legacy

    let hasPayload = fetchedAt != null
    if (spec.payloadField === 'items') {
      hasPayload = (entry != null && items.length > 0) || fetchedAt != null
    } else if (spec.payloadField) {
      const payload = entry?.[spec.payloadField]
      hasPayload = (Array.isArray(payload) && payload.length > 0) || fetchedAt != null
    }

    const sourceOff = spec.sourceEnabled ? !spec.sourceEnabled(config) : false

    return {
      id: spec.id,
      module: spec.module,
      storageKey,
      invalidates: spec.invalidates,
      ttlLabel: ttlLabel(spec.ttlMs),
      ...statusFromFetchedAt(fetchedAt, spec.ttlMs, {
        bypassed,
        turnedOff: moduleOff || sourceOff,
        savedFingerprint: spec.savedFingerprint ? savedFingerprint : undefined,
        liveSavedFingerprint: spec.savedFingerprint ? liveFingerprint : undefined,
        dayKeyed: false,
        hasPayload,
      }, now),
    }
  })
}

export function snapshotWikitabCaches(now = Date.now()): WikitabCacheRow[] {
  const bypassed = isCacheBypassed()
  const currentDay = utcDayKey()
  const feedKey = wikitabCacheStorageKey('feed', WIKITAB_LANGUAGE) ?? ''
  const feedEntry = asCacheRecord(readCacheJson(feedKey))
  const rows: WikitabCacheRow[] = []

  for (const slice of WIKITAB_FEED_PLAYGROUND_SLICES) {
    rows.push(
      feedSliceRow(
        slice.sectionId,
        slice.module,
        feedEntry,
        {
          ttlMs: slice.ttlMs,
          invalidates: slice.invalidates,
          dayKeyed: slice.dayKeyed,
        },
        now,
        bypassed,
        feedKey,
      ),
    )
  }

  const simpleById = new Map(
    WIKITAB_SIMPLE_PLAYGROUND_MODULES.map((spec) => [spec.id, spec] as const),
  )
  for (const id of ['featured', 'daily-reads', 'help-wanted'] as const) {
    const spec = simpleById.get(id)
    if (spec) rows.push(simpleModuleRow(spec, now, bypassed, currentDay))
  }

  rows.push(
    ...dualSourceRows(
      'active-discussions',
      'discussions',
      WIKITAB_ACTIVE_DISCUSSIONS_PLAYGROUND_ROWS,
      now,
      bypassed,
    ),
    ...dualSourceRows(
      'review-changes',
      'review-changes',
      WIKITAB_REVIEW_CHANGES_PLAYGROUND_ROWS,
      now,
      bypassed,
    ),
  )

  {
    let nearby: { fetchedAt?: number; items?: unknown[] } | null = null
    try {
      nearby = loadWikitabConfig().nearbyCardsCache[WIKITAB_LANGUAGE] ?? null
    } catch {
      nearby = null
    }
    const fetchedAt = typeof nearby?.fetchedAt === 'number' ? nearby.fetchedAt : undefined
    const items = Array.isArray(nearby?.items) ? nearby.items : []
    const status = statusFromFetchedAt(fetchedAt, WIKITAB_NEARBY_PLAYGROUND.ttlMs, {
      bypassed,
      turnedOff: isModuleHidden(WIKITAB_NEARBY_PLAYGROUND.moduleId),
      dayKeyed: false,
      hasPayload: nearby != null && items.length > 0,
    }, now)
    rows.push({
      id: WIKITAB_NEARBY_PLAYGROUND.id,
      module: WIKITAB_NEARBY_PLAYGROUND.module,
      storageKey: WIKITAB_NEARBY_PLAYGROUND.storageKey,
      invalidates: WIKITAB_NEARBY_PLAYGROUND.invalidates,
      ttlLabel: ttlLabel(WIKITAB_NEARBY_PLAYGROUND.ttlMs),
      ...status,
    })
  }

  const potdSpec = simpleById.get('potd')
  if (potdSpec) rows.push(simpleModuleRow(potdSpec, now, bypassed, currentDay))

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
