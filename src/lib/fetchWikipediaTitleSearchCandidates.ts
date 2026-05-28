import { fetchCirrusSearch, FetchCirrusSearchError } from '@/lib/fetchCirrusSearch'

export { FetchCirrusSearchError }

const DEFAULT_LIMIT = 10

export interface TitleSearchCandidates {
  query: string
  titles: string[]
}

export interface FetchWikipediaTitleSearchCandidatesOptions {
  signal?: AbortSignal
  lang?: string
  limit?: number
}

/**
 * Top main-namespace Wikipedia titles from Cirrus full-text search for one query.
 */
export async function fetchWikipediaTitleSearchCandidates(
  query: string,
  options: FetchWikipediaTitleSearchCandidatesOptions = {},
): Promise<TitleSearchCandidates> {
  const trimmed = query.trim()
  if (!trimmed.length) {
    return { query: trimmed, titles: [] }
  }

  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 50))
  const response = await fetchCirrusSearch({
    lang: options.lang,
    signal: options.signal,
    params: {
      srsearch: trimmed,
      srnamespace: '0',
      srlimit: limit,
    },
  })

  return {
    query: trimmed,
    titles: response.results.map((hit) => hit.title),
  }
}

/**
 * Search for each query in parallel (deduped). Returns one entry per input query, in order.
 */
export async function fetchWikipediaTitleSearchCandidatesBatch(
  queries: string[],
  options: FetchWikipediaTitleSearchCandidatesOptions = {},
): Promise<TitleSearchCandidates[]> {
  const trimmedQueries = queries.map((query) => query.trim()).filter(Boolean)
  if (!trimmedQueries.length) return []

  const cache = new Map<string, TitleSearchCandidates>()
  const uniqueQueries = [...new Set(trimmedQueries.map((query) => query.toLowerCase()))]

  await Promise.all(
    uniqueQueries.map(async (key) => {
      const query = trimmedQueries.find((entry) => entry.toLowerCase() === key)!
      const result = await fetchWikipediaTitleSearchCandidates(query, options)
      cache.set(key, result)
    }),
  )

  return trimmedQueries.map((query) => cache.get(query.toLowerCase()) ?? { query, titles: [] })
}
