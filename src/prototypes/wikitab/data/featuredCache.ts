import type { WikitabFeaturedSpotlight } from '../sections'
import { isCacheBypassed, utcDayKey } from './feedCache'

export const CACHE_KEY = 'wikitab-featured-cache-v17'

interface CacheEntry {
  day: string
  items: WikitabFeaturedSpotlight[]
}

let sessionEntry: CacheEntry | null = null

export function readCachedFeatured(day: string): WikitabFeaturedSpotlight[] | null {
  if (isCacheBypassed()) return null

  if (sessionEntry?.day === day) {
    return sessionEntry.items.map((item) => ({ ...item }))
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    if (entry?.day !== day || !Array.isArray(entry.items)) return null

    sessionEntry = { day, items: entry.items }
    return entry.items.map((item) => ({ ...item }))
  } catch {
    return null
  }
}

export function writeCachedFeatured(day: string, items: WikitabFeaturedSpotlight[]): void {
  sessionEntry = { day, items }
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ day, items } satisfies CacheEntry))
  } catch {
    // Quota or private mode — session memory still holds the result.
  }
}

export function clearCachedFeatured(): void {
  sessionEntry = null
  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

export { isCacheBypassed, utcDayKey }
