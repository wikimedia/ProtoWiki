import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

import { SAVED_COLLECTIONS } from './collections'

const ARTICLE_COUNT = 10

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

/** Loads a fresh random batch of "saved" articles, some assigned to mock collections. */
export async function fetchSavedArticles(
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<SavedArticle[]> {
  const host = wikiHostFromLang(options.lang ?? 'en')

  const results = await Promise.all(
    Array.from({ length: ARTICLE_COUNT }, () => fetchRandomSummary(host, options.signal)),
  )

  const seen = new Set<number>()
  const unique = results.filter((result): result is RandomSummary => {
    if (!result || seen.has(result.pageid)) return false
    seen.add(result.pageid)
    return true
  })

  return unique.map((article) => ({ ...article, collectionIds: assignRandomCollections() }))
}
