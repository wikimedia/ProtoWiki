import { normalizeLang, normalizeWikiUsername } from '@/lib/config'
import { wipeLocalStorage } from '@/lib/wipeLocalStorage'

const STORAGE_KEY = 'protowiki-dashpage-portfolio-v1'

export interface DashpagePortfolioCacheEntry {
  fetchedAt: number
  titles: string[]
}

type PortfolioStore = Record<string, DashpagePortfolioCacheEntry>

function realUserPortfolioCacheKey(username: string, wiki: string): string {
  const normalizedUsername = normalizeWikiUsername(username)
  if (!normalizedUsername.length) return ''
  return `${normalizeLang(wiki)}:${normalizedUsername}`
}

function readStore(): PortfolioStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as PortfolioStore
  } catch {
    wipeLocalStorage()
    return {}
  }
}

function writeStore(store: PortfolioStore): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function getPortfolioCache(
  username: string,
  wiki = 'en',
): DashpagePortfolioCacheEntry | null {
  const key = realUserPortfolioCacheKey(username, wiki)
  if (!key.length) return null

  const entry = readStore()[key]
  if (!entry || typeof entry.fetchedAt !== 'number' || !Array.isArray(entry.titles)) {
    return null
  }
  return entry
}

export function setPortfolioCache(
  username: string,
  titles: string[],
  wiki = 'en',
): DashpagePortfolioCacheEntry {
  const key = realUserPortfolioCacheKey(username, wiki)
  const entry: DashpagePortfolioCacheEntry = {
    fetchedAt: Date.now(),
    titles: [...titles],
  }
  if (!key.length) return entry

  const store = readStore()
  store[key] = entry
  writeStore(store)
  return entry
}
