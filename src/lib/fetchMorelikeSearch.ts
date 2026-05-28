import { FUZZY_MORELIKE_CIRRUS_MLT, buildMorelikeQuery } from '@/lib/cirrusSearchTuning'
import { wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) morelike-search'

const DEFAULT_LIMIT = 20

export class FetchMorelikeSearchError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_seeds' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchMorelikeSearchError'
  }
}

export interface MorelikeSearchResult {
  title: string
  snippet: string
  pageid: number
}

export interface FetchMorelikeSearchResponse {
  results: MorelikeSearchResult[]
  nextOffset?: number
}

export interface FetchMorelikeSearchOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
  /** Result limit per request (default 20). */
  limit?: number
  /** Pagination offset from a prior response. */
  offset?: number
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchMorelikeSearchError('Request aborted', 'aborted')
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

export function stripSearchSnippetHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  }
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Cirrus Search "more like this" via Action API `list=search`.
 */
export async function fetchMorelikeSearch(
  seedTitles: string[],
  options: FetchMorelikeSearchOptions = {},
): Promise<FetchMorelikeSearchResponse> {
  const seeds = seedTitles.map((title) => title.trim()).filter(Boolean)
  if (!seeds.length) {
    throw new FetchMorelikeSearchError('Enter at least one seed page', 'empty_seeds')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 50))
  const offset = Math.max(0, options.offset ?? 0)
  const seedKeys = new Set(seeds.map(normalizeTitleKey))

  assertNotAborted(options.signal)

  const params: Record<string, string> = {
    action: 'query',
    list: 'search',
    srsearch: buildMorelikeQuery(seeds),
    srwhat: 'text',
    srnamespace: '0',
    srlimit: String(limit),
    sroffset: String(offset),
    srprop: 'snippet',
    ...FUZZY_MORELIKE_CIRRUS_MLT,
  }

  const response = await fetch(actionUrl(wikiHost, params), {
    signal: options.signal,
    headers: { 'Api-User-Agent': API_USER_AGENT },
  })

  if (!response.ok) {
    throw new FetchMorelikeSearchError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      search?: Array<{
        title?: string
        pageid?: number
        snippet?: string
      }>
    }
    continue?: { sroffset?: number }
  }

  const results: MorelikeSearchResult[] = []

  for (const hit of data.query?.search ?? []) {
    const title = typeof hit.title === 'string' ? hit.title.trim() : ''
    if (!title.length) continue
    if (seedKeys.has(normalizeTitleKey(title))) continue

    results.push({
      title,
      pageid: typeof hit.pageid === 'number' ? hit.pageid : 0,
      snippet: stripSearchSnippetHtml(typeof hit.snippet === 'string' ? hit.snippet : ''),
    })
  }

  const nextOffset =
    typeof data.continue?.sroffset === 'number' ? data.continue.sroffset : undefined

  return { results, nextOffset }
}
