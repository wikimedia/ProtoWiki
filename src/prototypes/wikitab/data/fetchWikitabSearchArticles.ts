import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { fetchWikitabSearch } from './fetchWikitabSearch'
import { filterDisambiguationPageIds } from './filterDisambiguationPages'
import { EN_WIKI_HOST, articleUrl } from './wikitabHtml'

const MORELIKE_BATCH_SIZE = 20
const THUMBNAIL_SIZE = 200

export interface WikitabSearchArticle {
  pageid: number
  title: string
  description?: string
  extract: string
  thumbnailUrl?: string
  href: string
  relation: 'exact' | 'near' | 'related'
  seedTitle?: string
}

function isExactTitleMatch(query: string, title: string): boolean {
  return query.trim().toLowerCase() === title.trim().toLowerCase()
}

export interface WikitabSearchArticlesBatch {
  articles: WikitabSearchArticle[]
  nextOffset: number | null
}

interface RawPage {
  pageid?: number
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
  /** Generator rank — Object.values(pages) is not ordered. */
  index?: number
}

interface RawQueryResponse {
  continue?: { gsroffset?: number }
  query?: { pages?: Record<string, RawPage> }
}

function sortPagesByGeneratorIndex(pages: RawPage[]): RawPage[] {
  return [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function mapPage(
  raw: RawPage,
  relation: 'exact' | 'near' | 'related',
  seedTitle?: string,
): WikitabSearchArticle | null {
  if (typeof raw.pageid !== 'number' || typeof raw.title !== 'string') return null

  return {
    pageid: raw.pageid,
    title: raw.title,
    description: raw.description?.trim() || undefined,
    extract: (raw.extract ?? '').trim(),
    thumbnailUrl: normalizeThumbnailUrl(raw.thumbnail?.source),
    href: articleUrl(raw.title),
    relation,
    seedTitle: relation === 'related' ? seedTitle : undefined,
  }
}

async function fetchActionApiPages(
  params: Record<string, string>,
  signal: AbortSignal | undefined,
): Promise<{ pages: RawPage[]; nextOffset: number | null }> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'pageimages|description|extracts',
    exintro: '1',
    explaintext: '1',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    ...params,
  })

  const response = await fetchWikimedia(`https://${EN_WIKI_HOST}/w/api.php?${query.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-search-results'),
  })

  if (!response.ok) {
    throw new Error(`Search articles failed (HTTP ${response.status})`)
  }

  const data = (await response.json()) as RawQueryResponse
  const pages = sortPagesByGeneratorIndex(Object.values(data.query?.pages ?? {}))
  const nextOffset =
    typeof data.continue?.gsroffset === 'number' ? data.continue.gsroffset : null

  return { pages, nextOffset }
}

async function fetchExactMatch(
  query: string,
  title: string,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchArticle | null> {
  const { pages } = await fetchActionApiPages({ titles: title }, signal)
  const page = pages[0]
  if (!page) return null
  const relation = isExactTitleMatch(query, title) ? 'exact' : 'near'
  return mapPage(page, relation)
}

async function fetchMoreLikeBatch(
  seedTitle: string,
  excludePageid: number | null,
  offset: number | undefined,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchArticlesBatch> {
  const params: Record<string, string> = {
    generator: 'search',
    gsrsearch: `morelike:${seedTitle}`,
    gsrnamespace: '0',
    gsrlimit: String(MORELIKE_BATCH_SIZE),
  }

  if (offset !== undefined) {
    params.gsroffset = String(offset)
  }

  const { pages, nextOffset } = await fetchActionApiPages(params, signal)

  const articles = pages
    .filter((page) => page.pageid !== excludePageid)
    .map((page) => mapPage(page, 'related', seedTitle))
    .filter((article): article is WikitabSearchArticle => article !== null)

  const disambiguationIds = await filterDisambiguationPageIds(
    articles.map((article) => article.pageid),
    { signal },
  )

  return {
    articles: articles.filter((article) => !disambiguationIds.has(article.pageid)),
    nextOffset,
  }
}

export interface WikitabSearchArticlesInitial {
  exact: WikitabSearchArticle | null
  related: WikitabSearchArticle[]
  nextOffset: number | null
  seedTitle: string | null
}

/** Resolve a query to a seed title via REST title search. */
export async function resolveWikitabSearchSeed(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<{ title: string; pageid: number } | null> {
  const results = await fetchWikitabSearch(query, { signal: options.signal, limit: 1 })
  const top = results[0]
  if (!top) return null
  return { title: top.title, pageid: top.id }
}

/** First page of search results: exact match + initial morelike batch. */
export async function fetchWikitabSearchArticlesInitial(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<WikitabSearchArticlesInitial> {
  const { signal } = options
  const seed = await resolveWikitabSearchSeed(query, { signal })

  if (!seed) {
    return { exact: null, related: [], nextOffset: null, seedTitle: null }
  }

  const [exact, relatedBatch] = await Promise.all([
    fetchExactMatch(query, seed.title, signal),
    fetchMoreLikeBatch(seed.title, seed.pageid, undefined, signal),
  ])

  return {
    exact,
    related: relatedBatch.articles,
    nextOffset: relatedBatch.nextOffset,
    seedTitle: seed.title,
  }
}

/** Paginated morelike results for infinite scroll. */
export async function fetchWikitabSearchArticlesMore(
  seedTitle: string,
  excludePageid: number | null,
  offset: number,
  options: { signal?: AbortSignal } = {},
): Promise<WikitabSearchArticlesBatch> {
  return fetchMoreLikeBatch(seedTitle, excludePageid, offset, options.signal)
}

export interface WikitabSearchTopTitle {
  pageid: number
  title: string
  thumbnailUrl?: string
}

/** Top N article titles for a search query (seed + related). */
export async function fetchWikitabSearchTopTitles(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<WikitabSearchTopTitle[]> {
  const limit = options.limit ?? 6
  const { signal } = options
  const seed = await resolveWikitabSearchSeed(query, { signal })
  if (!seed) return []

  const relatedBatch = await fetchMoreLikeBatch(seed.title, seed.pageid, undefined, signal)
  const titles: WikitabSearchTopTitle[] = [{ pageid: seed.pageid, title: seed.title }]

  for (const article of relatedBatch.articles) {
    if (titles.length >= limit) break
    titles.push({ pageid: article.pageid, title: article.title })
  }

  return titles
}
