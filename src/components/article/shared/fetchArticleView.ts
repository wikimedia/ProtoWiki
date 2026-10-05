import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

const THUMBNAIL_SIZE = 800

export interface ArticleView {
  title: string
  description: string
  thumbnailUrl: string | null
}

const articleViewCache = new Map<string, ArticleView>()
const inFlightFetches = new Map<string, Promise<ArticleView>>()

const STORAGE_PREFIX = 'protowiki:articleView:v1:'
const LOG_PREFIX = '[ProtoWiki][fetchArticleView]'

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function normalizeArticleView(value: unknown): ArticleView | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.title !== 'string' || typeof record.description !== 'string') return null
  if (record.thumbnailUrl !== null && typeof record.thumbnailUrl !== 'string') return null
  return {
    title: record.title,
    description: record.description,
    thumbnailUrl: record.thumbnailUrl as string | null,
  }
}

function storageKeyForArticle(key: string): string {
  return STORAGE_PREFIX + key
}

function removeFromStorage(key: string): void {
  const store = getLocalStorage()
  if (!store) return
  try {
    store.removeItem(storageKeyForArticle(key))
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function loadFromStorage(key: string): ArticleView | null {
  const store = getLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(storageKeyForArticle(key))
    if (!raw) return null
    const normalized = normalizeArticleView(JSON.parse(raw))
    if (!normalized) {
      removeFromStorage(key)
      return null
    }
    return normalized
  } catch {
    removeFromStorage(key)
    return null
  }
}

function saveToStorage(key: string, view: ArticleView): void {
  const store = getLocalStorage()
  if (!store) return
  const normalized = normalizeArticleView(view)
  if (!normalized) return
  try {
    store.setItem(storageKeyForArticle(key), JSON.stringify(normalized))
  } catch {
    // Most likely a QuotaExceededError. The in-memory cache still works.
  }
}

function normalizeTitleForCache(title: string): string {
  return title.trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

function articleCacheKey(host: string, title: string): string {
  return `${host}\0${normalizeTitleForCache(title)}`
}

/** Fetches the lead image + short description for an article — the "view" for a reading screen's hero. */
export async function fetchArticleView(
  title: string,
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<ArticleView> {
  const trimmed = title.trim()
  if (!trimmed.length) {
    throw new Error('No article title given.')
  }

  const lang = options.lang ?? 'en'
  const host = wikiHostFromLang(lang)
  const key = articleCacheKey(host, trimmed)

  let cached = articleViewCache.get(key)
  let cacheSource: 'memory' | 'localStorage' | null = cached ? 'memory' : null
  if (!cached) {
    const stored = loadFromStorage(key)
    if (stored) {
      articleViewCache.set(key, stored)
      cached = stored
      cacheSource = 'localStorage'
    }
  }
  if (cached) {
    console.info(`${LOG_PREFIX} load from cache`, {
      host,
      title: trimmed,
      source: cacheSource,
    })
    return cached
  }

  let viewPromise = inFlightFetches.get(key)
  if (!viewPromise) {
    viewPromise = (async (): Promise<ArticleView> => {
      const params = new URLSearchParams({
        action: 'query',
        prop: 'pageimages|description',
        titles: trimmed,
        piprop: 'thumbnail',
        pithumbsize: String(THUMBNAIL_SIZE),
        format: 'json',
        formatversion: '2',
        origin: '*',
      })

      console.info(`${LOG_PREFIX} fetching from network`, {
        host,
        title: trimmed,
      })

      const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
        signal: options.signal,
        headers: wikimediaApiFetchHeaders('article-view'),
      })

      if (!response.ok) {
        throw new Error(`Failed to load "${trimmed}".`)
      }

      const data = (await response.json()) as {
        query?: {
          pages?: Array<{
            title?: string
            description?: string
            thumbnail?: { source?: string }
            missing?: boolean
          }>
        }
      }

      const page = data.query?.pages?.[0]
      if (!page || page.missing || typeof page.title !== 'string') {
        throw new Error(`"${trimmed}" was not found.`)
      }

      const view: ArticleView = {
        title: page.title,
        description: page.description ?? '',
        thumbnailUrl: page.thumbnail?.source ?? null,
      }
      articleViewCache.set(key, view)
      saveToStorage(key, view)
      console.info(`${LOG_PREFIX} fetch OK (cached)`, {
        host,
        title: trimmed,
      })
      return view
    })().finally(() => {
      inFlightFetches.delete(key)
    })
    inFlightFetches.set(key, viewPromise)
  } else {
    console.info(`${LOG_PREFIX} coalesced with in-flight fetch`, {
      host,
      title: trimmed,
    })
  }

  return viewPromise
}
