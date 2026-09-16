import type { WikitabFeed } from '../sections'

/**
 * Cache only — nothing here is authoritative. Clearing it costs one refetch and
 * nothing else. User config and app state belong in the URL, not in here.
 *
 * A new tab page is opened dozens of times a day and `feed/featured` is a daily
 * resource, so the first open of a day fetches and every open after it paints
 * from this cache.
 */
const CACHE_KEY = 'wikitab-feed-cache'

interface CacheEntry {
  day: string
  feed: WikitabFeed
}

/** `YYYY-MM-DD` in UTC — the granularity of the featured feed itself. */
export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** `?nocache=1` forces a refetch, for when the day's content has gone stale. */
export function isCacheBypassed(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('nocache') === '1'
}

export function readCachedFeed(day: string): WikitabFeed | null {
  if (isCacheBypassed()) return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (entry?.day !== day || !entry.feed) return null
    return entry.feed
  } catch {
    return null
  }
}

/** Storing a single entry means writing today's feed evicts every older day. */
export function writeCachedFeed(day: string, feed: WikitabFeed): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ day, feed } satisfies CacheEntry))
  } catch {
    // A full or unavailable localStorage must never break the page.
  }
}
