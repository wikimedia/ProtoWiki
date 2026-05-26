import { wipeLocalStorage } from '@/lib/wipeLocalStorage'
import { dashpageSuggestionUserKey } from '@/lib/dashpageSuggestionCache'
import { DASHPAGE_RC_STORAGE_KEY } from '@/lib/dashpageRecentChangesConstants'
import type { RecentChangeFeedItem } from '@/lib/dashpageRecentChangesTypes'

export { dashpageSuggestionUserKey as dashpageRecentChangesUserKey }

export interface DashpageRecentChangesCache {
  fetchedAt: number
  items: RecentChangeFeedItem[]
}

type ModuleStore = Record<string, DashpageRecentChangesCache>

function readStore(): ModuleStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(DASHPAGE_RC_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as ModuleStore
  } catch {
    wipeLocalStorage()
    return {}
  }
}

function writeStore(store: ModuleStore): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(DASHPAGE_RC_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

function isValidFeedItem(item: unknown): item is RecentChangeFeedItem {
  if (typeof item !== 'object' || item === null) return false
  const row = item as Record<string, unknown>
  return (
    typeof row.revId === 'number' &&
    typeof row.pageTitle === 'string' &&
    typeof row.userName === 'string' &&
    typeof row.timestamp === 'string' &&
    typeof row.diffUrl === 'string'
  )
}

export function getDashpageRecentChangesCache(
  userKey: string,
): DashpageRecentChangesCache | null {
  if (!userKey.length) return null

  const entry = readStore()[userKey]
  if (!entry || typeof entry.fetchedAt !== 'number' || !Array.isArray(entry.items)) {
    return null
  }

  const items = entry.items.filter(isValidFeedItem)
  if (!items.length) return null

  return { fetchedAt: entry.fetchedAt, items }
}

export function setDashpageRecentChangesCache(
  userKey: string,
  cache: DashpageRecentChangesCache,
): void {
  if (!userKey.length) return

  const store = readStore()
  store[userKey] = cache
  writeStore(store)
}
