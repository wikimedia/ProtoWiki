import { wikimediaApiFetchHeaders } from '@/config'

import { prepareMobileArticleDocument } from './prepareMobileArticleDocument'

export type ArticleBody = { html: string; liveTitle: string }

/**
 * REST `page/mobile-html` payload: a complete document for
 * {@link AppArticlePcsRenderer} to hand to an iframe.
 */
export type MobileArticleBody = ArticleBody

const articleBodyCache = new Map<string, ArticleBody>()
const mobileArticleBodyCache = new Map<string, MobileArticleBody>()
const inFlightFetches = new Map<string, Promise<ArticleBody>>()
const inFlightMobileFetches = new Map<string, Promise<MobileArticleBody>>()

const STORAGE_PREFIX = 'protowiki:articleBody:v1:'
const MOBILE_STORAGE_PREFIX = 'protowiki:mobileArticleBody:v2:'
const LOG_PREFIX = '[ProtoWiki][fetchArticleBody]'
const MOBILE_LOG_PREFIX = '[ProtoWiki][fetchMobileArticleBody]'

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function normalizeArticleBody(value: unknown): ArticleBody | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.html !== 'string' || typeof record.liveTitle !== 'string') return null
  return { html: record.html, liveTitle: record.liveTitle }
}

function storageKeyForArticle(prefix: string, key: string): string {
  return prefix + key
}

function removeFromStorage(prefix: string, key: string): void {
  const store = getLocalStorage()
  if (!store) return
  try {
    store.removeItem(storageKeyForArticle(prefix, key))
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function loadFromStorage(prefix: string, key: string): ArticleBody | null {
  const store = getLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(storageKeyForArticle(prefix, key))
    if (!raw) return null
    const normalized = normalizeArticleBody(JSON.parse(raw))
    if (!normalized) {
      removeFromStorage(prefix, key)
      return null
    }
    return normalized
  } catch {
    removeFromStorage(prefix, key)
    return null
  }
}

function saveToStorage(prefix: string, key: string, body: ArticleBody): void {
  const store = getLocalStorage()
  if (!store) return
  const normalized = normalizeArticleBody(body)
  if (!normalized) return
  try {
    store.setItem(storageKeyForArticle(prefix, key), JSON.stringify(normalized))
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

export function extractParserOutput(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1]
  return raw
}

export interface FetchArticleBodyOptions {
  signal?: AbortSignal
}

/**
 * Fetches parsed article HTML via REST `page/html` — shared by `ArticleLive`.
 * Uses memory + localStorage cache and coalesces in-flight requests per host + title.
 */
export async function fetchArticleBody(
  title: string,
  host: string,
  options: FetchArticleBodyOptions = {},
): Promise<ArticleBody> {
  const trimmed = title.trim()
  if (!trimmed.length) {
    throw new Error('No article title given.')
  }

  const key = articleCacheKey(host, trimmed)
  let cached = articleBodyCache.get(key)
  let cacheSource: 'memory' | 'localStorage' | null = cached ? 'memory' : null
  if (!cached) {
    const stored = loadFromStorage(STORAGE_PREFIX, key)
    if (stored) {
      articleBodyCache.set(key, stored)
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

  let bodyPromise = inFlightFetches.get(key)
  if (!bodyPromise) {
    bodyPromise = (async (): Promise<ArticleBody> => {
      const url = `https://${host}/api/rest_v1/page/html/${encodeURIComponent(trimmed)}`
      console.info(`${LOG_PREFIX} fetching from network`, {
        host,
        title: trimmed,
        url,
      })
      const response = await fetch(url, {
        signal: options.signal,
        headers: {
          Accept: 'text/html; charset=utf-8',
          ...wikimediaApiFetchHeaders('page-html'),
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      const text = await response.text()
      const html = extractParserOutput(text)
      const liveTitleResolved = trimmed.replace(/_/g, ' ')
      const body: ArticleBody = { html, liveTitle: liveTitleResolved }
      articleBodyCache.set(key, body)
      saveToStorage(STORAGE_PREFIX, key, body)
      console.info(`${LOG_PREFIX} fetch OK (cached)`, {
        host,
        title: trimmed,
        htmlChars: html.length,
      })
      return body
    })().finally(() => {
      inFlightFetches.delete(key)
    })
    inFlightFetches.set(key, bodyPromise)
  } else {
    console.info(`${LOG_PREFIX} coalesced with in-flight fetch`, {
      host,
      title: trimmed,
    })
  }

  return bodyPromise
}

/**
 * Fetches mobile-optimized article HTML via REST `page/mobile-html` for
 * {@link AppArticleLive}. Returns the whole document, for iframe rendering.
 */
export async function fetchMobileArticleBody(
  title: string,
  host: string,
  options: FetchArticleBodyOptions = {},
): Promise<MobileArticleBody> {
  const trimmed = title.trim()
  if (!trimmed.length) {
    throw new Error('No article title given.')
  }

  const key = articleCacheKey(host, trimmed)
  let cached = mobileArticleBodyCache.get(key)
  let cacheSource: 'memory' | 'localStorage' | null = cached ? 'memory' : null
  if (!cached) {
    const stored = loadFromStorage(MOBILE_STORAGE_PREFIX, key)
    if (stored) {
      mobileArticleBodyCache.set(key, stored)
      cached = stored
      cacheSource = 'localStorage'
    }
  }
  if (cached) {
    console.info(`${MOBILE_LOG_PREFIX} load from cache`, {
      host,
      title: trimmed,
      source: cacheSource,
    })
    return cached
  }

  let bodyPromise = inFlightMobileFetches.get(key)
  if (!bodyPromise) {
    bodyPromise = (async (): Promise<MobileArticleBody> => {
      const url = `https://${host}/api/rest_v1/page/mobile-html/${encodeURIComponent(trimmed)}`
      console.info(`${MOBILE_LOG_PREFIX} fetching from network`, {
        host,
        title: trimmed,
        url,
      })
      const response = await fetch(url, {
        signal: options.signal,
        headers: {
          Accept: 'text/html; charset=utf-8',
          ...wikimediaApiFetchHeaders('page-mobile-html'),
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      const text = await response.text()
      const prepared = prepareMobileArticleDocument(text)
      const body: MobileArticleBody = {
        html: prepared.html,
        liveTitle: trimmed.replace(/_/g, ' '),
      }
      mobileArticleBodyCache.set(key, body)
      saveToStorage(MOBILE_STORAGE_PREFIX, key, body)
      console.info(`${MOBILE_LOG_PREFIX} fetch OK (cached)`, {
        host,
        title: trimmed,
        htmlChars: body.html.length,
      })
      return body
    })().finally(() => {
      inFlightMobileFetches.delete(key)
    })
    inFlightMobileFetches.set(key, bodyPromise)
  } else {
    console.info(`${MOBILE_LOG_PREFIX} coalesced with in-flight fetch`, {
      host,
      title: trimmed,
    })
  }

  return bodyPromise
}
