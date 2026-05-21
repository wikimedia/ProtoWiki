import { normalizeWikiUsername } from '@/lib/config'
import type { ImpactData } from '@/lib/impactTypes'

const STORAGE_KEY = 'protowiki-impact-cache-v1'

export interface CachedImpactEntry {
  fetchedAt: number
  data: ImpactData
}

type ImpactCacheStore = Record<string, CachedImpactEntry>

function readStore(): ImpactCacheStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as ImpactCacheStore
  } catch {
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

export function getCachedImpact(username: string): CachedImpactEntry | null {
  const key = normalizeWikiUsername(username)
  if (!key.length) return null
  const entry = readStore()[key]
  if (!entry || typeof entry.fetchedAt !== 'number' || typeof entry.data !== 'object') {
    return null
  }
  return entry
}

export function setCachedImpact(username: string, data: ImpactData): CachedImpactEntry {
  const key = normalizeWikiUsername(username)
  const entry: CachedImpactEntry = { fetchedAt: Date.now(), data }
  if (!key.length) return entry

  const store = readStore()
  store[key] = entry
  writeStore(store)
  return entry
}

export function clearCachedImpact(username: string): void {
  const key = normalizeWikiUsername(username)
  if (!key.length) return

  const store = readStore()
  delete store[key]
  writeStore(store)
}
