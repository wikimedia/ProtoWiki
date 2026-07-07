import { normalizeLang, wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'

/**
 * Fetches the list of Wikipedia **Vital articles** titles for a language, with
 * a small in-memory + `localStorage` cache. The list is a plain `string[]` of
 * mainspace titles — deliberately lighter than **`ArticleLive`**'s article-body
 * cache, which stays inline in that component.
 *
 * Only English (`en`) ships a Vital articles list at a predictable page title;
 * other wikis typically resolve to an empty list, and callers should fall back
 * to the random pool (see **`selectRandomArticle`**).
 */

/** Default Vital articles level (2 ≈ 100 titles). Level 3 (~1,000) is broader. */
export const VITAL_ARTICLES_LEVEL = 2

const LOG_PREFIX = '[ProtoWiki][vitalArticles]'
const STORAGE_PREFIX = 'protowiki:vitalArticles:v1:'

const memoryCache = new Map<string, string[]>()
const inFlight = new Map<string, Promise<string[]>>()

function cacheKey(lang: string, level: number): string {
  return `${normalizeLang(lang)}:${level}`
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function normalizeTitleList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const titles = value.filter((item): item is string => typeof item === 'string')
  return titles.length ? titles : null
}

function loadFromStorage(key: string): string[] | null {
  const store = getLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const normalized = normalizeTitleList(JSON.parse(raw))
    if (!normalized) {
      store.removeItem(STORAGE_PREFIX + key)
      return null
    }
    return normalized
  } catch {
    try {
      store.removeItem(STORAGE_PREFIX + key)
    } catch {
      // ignore
    }
    return null
  }
}

function saveToStorage(key: string, titles: string[]): void {
  const store = getLocalStorage()
  if (!store) return
  try {
    store.setItem(STORAGE_PREFIX + key, JSON.stringify(titles))
  } catch {
    // Quota or private-mode failures — the in-memory cache still works.
  }
}

/** The on-wiki page that lists the Vital articles for a given level. */
function vitalArticlesPageTitle(level: number): string {
  return `Wikipedia:Vital articles/Level/${level}`
}

async function fetchVitalTitles(lang: string, level: number): Promise<string[]> {
  const host = wikiHostFromLang(lang)
  const pageTitle = vitalArticlesPageTitle(level)
  const titles: string[] = []
  const seen = new Set<string>()

  const baseUrl = new URL(`https://${host}/w/api.php`)
  baseUrl.searchParams.set('action', 'query')
  baseUrl.searchParams.set('generator', 'links')
  baseUrl.searchParams.set('titles', pageTitle)
  baseUrl.searchParams.set('gplnamespace', '0')
  baseUrl.searchParams.set('gpllimit', 'max')
  baseUrl.searchParams.set('format', 'json')
  baseUrl.searchParams.set('formatversion', '2')
  baseUrl.searchParams.set('origin', '*')

  let url = baseUrl.toString()
  // Guard against runaway pagination; ~1,000 titles fits in a few pages.
  for (let page = 0; page < 20; page++) {
    const response = await fetch(url, { headers: wikimediaApiFetchHeaders('vital-articles') })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    if (data?.error) {
      throw new Error(data.error.info || data.error.code || 'Action API error')
    }

    const pages = data?.query?.pages
    if (Array.isArray(pages)) {
      for (const p of pages) {
        if (p && p.ns === 0 && typeof p.title === 'string' && !p.missing && !seen.has(p.title)) {
          seen.add(p.title)
          titles.push(p.title)
        }
      }
    }

    const cont = data?.continue?.gplcontinue
    if (!cont) break
    const next = new URL(baseUrl.toString())
    next.searchParams.set('gplcontinue', String(cont))
    if (data.continue.continue) next.searchParams.set('continue', String(data.continue.continue))
    url = next.toString()
  }

  return titles
}

/**
 * Returns the cached Vital articles titles for `lang`, fetching (once) on a
 * cache miss. Coalesces concurrent callers. Returns `[]` (never throws) so a
 * caller can transparently fall back to another pool.
 */
export async function getVitalTitles(
  lang: string,
  level: number = VITAL_ARTICLES_LEVEL,
): Promise<string[]> {
  const key = cacheKey(lang, level)

  const memory = memoryCache.get(key)
  if (memory) return memory

  const stored = loadFromStorage(key)
  if (stored) {
    memoryCache.set(key, stored)
    return stored
  }

  let promise = inFlight.get(key)
  if (!promise) {
    promise = fetchVitalTitles(lang, level)
      .then((titles) => {
        if (titles.length) {
          memoryCache.set(key, titles)
          saveToStorage(key, titles)
        }
        return titles
      })
      .catch((err: unknown) => {
        console.warn(`${LOG_PREFIX} fetch failed`, { lang: normalizeLang(lang), level, err })
        return [] as string[]
      })
      .finally(() => {
        inFlight.delete(key)
      })
    inFlight.set(key, promise)
  }

  return promise
}
