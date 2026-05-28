import { normalizeLang, normalizeWikiUsername } from '@/lib/config'
import type { ImpactData } from '@/lib/impactTypes'
import { wipeLocalStorage } from '@/lib/wipeLocalStorage'

const STORAGE_KEY = 'protowiki-impact-cache-v1'

export interface CachedImpactEntry {
  fetchedAt: number
  data: ImpactData
}

type ImpactCacheStore = Record<string, CachedImpactEntry>

function realUserImpactCacheKey(username: string, wiki: string): string {
  const normalizedUsername = normalizeWikiUsername(username)
  if (!normalizedUsername.length) return ''
  return `${normalizeLang(wiki)}:${normalizedUsername}`
}

function readStore(): ImpactCacheStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as ImpactCacheStore
  } catch {
    wipeLocalStorage()
    return {}
  }
}

function writeStore(store: ImpactCacheStore): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function getCachedImpact(username: string, wiki = 'en'): CachedImpactEntry | null {
  const key = realUserImpactCacheKey(username, wiki)
  if (!key.length) return null
  const entry = readStore()[key]
  if (!entry || typeof entry.fetchedAt !== 'number' || typeof entry.data !== 'object') {
    return null
  }
  return entry
}

export function setCachedImpact(
  username: string,
  data: ImpactData,
  wiki = 'en',
): CachedImpactEntry {
  const key = realUserImpactCacheKey(username, wiki)
  const entry: CachedImpactEntry = { fetchedAt: Date.now(), data }
  if (!key.length) return entry

  const store = readStore()
  store[key] = entry
  writeStore(store)
  return entry
}

export function clearCachedImpact(username: string, wiki = 'en'): void {
  const key = realUserImpactCacheKey(username, wiki)
  if (!key.length) return

  const store = readStore()
  delete store[key]
  writeStore(store)
}
