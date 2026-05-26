import { wipeLocalStorage } from '@/lib/wipeLocalStorage'
import type { ConfigUser, UserPageLists } from '@/lib/config'
import { normalizeLang, normalizeWikiUsername } from '@/lib/config'

const STORAGE_KEY = 'protowiki-dashpage-suggestion-module-v4'
export const DASHPAGE_SUGGESTION_FALLBACK_PAGE = 'Wet Leg'
export const DASHPAGE_SUGGESTION_POOL_MAX = 6
export const DASHPAGE_SUGGESTION_MORELIKE_MAX = 6
/** Extra morelike batch when the first pass yields a very small queue. */
export const DASHPAGE_SUGGESTION_MORELIKE_SUPPLEMENT_MAX = 6
/** Max page titles to run through the VE pipeline in one refresh. */
export const DASHPAGE_SUGGESTION_MAX_TRIED_PAGES =
  DASHPAGE_SUGGESTION_POOL_MAX +
  DASHPAGE_SUGGESTION_MORELIKE_MAX +
  DASHPAGE_SUGGESTION_MORELIKE_SUPPLEMENT_MAX
/** Target queue length before skipping the supplemental morelike pass. */
export const DASHPAGE_SUGGESTION_MIN_QUEUE = 2
export const DASHPAGE_MORELIKE_SEED_COUNT = 5

export interface PagePreviewCache {
  thumbnailSrc?: string
  shortDescription?: string
}

export interface DashpageSuggestionModuleCache {
  fetchedAt: number
  selectedPageTitles: string[]
  pagePreviews: Record<string, PagePreviewCache>
  currentIndex: number
}

type ModuleStore = Record<string, DashpageSuggestionModuleCache>

export function dashpageSuggestionUserKey(
  user: ConfigUser,
  realUsername: string,
  lang = 'en',
): string {
  const wiki = normalizeLang(lang)
  if (user === 'real') {
    const normalized = normalizeWikiUsername(realUsername)
    return normalized.length ? `real:${wiki}:${normalized}` : `real:${wiki}`
  }
  return `${user}:${wiki}`
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
    wipeLocalStorage()
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
  if (
    !entry ||
    typeof entry.fetchedAt !== 'number' ||
    !Array.isArray(entry.selectedPageTitles) ||
    typeof entry.currentIndex !== 'number'
  ) {
    return null
  }
  return {
    fetchedAt: entry.fetchedAt,
    selectedPageTitles: entry.selectedPageTitles,
    pagePreviews: entry.pagePreviews ?? {},
    currentIndex: entry.currentIndex,
  }
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

/** Pages to seed suggestion / recent-changes pipelines. Real users with no edits get none. */
export function portfolioPoolForDashpage(user: ConfigUser, portfolio: string[]): string[] {
  if (portfolio.length) return portfolio
  if (user === 'real') return []
  return [DASHPAGE_SUGGESTION_FALLBACK_PAGE]
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

/** Sample up to `max` distinct titles without replacement. */
export function pickUpToRandomPages(
  titles: string[],
  max = DASHPAGE_SUGGESTION_POOL_MAX,
  excludeTitles: string[] = [],
): string[] {
  const exclude = new Set(excludeTitles.filter(Boolean))
  let pool = titles.filter((title) => !exclude.has(title))

  if (!pool.length) {
    pool = titles.length ? [...titles] : []
  }

  const count = Math.min(max, pool.length)
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}

export function resolvePortfolioPages(
  user: ConfigUser,
  pageLists: UserPageLists,
  cachedRealTitles: string[],
  excludeTitles: string[] = [],
): string[] {
  const portfolio = getPortfolioPagesForUser(user, pageLists, cachedRealTitles)
  if (!portfolio.length) {
    return user === 'real' ? [] : pickUpToRandomPages([DASHPAGE_SUGGESTION_FALLBACK_PAGE], DASHPAGE_SUGGESTION_POOL_MAX, excludeTitles)
  }
  return pickUpToRandomPages(portfolio, DASHPAGE_SUGGESTION_POOL_MAX, excludeTitles)
}

export function resolvePortfolioPage(
  user: ConfigUser,
  pageLists: UserPageLists,
  cachedRealTitles: string[],
  exclude?: string,
): string {
  const pages = resolvePortfolioPages(user, pageLists, cachedRealTitles, exclude ? [exclude] : [])
  return pages[0] ?? (user === 'real' ? '' : DASHPAGE_SUGGESTION_FALLBACK_PAGE)
}
