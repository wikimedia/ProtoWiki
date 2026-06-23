import { normalizeQid } from './wikidataApi'
import type { CarouselImage, EditIndicator, MusicalGroupData } from './types'

export const MUSICAL_GROUP_CACHE_VERSION = 7

const STORAGE_KEY = 'musical-group-page-cache'

export interface CachedMusicalGroupEntry {
  version: number
  fetchedAt: number
  data: MusicalGroupData
}

type MusicalGroupCacheStore = Record<string, CachedMusicalGroupEntry>

function cacheKey(id: string): string {
  return normalizeQid(id) ?? id.trim()
}

function isEditIndicator(value: unknown): value is EditIndicator {
  return value === 'history' || value === 'talk'
}

function isCarouselImage(value: unknown): value is CarouselImage {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Record<string, unknown>
  return (
    typeof record.url === 'string' &&
    (record.orientation === 'landscape' ||
      record.orientation === 'square' ||
      record.orientation === 'portrait' ||
      record.orientation === 'tall')
  )
}

function isMusicalGroupData(value: unknown): value is MusicalGroupData {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || !record.id.length) return false
  if (typeof record.label !== 'string' || !record.label.length) return false
  if (!Array.isArray(record.genres) || !record.genres.every((g) => typeof g === 'string')) {
    return false
  }
  if (!Array.isArray(record.images) || !record.images.every(isCarouselImage)) {
    return false
  }

  if (record.description !== undefined && typeof record.description !== 'string') return false
  if (record.typeLabel !== undefined && typeof record.typeLabel !== 'string') return false
  if (record.inceptionYear !== undefined && typeof record.inceptionYear !== 'number') return false
  if (record.websiteUrl !== undefined && typeof record.websiteUrl !== 'string') return false
  if (record.websiteHost !== undefined && typeof record.websiteHost !== 'string') return false
  if (record.editIndicator !== undefined && !isEditIndicator(record.editIndicator)) return false

  return true
}

function isValidEntry(entry: unknown): entry is CachedMusicalGroupEntry {
  if (typeof entry !== 'object' || entry === null) return false

  const record = entry as CachedMusicalGroupEntry
  return (
    record.version === MUSICAL_GROUP_CACHE_VERSION &&
    typeof record.fetchedAt === 'number' &&
    isMusicalGroupData(record.data)
  )
}

function normalizeStore(raw: unknown): MusicalGroupCacheStore {
  if (typeof raw !== 'object' || raw === null) return {}

  const store: MusicalGroupCacheStore = {}

  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidEntry(entry)) continue

    const normalizedKey = cacheKey(entry.data.id) || cacheKey(key)
    if (!normalizedKey.length) continue

    const existing = store[normalizedKey]
    if (!existing || entry.fetchedAt >= existing.fetchedAt) {
      store[normalizedKey] = entry
    }
  }

  return store
}

function clearStoredCache(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function readRawStore(): { raw: unknown; corrupt: boolean } {
  if (typeof window === 'undefined') return { raw: null, corrupt: false }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { raw: null, corrupt: false }
    return { raw: JSON.parse(stored), corrupt: false }
  } catch {
    return { raw: null, corrupt: true }
  }
}

function readStore(): MusicalGroupCacheStore {
  const { raw, corrupt } = readRawStore()
  if (corrupt) {
    clearStoredCache()
    return {}
  }
  if (raw === null) return {}

  const normalized = normalizeStore(raw)
  if (JSON.stringify(normalized) !== JSON.stringify(raw)) {
    persistStore(normalized)
  }
  return normalized
}

function persistStore(store: MusicalGroupCacheStore): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeStore(store)

  try {
    if (Object.keys(normalized).length === 0) {
      clearStoredCache()
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function getCachedMusicalGroup(id: string): CachedMusicalGroupEntry | null {
  const key = cacheKey(id)
  if (!key.length) return null

  const store = readStore()
  return store[key] ?? null
}

export function setCachedMusicalGroup(id: string, data: MusicalGroupData): CachedMusicalGroupEntry {
  const key = cacheKey(id) || cacheKey(data.id)
  const entry: CachedMusicalGroupEntry = {
    version: MUSICAL_GROUP_CACHE_VERSION,
    fetchedAt: Date.now(),
    data,
  }

  if (!key.length) return entry

  const store = readStore()
  persistStore({ ...store, [key]: entry })
  return entry
}
