import type { WikitabCardData } from '../sections'
import {
  buildSavedFingerprint,
  isCacheBypassed,
  readCacheJsonUnlessBypassed,
  utcDayKey,
  writeCacheJson,
} from './wikitabCacheHelpers'
import { isEnWikiMainNamespaceArticleTitle } from './wikitabHtml'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User preferences live in `wikitabConfig.ts`, not here.
 */
export const CACHE_KEY = 'wikitab-suggested-edits-cache-v2'

interface CacheEntry {
  day: string
  savedFingerprint: string
  items: WikitabCardData[]
  hasMore: boolean
}

export interface CachedSuggestedEdits {
  items: WikitabCardData[]
  hasMore: boolean
  /** Fingerprint the cards were fetched under — may differ from live saves. */
  savedFingerprint: string
}

export const buildSuggestedEditsSavedFingerprint = buildSavedFingerprint

export { isCacheBypassed, utcDayKey }

function pageidFromCardKey(key: string): number | null {
  const match = key.match(/^suggested-edits:(\d+)$/)
  return match ? Number(match[1]) : null
}

function dedupeCachedItems(items: WikitabCardData[]): WikitabCardData[] {
  const seen = new Set<number>()
  const deduped: WikitabCardData[] = []

  for (const item of items) {
    const pageid = pageidFromCardKey(item.key)
    if (pageid !== null) {
      if (seen.has(pageid)) continue
      seen.add(pageid)
    }
    const title = item.title ?? ''
    if (title && !isEnWikiMainNamespaceArticleTitle(title)) continue

    deduped.push(item)
  }

  return deduped
}

/**
 * Read by UTC day only. A saved-fingerprint mismatch is not a miss — callers
 * keep the painted cards and surface a title refresh when live seeds diverge.
 */
export function readCachedSuggestedEdits(day: string): CachedSuggestedEdits | null {
  const entry = readCacheJsonUnlessBypassed(CACHE_KEY) as CacheEntry | null
  if (!entry || entry.day !== day || typeof entry.savedFingerprint !== 'string' || !entry.items) {
    return null
  }

  return {
    items: dedupeCachedItems(entry.items.map((item) => ({ ...item }))),
    hasMore: entry.hasMore === true,
    savedFingerprint: entry.savedFingerprint,
  }
}

export function writeCachedSuggestedEdits(
  day: string,
  savedFingerprint: string,
  items: WikitabCardData[],
  hasMore: boolean,
): void {
  writeCacheJson(CACHE_KEY, { day, savedFingerprint, items, hasMore } satisfies CacheEntry)
}
