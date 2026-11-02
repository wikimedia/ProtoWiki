import type { WikitabCardData } from '../sections'
import { DISCUSSIONS_TTL_MS, isCacheBypassed } from './feedCache'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  type WikitabNearbyCardsCache,
  type WikitabNearbyLastCoord,
} from './wikitabConfig'

/**
 * Nearby card cache lives in `WikitabConfig.nearbyCardsCache` (same durable
 * store as `nearbyLastCoord`) — not a separate localStorage key that
 * `evictWikitabCaches()` deletes whenever a config write hits quota.
 *
 * Warm cache → paint on first tick, no network. TTL matches Active discussions.
 */
export const NEARBY_TTL_MS = DISCUSSIONS_TTL_MS

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
  return now - fetchedAt < NEARBY_TTL_MS
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

function migrateLegacyCacheIfNeeded(coord: WikitabNearbyLastCoord): CachedNearby | null {
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

    if (!coordMatches(coord, normalized)) return null

    patchWikitabConfig({ nearbyCardsCache: normalized })
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
export function readCachedNearby(coord: WikitabNearbyLastCoord): CachedNearby | null {
  if (isCacheBypassed()) return null

  const stored = loadWikitabConfig().nearbyCardsCache
  if (stored?.items.length && coordMatches(coord, stored)) {
    return entryToCached(stored)
  }

  return migrateLegacyCacheIfNeeded(coord)
}

/**
 * Write the full card payload into wikitab config (durable with consent coords).
 * Call at stable points (after fetch / after enrichment) — not on every card patch.
 */
export function writeCachedNearby(
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
  patchWikitabConfig({ nearbyCardsCache: entry })
}

export function clearCachedNearby(): void {
  patchWikitabConfig({ nearbyCardsCache: null })
  try {
    window.localStorage.removeItem(LEGACY_CACHE_KEY)
  } catch {
    // ignore
  }
}
