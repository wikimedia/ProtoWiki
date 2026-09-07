import { normalizeEnwikiTitle } from './enwikiTitle'
import type { PageSummary } from './pageSummary'
import { readVersionedStore, setVersionedEntry, writeVersionedStore } from './wikitaCache'

const STORAGE_KEY = 'musical-group-page-summary-cache'
const CACHE_VERSION = 1

interface CachedPageSummaryEntry {
  summary: PageSummary | null
  fetchedAt: number
}

const memoryCache = new Map<string, PageSummary | null>()
const inFlight = new Map<string, Promise<PageSummary | null>>()

function titleCacheKey(title: string): string {
  return normalizeEnwikiTitle(title).toLowerCase()
}

function isValidEntry(entry: unknown): entry is CachedPageSummaryEntry {
  if (typeof entry !== 'object' || entry === null) return false
  const record = entry as CachedPageSummaryEntry
  if (typeof record.fetchedAt !== 'number') return false
  if (record.summary !== null && typeof record.summary !== 'object') return false
  return true
}

function readEntries(): Record<string, CachedPageSummaryEntry> {
  return readVersionedStore(STORAGE_KEY, CACHE_VERSION, isValidEntry)
}

export function getCachedPageSummary(title: string): PageSummary | null | undefined {
  const key = titleCacheKey(title)
  if (memoryCache.has(key)) return memoryCache.get(key)

  const stored = readEntries()[key]
  if (!stored) return undefined

  memoryCache.set(key, stored.summary)
  return stored.summary
}

export function setCachedPageSummary(title: string, summary: PageSummary | null): void {
  const key = titleCacheKey(title)
  memoryCache.set(key, summary)
  setVersionedEntry(
    STORAGE_KEY,
    CACHE_VERSION,
    key,
    { summary, fetchedAt: Date.now() },
    isValidEntry,
  )
}

export function getPageSummaryInFlight(title: string): Promise<PageSummary | null> | undefined {
  return inFlight.get(titleCacheKey(title))
}

export function setPageSummaryInFlight(
  title: string,
  promise: Promise<PageSummary | null>,
): void {
  const key = titleCacheKey(title)
  inFlight.set(key, promise)
  promise.finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key)
  })
}

export function clearPageSummaryCache(): void {
  memoryCache.clear()
  inFlight.clear()
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}

/** Drop in-memory layer only (localStorage kept). Used rarely. */
export function clearPageSummaryMemoryCache(): void {
  memoryCache.clear()
  inFlight.clear()
}

export function persistPageSummaryBatch(entries: Record<string, PageSummary | null>): void {
  const store = readEntries()
  const now = Date.now()
  for (const [title, summary] of Object.entries(entries)) {
    const key = titleCacheKey(title)
    store[key] = { summary, fetchedAt: now }
    memoryCache.set(key, summary)
  }
  writeVersionedStore(STORAGE_KEY, CACHE_VERSION, store)
}
