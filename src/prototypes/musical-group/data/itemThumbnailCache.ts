import { normalizeQid } from './wikidataApi'
import { readVersionedStore, setVersionedEntry, writeVersionedStore } from './wikitaCache'

const STORAGE_KEY = 'musical-group-item-thumbnail-cache'
const CACHE_VERSION = 1

interface CachedItemThumbnailEntry {
  url: string
  fetchedAt: number
}

const memoryCache = new Map<string, string>()

function cacheKey(id: string): string {
  return normalizeQid(id) ?? id.trim()
}

function isValidEntry(entry: unknown): entry is CachedItemThumbnailEntry {
  if (typeof entry !== 'object' || entry === null) return false
  const record = entry as CachedItemThumbnailEntry
  return typeof record.url === 'string' && record.url.length > 0 && typeof record.fetchedAt === 'number'
}

function readEntries(): Record<string, CachedItemThumbnailEntry> {
  return readVersionedStore(STORAGE_KEY, CACHE_VERSION, isValidEntry)
}

export function getCachedItemThumbnail(id: string): string | undefined {
  const key = cacheKey(id)
  if (memoryCache.has(key)) return memoryCache.get(key)

  const stored = readEntries()[key]
  if (!stored) return undefined

  memoryCache.set(key, stored.url)
  return stored.url
}

export function setCachedItemThumbnail(id: string, url: string): void {
  const key = cacheKey(id)
  memoryCache.set(key, url)
  setVersionedEntry(
    STORAGE_KEY,
    CACHE_VERSION,
    key,
    { url, fetchedAt: Date.now() },
    isValidEntry,
  )
}

export function setCachedItemThumbnailBatch(entries: Record<string, string>): void {
  if (!Object.keys(entries).length) return

  const store = readEntries()
  const now = Date.now()
  for (const [id, url] of Object.entries(entries)) {
    if (!url) continue
    const key = cacheKey(id)
    store[key] = { url, fetchedAt: now }
    memoryCache.set(key, url)
  }
  writeVersionedStore(STORAGE_KEY, CACHE_VERSION, store)
}

export function clearItemThumbnailCache(): void {
  memoryCache.clear()
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
