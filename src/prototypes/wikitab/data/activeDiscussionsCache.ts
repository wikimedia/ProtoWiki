import type { WikitabCardData } from '../sections'
import { isCacheBypassed, utcDayKey } from './feedCache'
import {
  DISCUSSIONS_NOTICEBOARDS_TTL_MS,
  DISCUSSIONS_SAVED_TALK_TTL_MS,
  isTimestampFresh,
} from './wikitabCacheTtl'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-active-discussions-cache-v11'

interface CacheEntry {
  day: string
  savedFingerprint: string
  settingsFingerprint: string
  noticeboards: WikitabCardData[]
  articles: WikitabCardData[]
  /** How many shuffled article seeds have been fetched into `articles`. */
  articleSeedOffset: number
  /** @deprecated Prefer `fetchedAtNoticeboards` / `fetchedAtArticles`. */
  fetchedAt?: number
  fetchedAtNoticeboards?: number
  fetchedAtArticles?: number
}

export interface CachedActiveDiscussions {
  noticeboards: WikitabCardData[]
  articles: WikitabCardData[]
  articleSeedOffset: number
  /** Fingerprint the cards were fetched under — may differ from live saves. */
  savedFingerprint: string
  fetchedAtNoticeboards?: number
  fetchedAtArticles?: number
}

export function buildActiveDiscussionsSavedFingerprint(titleKeys: readonly string[]): string {
  return [...titleKeys].sort().join('|')
}

export function buildActiveDiscussionsSettingsFingerprint(options: {
  showNoticeboards: boolean
  showSavedTalk: boolean
}): string {
  return `${options.showNoticeboards ? '1' : '0'}${options.showSavedTalk ? '1' : '0'}`
}

export { isCacheBypassed, utcDayKey }

function resolveFetchedAt(
  entry: CacheEntry,
  source: 'noticeboards' | 'articles',
): number | undefined {
  if (source === 'noticeboards' && typeof entry.fetchedAtNoticeboards === 'number') {
    return entry.fetchedAtNoticeboards
  }
  if (source === 'articles' && typeof entry.fetchedAtArticles === 'number') {
    return entry.fetchedAtArticles
  }
  if (typeof entry.fetchedAt === 'number') return entry.fetchedAt
  return undefined
}

/**
 * Read by UTC day + settings fingerprint. A saved-fingerprint mismatch is not a
 * miss — callers keep the painted cards and surface a title refresh when live
 * seeds diverge. Settings mismatch still misses (toggles change the feed shape).
 */
export function readCachedActiveDiscussions(
  day: string,
  settingsFingerprint: string,
): CachedActiveDiscussions | null {
  if (isCacheBypassed()) return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (
      entry?.day !== day ||
      typeof entry.savedFingerprint !== 'string' ||
      entry.settingsFingerprint !== settingsFingerprint ||
      !Array.isArray(entry.noticeboards) ||
      !Array.isArray(entry.articles) ||
      typeof entry.articleSeedOffset !== 'number'
    ) {
      return null
    }

    const fetchedAtNoticeboards = resolveFetchedAt(entry, 'noticeboards')
    const fetchedAtArticles = resolveFetchedAt(entry, 'articles')
    if (fetchedAtNoticeboards == null && fetchedAtArticles == null) return null

    return {
      noticeboards: entry.noticeboards.map((item) => ({ ...item })),
      articles: entry.articles.map((item) => ({ ...item })),
      articleSeedOffset: entry.articleSeedOffset,
      savedFingerprint: entry.savedFingerprint,
      fetchedAtNoticeboards,
      fetchedAtArticles,
    }
  } catch {
    return null
  }
}

export function isActiveDiscussionsNoticeboardsCacheFresh(
  fetchedAt: number | undefined,
  now = Date.now(),
): boolean {
  return isTimestampFresh(fetchedAt, DISCUSSIONS_NOTICEBOARDS_TTL_MS, now)
}

export function isActiveDiscussionsSavedTalkCacheFresh(
  fetchedAt: number | undefined,
  now = Date.now(),
): boolean {
  return isTimestampFresh(fetchedAt, DISCUSSIONS_SAVED_TALK_TTL_MS, now)
}

/** @deprecated Prefer per-source freshness helpers. */
export function isActiveDiscussionsCacheFresh(
  fetchedAt: number | undefined,
  now = Date.now(),
): boolean {
  return isActiveDiscussionsNoticeboardsCacheFresh(fetchedAt, now)
}

export function writeCachedActiveDiscussions(
  day: string,
  savedFingerprint: string,
  settingsFingerprint: string,
  noticeboards: WikitabCardData[],
  articles: WikitabCardData[],
  articleSeedOffset: number,
  fetchedAt?: { noticeboards?: number; articles?: number },
): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        day,
        savedFingerprint,
        settingsFingerprint,
        noticeboards,
        articles,
        articleSeedOffset,
        fetchedAtNoticeboards: fetchedAt?.noticeboards,
        fetchedAtArticles: fetchedAt?.articles,
      } satisfies CacheEntry),
    )
  } catch {
    // A full or unavailable localStorage must never break the page.
  }
}
