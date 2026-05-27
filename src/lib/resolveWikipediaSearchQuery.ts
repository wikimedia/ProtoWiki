import { wikiHostFromLang } from '@/lib/config'
import { stripSearchSnippetHtml } from '@/lib/fetchMorelikeSearch'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) morelike-search'

const SEARCH_FETCH_LIMIT = 5
const MAX_SEEDS = 3
const BROAD_QUERY_MIN_WORDS = 3

export type ResolveStrategy = 'title' | 'search'

export interface ResolvedSeedPage {
  title: string
  pageid: number
  snippet?: string
}

export interface ResolveWikipediaSearchQueryResult {
  pages: ResolvedSeedPage[]
  strategy: ResolveStrategy
}

export class ResolveWikipediaSearchQueryError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_query' | 'no_results' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'ResolveWikipediaSearchQueryError'
  }
}

export interface ResolveWikipediaSearchQueryOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ResolveWikipediaSearchQueryError('Request aborted', 'aborted')
  }
}

function actionUrl(wikiHost: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isBroadQuery(query: string): boolean {
  return wordCount(query) >= BROAD_QUERY_MIN_WORDS
}

function pickSearchSeeds(
  hits: ResolvedSeedPage[],
  query: string,
): ResolvedSeedPage[] {
  if (!hits.length) return []

  const picked: ResolvedSeedPage[] = [hits[0]]
  const broad = isBroadQuery(query)

  if (broad) {
    for (let i = 1; i < Math.min(hits.length, MAX_SEEDS); i++) {
      picked.push(hits[i])
    }
  }

  return picked
}

async function resolveByExactTitle(
  query: string,
  wikiHost: string,
  signal?: AbortSignal,
): Promise<ResolvedSeedPage | null> {
  assertNotAborted(signal)

  const response = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      titles: query,
      redirects: '1',
    }),
    {
      signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    },
  )

  if (!response.ok) {
    throw new ResolveWikipediaSearchQueryError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string
        pageid?: number
        missing?: boolean
      }>
    }
  }

  const page = data.query?.pages?.[0]
  if (!page || page.missing) return null

  const title = typeof page.title === 'string' ? page.title.trim() : ''
  if (!title.length) return null

  return {
    title,
    pageid: typeof page.pageid === 'number' ? page.pageid : 0,
  }
}

async function resolveByFullTextSearch(
  query: string,
  wikiHost: string,
  signal?: AbortSignal,
): Promise<ResolvedSeedPage[]> {
  assertNotAborted(signal)

  const response = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      list: 'search',
      srsearch: query,
      srwhat: 'text',
      srnamespace: '0',
      srlimit: String(SEARCH_FETCH_LIMIT),
      srprop: 'snippet',
    }),
    {
      signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    },
  )

  if (!response.ok) {
    throw new ResolveWikipediaSearchQueryError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      search?: Array<{
        title?: string
        pageid?: number
        snippet?: string
      }>
    }
  }

  const seen = new Set<string>()
  const hits: ResolvedSeedPage[] = []

  for (const hit of data.query?.search ?? []) {
    const title = typeof hit.title === 'string' ? hit.title.trim() : ''
    if (!title.length) continue

    const key = normalizeTitleKey(title)
    if (seen.has(key)) continue
    seen.add(key)

    const snippet = stripSearchSnippetHtml(typeof hit.snippet === 'string' ? hit.snippet : '')
    hits.push({
      title,
      pageid: typeof hit.pageid === 'number' ? hit.pageid : 0,
      snippet: snippet.length ? snippet : undefined,
    })
  }

  return pickSearchSeeds(hits, query)
}

/**
 * Map free-text input to 1–3 Wikipedia article titles (title lookup, then Cirrus full-text).
 */
export async function resolveWikipediaSearchQuery(
  rawQuery: string,
  options: ResolveWikipediaSearchQueryOptions = {},
): Promise<ResolveWikipediaSearchQueryResult> {
  const query = rawQuery.trim()
  if (!query.length) {
    throw new ResolveWikipediaSearchQueryError('Enter a search query', 'empty_query')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  assertNotAborted(options.signal)

  const titleHit = await resolveByExactTitle(query, wikiHost, options.signal)
  if (titleHit) {
    return { pages: [titleHit], strategy: 'title' }
  }

  const searchHits = await resolveByFullTextSearch(query, wikiHost, options.signal)
  if (!searchHits.length) {
    throw new ResolveWikipediaSearchQueryError(
      'No Wikipedia pages matched that query',
      'no_results',
    )
  }

  return { pages: searchHits, strategy: 'search' }
}
