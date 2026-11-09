import type { WikitabCardData } from '../sections'
import { isCacheBypassed } from './feedCache'
import { NEARBY_TTL_MS, isTimestampFresh } from './wikitabCacheTtl'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  type WikitabNearbyCardsCache,
  type WikitabNearbyLastCoord,
} from './wikitabConfig'

/**
 * Nearby card cache lives in `WikitabConfig.nearbyCardsCache[lang]` (same durable
 * store as `nearbyLastCoord`) — not a separate localStorage key that
 * `evictWikitabCaches()` deletes whenever a config write hits quota. Every read
 * and write names the wiki language, like the other Wikitab caches.
 *
 * Warm cache → paint on first tick, no network.
 */
export { NEARBY_TTL_MS } from './wikitabCacheTtl'

/** Legacy standalone key — migrated once into config, then removed. */
const LEGACY_CACHE_KEY = 'wikitab-nearby-cache-v2'

export interface CachedNearby {
  items: WikitabCardData[]
  hasMore: boolean
  fetchedAt: number
  lat: number
  lon: number
}

export function buildNearbyCoordKey(coord: Pick<WikitabNearbyLastCoord, 'lat' | 'lon'>): string {
  return `${coord.lat.toFixed(5)}|${coord.lon.toFixed(5)}`
}

export function isNearbyCacheFresh(fetchedAt: number, now = Date.now()): boolean {
  return isTimestampFresh(fetchedAt, NEARBY_TTL_MS, now)
}

export { isCacheBypassed }

const COORD_MATCH_EPSILON = 0.002

function coordMatches(
  coord: WikitabNearbyLastCoord,
  entry: Pick<WikitabNearbyCardsCache, 'lat' | 'lon' | 'coordKey'>,
): boolean {
  if (entry.coordKey === buildNearbyCoordKey(coord)) return true
  return (
    Math.abs(entry.lat - coord.lat) <= COORD_MATCH_EPSILON &&
    Math.abs(entry.lon - coord.lon) <= COORD_MATCH_EPSILON
  )
}

function entryToCached(entry: WikitabNearbyCardsCache): CachedNearby {
  return {
    items: entry.items.map((item) => ({ ...item })),
    hasMore: entry.hasMore,
    fetchedAt: entry.fetchedAt,
    lat: entry.lat,
    lon: entry.lon,
  }
}

function migrateLegacyCacheIfNeeded(
  lang: string,
  coord: WikitabNearbyLastCoord,
): CachedNearby | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LEGACY_CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as Partial<WikitabNearbyCardsCache>
    window.localStorage.removeItem(LEGACY_CACHE_KEY)

    if (!Array.isArray(entry.items) || !entry.items.length) return null
    if (typeof entry.lat !== 'number' || typeof entry.lon !== 'number') return null

    const normalized: WikitabNearbyCardsCache = {
      coordKey:
        typeof entry.coordKey === 'string' && entry.coordKey
          ? entry.coordKey
          : buildNearbyCoordKey({ lat: entry.lat, lon: entry.lon }),
      lat: entry.lat,
      lon: entry.lon,
      items: entry.items,
      hasMore: entry.hasMore === true,
      fetchedAt: typeof entry.fetchedAt === 'number' ? entry.fetchedAt : Date.now(),
    }

    // The standalone key predates the language setting — it was always enwiki.
    if (lang !== 'en' || !coordMatches(coord, normalized)) return null

    patchNearbyCache('en', normalized)
    return entryToCached(normalized)
  } catch {
    try {
      window.localStorage.removeItem(LEGACY_CACHE_KEY)
    } catch {
      // ignore
    }
    return null
  }
}

/** Read cached cards for a stored location. Null when missing / wrong place / bypassed. */
export function readCachedNearby(lang: string, coord: WikitabNearbyLastCoord): CachedNearby | null {
  if (isCacheBypassed()) return null

  const stored = loadWikitabConfig().nearbyCardsCache[lang]
  if (stored?.items.length && coordMatches(coord, stored)) {
    return entryToCached(stored)
  }

  return migrateLegacyCacheIfNeeded(lang, coord)
}

/** Read-modify-write one language's entry so other languages' cards survive. */
function patchNearbyCache(lang: string, entry: WikitabNearbyCardsCache | null): void {
  const next = { ...loadWikitabConfig().nearbyCardsCache }
  if (entry) next[lang] = entry
  else delete next[lang]
  patchWikitabConfig({ nearbyCardsCache: next })
}

/**
 * Write the full card payload into wikitab config (durable with consent coords).
 * Call at stable points (after fetch / after enrichment) — not on every card patch.
 */
export function writeCachedNearby(
  lang: string,
  coord: WikitabNearbyLastCoord,
  items: WikitabCardData[],
  hasMore: boolean,
  fetchedAt = Date.now(),
): void {
  const entry: WikitabNearbyCardsCache = {
    coordKey: buildNearbyCoordKey(coord),
    lat: coord.lat,
    lon: coord.lon,
    items: items.map((item) => ({ ...item })),
    hasMore,
    fetchedAt,
  }
  patchNearbyCache(lang, entry)
}

/** Drop one language's cards (forced refresh / new location on this wiki). */
export function clearCachedNearby(lang: string): void {
  patchNearbyCache(lang, null)
}

/** Drop every language's cards — the location itself is gone (permission denied). */
export function clearAllCachedNearby(): void {
  patchWikitabConfig({ nearbyCardsCache: {} })
  try {
    window.localStorage.removeItem(LEGACY_CACHE_KEY)
  } catch {
    // ignore
  }
}
