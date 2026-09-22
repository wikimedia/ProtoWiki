import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { fetchWikitabSearch, type WikitabSearchResult } from './fetchWikitabSearch'
import { filterDisambiguationPageIds } from './filterDisambiguationPages'
import { EN_WIKI_HOST, articleUrl } from './wikitabHtml'

const GENERATOR_BATCH_SIZE = 20
const INITIAL_MORELIKE_BATCH_SIZE = 5
const THUMBNAIL_SIZE = 200
const TITLE_SEARCH_LIMIT = 5

const MAX_EXACT = 1
const MAX_NEAR = 1
const MAX_MATCH = 1
export type WikitabSearchRelation = 'exact' | 'near' | 'match' | 'related'

export interface WikitabSearchArticle {
  pageid: number
  title: string
  description?: string
  extract: string
  /** Full-text hit context — `searchmatch` spans converted to `<strong>`. */
  matchSnippetHtml?: string
  thumbnailUrl?: string
  href: string
  relation: WikitabSearchRelation
  seedTitle?: string
}

export interface WikitabSearchArticlesBatch {
  articles: WikitabSearchArticle[]
  nextOffset: number | null
}

export interface MorelikeSeedState {
  seedTitle: string
  nextOffset: number | null
  /** Fetched articles not yet merged into the visible list. */
  pending: WikitabSearchArticle[]
}

export interface WikitabSearchArticlesInitial {
  curated: WikitabSearchArticle[]
  related: WikitabSearchArticle[]
  morelikeState: MorelikeSeedState[]
}

interface RawPage {
  pageid?: number
  title?: string
  description?: string
  extract?: string
  snippet?: string
  thumbnail?: { source?: string }
  /** Generator rank — Object.values(pages) is not ordered. */
  index?: number
}

interface RawQueryResponse {
  continue?: { gsroffset?: number }
  query?: { pages?: Record<string, RawPage> }
}

function isExactTitleMatch(query: string, title: string): boolean {
  return query.trim().toLowerCase() === title.trim().toLowerCase()
}

/** CirrusSearch full-text query — user's query passed unquoted. */
function buildTextMatchGsrsearch(query: string): string {
  return query.trim()
}

function sortPagesByGeneratorIndex(pages: RawPage[]): RawPage[] {
  return [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function stripSnippetHtml(html: string): string {
  return html
    .replace(/<span class="searchmatch">/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[\s()]+/)
      .filter(Boolean),
  )
}

function snippetNeedsLeadingEllipsis(plainText: string, articleTitle: string): boolean {
  const trimmed = plainText.trim()
  if (!trimmed.length) return false

  const firstWord = trimmed.split(/\s+/)[0]?.replace(/[.,;:!?…]+$/, '').toLowerCase()
  if (!firstWord) return false
  if (firstWord[0] >= 'a' && firstWord[0] <= 'z') return true

  return !titleWords(articleTitle).has(firstWord)
}

function snippetNeedsTrailingEllipsis(plainText: string): boolean {
  return !/[.!?…]["']?\s*$/.test(plainText.trim())
}

/** explaintext strips IPA but often leaves empty parens, e.g. "Dada () or". */
function stripEmptyParentheses(text: string): string {
  return text.replace(/\s*\(\s*\)/g, '')
}

/** CirrusSearch wraps hits in span.searchmatch — swap for semantic bold. */
function formatSearchMatchSnippet(snippet: string, articleTitle: string): string {
  let html = snippet
    .replace(/<span class="searchmatch">/gi, '<strong>')
    .replace(/<\/span>/gi, '</strong>')

  const plain = stripSnippetHtml(html)
  if (snippetNeedsLeadingEllipsis(plain, articleTitle)) {
    html = `…${html}`
  }
  if (snippetNeedsTrailingEllipsis(plain)) {
    html = `${html}…`
  }

  return html
}

function mapPage(
  raw: RawPage,
  relation: WikitabSearchRelation,
  meta: { seedTitle?: string } = {},
): WikitabSearchArticle | null {
  if (typeof raw.pageid !== 'number' || typeof raw.title !== 'string') return null

  const snippet = raw.snippet?.trim()
  const matchSnippetHtml =
    relation === 'match' && snippet ? formatSearchMatchSnippet(snippet, raw.title) : undefined

  return {
    pageid: raw.pageid,
    title: raw.title,
    description: raw.description?.trim() || undefined,
    extract: matchSnippetHtml
      ? ''
      : stripEmptyParentheses((raw.extract ?? '').trim()),
    matchSnippetHtml,
    thumbnailUrl: normalizeThumbnailUrl(raw.thumbnail?.source),
    href: articleUrl(raw.title),
    relation,
    seedTitle: relation === 'related' ? meta.seedTitle : undefined,
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

async function filterArticles(
  articles: WikitabSearchArticle[],
  excludePageids: Set<number>,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchArticle[]> {
  const unseen = articles.filter((article) => !excludePageids.has(article.pageid))
  if (!unseen.length) return []

  const disambiguationIds = await filterDisambiguationPageIds(
    unseen.map((article) => article.pageid),
    { signal },
  )

  return unseen.filter((article) => !disambiguationIds.has(article.pageid))
}

async function fetchSearchGeneratorBatch(
  gsrsearch: string,
  offset: number | undefined,
  excludePageids: Set<number>,
  relation: 'match' | 'related',
  seedTitle: string | undefined,
  signal: AbortSignal | undefined,
  options: { includeSnippet?: boolean; batchSize?: number } = {},
): Promise<WikitabSearchArticlesBatch> {
  const params: Record<string, string> = {
    generator: 'search',
    gsrsearch,
    gsrnamespace: '0',
    gsrlimit: String(options.batchSize ?? GENERATOR_BATCH_SIZE),
  }

  if (options.includeSnippet) {
    params.gsrprop = 'snippet'
  }

  if (offset !== undefined) {
    params.gsroffset = String(offset)
  }

  const { pages, nextOffset } = await fetchActionApiPages(params, signal)

  const articles = pages
    .map((page) => mapPage(page, relation, { seedTitle }))
    .filter((article): article is WikitabSearchArticle => article !== null)

  return {
    articles: await filterArticles(articles, excludePageids, signal),
    nextOffset,
  }
}

function classifyTitleHits(
  query: string,
  results: WikitabSearchResult[],
): { exact: WikitabSearchResult | null; near: WikitabSearchResult[] } {
  const exact = results.find((hit) => isExactTitleMatch(query, hit.title)) ?? null
  if (exact) return { exact, near: [] }
  return { exact: null, near: results.slice(0, MAX_NEAR) }
}

export async function resolveWikitabSearchTitleHits(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<{
  trimmed: string
  exactHit: WikitabSearchResult | null
  nearHits: WikitabSearchResult[]
}> {
  const trimmed = query.trim()
  const titleResults = await fetchWikitabSearch(trimmed, {
    signal: options.signal,
    limit: TITLE_SEARCH_LIMIT,
  })
  const { exact, near } = classifyTitleHits(trimmed, titleResults)
  return { trimmed, exactHit: exact, nearHits: near }
}

export async function enrichTitleHits(
  hits: WikitabSearchResult[],
  relationByPageid: Map<number, 'exact' | 'near'>,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchArticle[]> {
  if (!hits.length) return []

  const titles = hits.map((hit) => hit.title).join('|')
  const { pages } = await fetchActionApiPages({ titles }, signal)
  const pageById = new Map(pages.map((page) => [page.pageid, page]))

  const articles: WikitabSearchArticle[] = []
  for (const hit of hits) {
    const raw = pageById.get(hit.id)
    const relation = relationByPageid.get(hit.id)
    if (!raw || !relation) continue

    const mapped = mapPage(raw, relation)
    if (!mapped) continue

    if (!mapped.description && hit.description) mapped.description = hit.description
    if (!mapped.thumbnailUrl && hit.thumbnailUrl) mapped.thumbnailUrl = hit.thumbnailUrl
    articles.push(mapped)
  }

  return articles
}

/** Round-robin interleave pending queues; skip dupes and advance to the next item. */
export function drainMorelikeRoundRobin(
  seeds: MorelikeSeedState[],
  seen: Set<number>,
): WikitabSearchArticle[] {
  const related: WikitabSearchArticle[] = []
  let progressed = true

  while (progressed) {
    progressed = false
    for (const seed of seeds) {
      while (seed.pending.length) {
        const article = seed.pending.shift()!
        if (seen.has(article.pageid)) continue
        seen.add(article.pageid)
        related.push(article)
        progressed = true
        break
      }
    }
  }

  return related
}

function mergeMorelikeRoundRobin(
  batches: Array<{ seedTitle: string; batch: WikitabSearchArticlesBatch }>,
  seen: Set<number>,
): { related: WikitabSearchArticle[]; morelikeState: MorelikeSeedState[] } {
  const morelikeState: MorelikeSeedState[] = batches.map(({ seedTitle, batch }) => ({
    seedTitle,
    nextOffset: batch.nextOffset,
    pending: [...batch.articles],
  }))

  const related = drainMorelikeRoundRobin(morelikeState, seen)
  return { related, morelikeState }
}

/** Morelike is seeded from the top curated hit only (exact, else near, else match). */
function buildMorelikeSeed(curated: WikitabSearchArticle[]): string | null {
  return curated[0]?.title ?? null
}

function buildTitleRelationMap(
  exactHit: WikitabSearchResult | null,
  nearHits: WikitabSearchResult[],
): Map<number, 'exact' | 'near'> {
  const relationByPageid = new Map<number, 'exact' | 'near'>()
  if (exactHit) relationByPageid.set(exactHit.id, 'exact')
  for (const hit of nearHits) relationByPageid.set(hit.id, 'near')
  return relationByPageid
}

/** One full-text match slot, excluding pages already on screen. */
export async function fetchWikitabSearchTextMatch(
  query: string,
  seen: Set<number>,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchArticle | null> {
  const batch = await fetchSearchGeneratorBatch(
    buildTextMatchGsrsearch(query),
    undefined,
    seen,
    'match',
    undefined,
    signal,
    { includeSnippet: true, batchSize: MAX_MATCH + 5 },
  )

  for (const article of batch.articles) {
    if (seen.has(article.pageid)) continue
    return article
  }

  return null
}

/** Curated slots: exact / near title hits + one full-text match (sequential). */
export async function fetchWikitabSearchArticlesCurated(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<{ curated: WikitabSearchArticle[] }> {
  const { signal } = options
  const curated: WikitabSearchArticle[] = []
  const seen = new Set<number>()

  const { trimmed, exactHit, nearHits } = await resolveWikitabSearchTitleHits(query, { signal })

  const titleHitsToEnrich = [
    ...(exactHit ? [exactHit] : []),
    ...nearHits,
  ].slice(0, MAX_EXACT + MAX_NEAR)

  if (titleHitsToEnrich.length) {
    const titleArticles = await enrichTitleHits(
      titleHitsToEnrich,
      buildTitleRelationMap(exactHit, nearHits),
      signal,
    )
    for (const article of titleArticles) {
      if (seen.has(article.pageid)) continue
      seen.add(article.pageid)
      curated.push(article)
    }
  }

  const match = await fetchWikitabSearchTextMatch(trimmed, seen, signal)
  if (match) {
    seen.add(match.pageid)
    curated.push(match)
  }

  return { curated }
}

/** Initial morelike batch seeded from the top curated hit (small first page). */
export async function fetchWikitabSearchArticlesRelated(
  curated: WikitabSearchArticle[],
  options: { signal?: AbortSignal } = {},
): Promise<{ related: WikitabSearchArticle[]; morelikeState: MorelikeSeedState[] }> {
  const { signal } = options

  const seen = new Set<number>(curated.map((article) => article.pageid))
  const seedTitle = buildMorelikeSeed(curated)
  if (!seedTitle) return { related: [], morelikeState: [] }

  const batch = await fetchSearchGeneratorBatch(
    `morelike:${seedTitle}`,
    undefined,
    seen,
    'related',
    seedTitle,
    signal,
    { batchSize: INITIAL_MORELIKE_BATCH_SIZE },
  )

  return mergeMorelikeRoundRobin([{ seedTitle, batch }], seen)
}

/** First page of search results: curated slots + initial morelike batches. */
export async function fetchWikitabSearchArticlesInitial(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<WikitabSearchArticlesInitial> {
  const { signal } = options
  const { curated } = await fetchWikitabSearchArticlesCurated(query, { signal })
  const { related, morelikeState } = await fetchWikitabSearchArticlesRelated(curated, { signal })
  return { curated, related, morelikeState }
}

/** Paginated morelike results for infinite scroll (one seed at a time). */
export async function fetchWikitabSearchArticlesMore(
  seedTitle: string,
  offset: number,
  excludePageids: Set<number>,
  options: { signal?: AbortSignal } = {},
): Promise<WikitabSearchArticlesBatch> {
  return fetchSearchGeneratorBatch(
    `morelike:${seedTitle}`,
    offset,
    excludePageids,
    'related',
    seedTitle,
    options.signal,
  )
}

export interface WikitabSearchTopTitle {
  pageid: number
  title: string
  thumbnailUrl?: string
}

/** Top N article titles for a search query (curated + related). */
export async function fetchWikitabSearchTopTitles(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<WikitabSearchTopTitle[]> {
  const limit = options.limit ?? 6
  const { signal } = options
  const { curated, related } = await fetchWikitabSearchArticlesInitial(query, { signal })

  return [...curated, ...related].slice(0, limit).map((article) => ({
    pageid: article.pageid,
    title: article.title,
    thumbnailUrl: article.thumbnailUrl,
  }))
}
