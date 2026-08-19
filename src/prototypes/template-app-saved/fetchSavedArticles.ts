import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

import { SAVED_COLLECTIONS } from './collections'

const ARTICLE_COUNT = 10
const MIN_COLLAGE_COUNT = 4
const STORAGE_PREFIX = 'protowiki:savedArticles:v1:'

const savedArticlesCache = new Map<string, SavedArticle[]>()

export interface SavedArticle {
  pageid: number
  title: string
  description: string
  thumbnailUrl: string | null
  /** IDs into `SAVED_COLLECTIONS` — an article may belong to none. */
  collectionIds: string[]
}

interface RandomSummary {
  pageid: number
  title: string
  description: string
  thumbnailUrl: string | null
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function isSavedArticle(value: unknown): value is SavedArticle {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.pageid === 'number' &&
    typeof record.title === 'string' &&
    typeof record.description === 'string' &&
    (record.thumbnailUrl === null || typeof record.thumbnailUrl === 'string') &&
    Array.isArray(record.collectionIds) &&
    record.collectionIds.every((id) => typeof id === 'string')
  )
}

function loadFromStorage(lang: string): SavedArticle[] | null {
  const store = getLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_PREFIX + lang)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isSavedArticle)) {
      store.removeItem(STORAGE_PREFIX + lang)
      return null
    }
    return parsed
  } catch {
    try {
      store.removeItem(STORAGE_PREFIX + lang)
    } catch {
      // Private mode or blocked storage — ignore.
    }
    return null
  }
}

function saveToStorage(lang: string, articles: SavedArticle[]): void {
  const store = getLocalStorage()
  if (!store) return
  try {
    store.setItem(STORAGE_PREFIX + lang, JSON.stringify(articles))
  } catch {
    // Quota or private-mode failures — the in-memory cache still works.
  }
}

function readCachedSavedArticles(lang: string): SavedArticle[] | null {
  const memory = savedArticlesCache.get(lang)
  if (memory) return memory
  const stored = loadFromStorage(lang)
  if (stored) savedArticlesCache.set(lang, stored)
  return stored
}

async function fetchRandomSummary(
  host: string,
  signal?: AbortSignal,
): Promise<RandomSummary | null> {
  const response = await fetch(`https://${host}/api/rest_v1/page/random/summary`, {
    signal,
    headers: wikimediaApiFetchHeaders('saved-random-article'),
  })
  if (!response.ok) return null

  const data = (await response.json()) as {
    pageid?: number
    title?: string
    description?: string
    thumbnail?: { source?: string }
  }

  if (typeof data.pageid !== 'number' || typeof data.title !== 'string') return null

  return {
    pageid: data.pageid,
    title: data.title,
    description: data.description ?? '',
    thumbnailUrl: data.thumbnail?.source ?? null,
  }
}

/** Assigns 0–2 random collections per article — most get one, some get none. */
function assignRandomCollections(): string[] {
  if (!SAVED_COLLECTIONS.length || Math.random() < 0.4) return []

  const shuffled = [...SAVED_COLLECTIONS].sort(() => Math.random() - 0.5)
  const count = Math.random() < 0.8 ? 1 : Math.min(2, shuffled.length)
  return shuffled.slice(0, count).map((collection) => collection.id)
}

/**
 * Guarantees at least one collection has enough articles for the 2×2 collage.
 * Prefers the collection that already has the most members so other collections
 * stay small enough to show the single-image layout.
 */
function ensureOneLargeCollection(articles: SavedArticle[]): void {
  if (!SAVED_COLLECTIONS.length || articles.length < MIN_COLLAGE_COUNT) return

  const counts = new Map<string, number>()
  for (const collection of SAVED_COLLECTIONS) counts.set(collection.id, 0)
  for (const article of articles) {
    for (const id of article.collectionIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  let targetId: string | null = null
  let maxCount = -1
  for (const collection of SAVED_COLLECTIONS) {
    const count = counts.get(collection.id) ?? 0
    if (count >= MIN_COLLAGE_COUNT) return
    if (count > maxCount) {
      maxCount = count
      targetId = collection.id
    }
  }
  if (!targetId) return

  for (const article of articles) {
    if ((counts.get(targetId) ?? 0) >= MIN_COLLAGE_COUNT) break
    if (!article.collectionIds.includes(targetId)) {
      article.collectionIds.push(targetId)
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1)
    }
  }
}

export function getCachedSavedArticles(lang = 'en'): SavedArticle[] | null {
  return readCachedSavedArticles(lang)
}

/** Loads a random batch of "saved" articles, some assigned to mock collections. */
export async function fetchSavedArticles(
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<SavedArticle[]> {
  const lang = options.lang ?? 'en'
  const cached = readCachedSavedArticles(lang)
  if (cached) return cached

  const host = wikiHostFromLang(lang)

  const results = await Promise.all(
    Array.from({ length: ARTICLE_COUNT }, () => fetchRandomSummary(host, options.signal)),
  )

  const seen = new Set<number>()
  const unique = results.filter((result): result is RandomSummary => {
    if (!result || seen.has(result.pageid)) return false
    seen.add(result.pageid)
    return true
  })

  const articles = unique.map((article) => ({
    ...article,
    collectionIds: assignRandomCollections(),
  }))
  ensureOneLargeCollection(articles)
  savedArticlesCache.set(lang, articles)
  saveToStorage(lang, articles)
  return articles
}
