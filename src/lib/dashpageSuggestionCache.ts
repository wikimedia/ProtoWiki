import type { ConfigUser, UserPageLists } from '@/lib/config'
import { normalizeWikiUsername } from '@/lib/config'

const STORAGE_KEY = 'protowiki-dashpage-suggestion-module-v2'
export const DASHPAGE_SUGGESTION_FALLBACK_PAGE = 'Wet Leg'

export interface DashpageSuggestionModuleCache {
  fetchedAt: number
  selectedPageTitle: string
  thumbnailSrc?: string
  shortDescription?: string
}

type ModuleStore = Record<string, DashpageSuggestionModuleCache>

export function dashpageSuggestionUserKey(user: ConfigUser, realUsername: string): string {
  if (user === 'real') {
    const normalized = normalizeWikiUsername(realUsername)
    return normalized.length ? `real:${normalized}` : 'real'
  }
  return user
}

function readStore(): ModuleStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as ModuleStore
  } catch {
    return {}
  }
}

function writeStore(store: ModuleStore): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function getDashpageSuggestionModuleCache(
  userKey: string,
): DashpageSuggestionModuleCache | null {
  if (!userKey.length) return null

  const entry = readStore()[userKey]
  if (!entry || typeof entry.fetchedAt !== 'number' || typeof entry.selectedPageTitle !== 'string') {
    return null
  }
  return entry
}

export function setDashpageSuggestionModuleCache(
  userKey: string,
  cache: DashpageSuggestionModuleCache,
): void {
  if (!userKey.length) return

  const store = readStore()
  store[userKey] = cache
  writeStore(store)
}

export function getPortfolioPagesForUser(
  user: ConfigUser,
  pageLists: UserPageLists,
  cachedRealTitles: string[],
): string[] {
  if (user === 'real') {
    return cachedRealTitles.length ? [...cachedRealTitles] : []
  }

  const seen = new Set<string>()
  const titles: string[] = []

  for (const list of [pageLists.watchlist, pageLists.readingList, pageLists.editedPages]) {
    for (const title of list) {
      const trimmed = title.trim()
      if (!trimmed.length || seen.has(trimmed)) continue
      seen.add(trimmed)
      titles.push(trimmed)
    }
  }

  return titles
}

export function pickRandomPage(titles: string[], exclude?: string): string {
  const pool =
    exclude && titles.length > 1 ?
      titles.filter((title) => title !== exclude)
    : titles

  if (!pool.length) {
    return DASHPAGE_SUGGESTION_FALLBACK_PAGE
  }

  const index = Math.floor(Math.random() * pool.length)
  return pool[index] ?? DASHPAGE_SUGGESTION_FALLBACK_PAGE
}

export function resolvePortfolioPage(
  user: ConfigUser,
  pageLists: UserPageLists,
  cachedRealTitles: string[],
  exclude?: string,
): string {
  const portfolio = getPortfolioPagesForUser(user, pageLists, cachedRealTitles)
  if (!portfolio.length) {
    return DASHPAGE_SUGGESTION_FALLBACK_PAGE
  }
  return pickRandomPage(portfolio, exclude)
}
