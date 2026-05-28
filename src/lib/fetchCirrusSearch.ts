import { wikiHostFromLang } from '@/lib/config'
import { stripSearchSnippetHtml } from '@/lib/fetchMorelikeSearch'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia/protowiki) cirrus-search-playground'

export class FetchCirrusSearchError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_query' | 'aborted' | 'http' | 'api',
  ) {
    super(message)
    this.name = 'FetchCirrusSearchError'
  }
}

export interface CirrusSearchHit {
  title: string
  snippet: string
  pageid: number
  size?: number
  wordcount?: number
  timestamp?: string
}

export interface FetchCirrusSearchResponse {
  results: CirrusSearchHit[]
  nextOffset?: number
  totalHits?: number
  suggestion?: string
  rewrittenQuery?: string
}

export interface FetchCirrusSearchParams {
  srsearch: string
  srwhat?: string
  srnamespace?: string
  srlimit?: number
  sroffset?: number
  srsort?: string
  srprop?: string
  srinfo?: string
  srqiprofile?: string
  /** Cirrus morelike tuning URL params. */
  cirrusMlt?: Record<string, string>
}

export interface FetchCirrusSearchOptions {
  signal?: AbortSignal
  lang?: string
  params: FetchCirrusSearchParams
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchCirrusSearchError('Request aborted', 'aborted')
  }
}

export function buildCirrusSearchApiUrl(lang: string, params: FetchCirrusSearchParams): string {
  const wikiHost = wikiHostFromLang(lang)
  const searchParams: Record<string, string> = {
    action: 'query',
    list: 'search',
    srsearch: params.srsearch,
    format: 'json',
    formatversion: '2',
    origin: '*',
  }

  if (params.srwhat) searchParams.srwhat = params.srwhat
  if (params.srnamespace) searchParams.srnamespace = params.srnamespace
  if (params.srlimit != null) searchParams.srlimit = String(params.srlimit)
  if (params.sroffset != null) searchParams.sroffset = String(params.sroffset)
  if (params.srsort) searchParams.srsort = params.srsort
  if (params.srprop) searchParams.srprop = params.srprop
  if (params.srinfo) searchParams.srinfo = params.srinfo
  if (params.srqiprofile) searchParams.srqiprofile = params.srqiprofile

  if (params.cirrusMlt) {
    for (const [key, value] of Object.entries(params.cirrusMlt)) {
      if (value !== '') searchParams[key] = value
    }
  }

  return `https://${wikiHost}/w/api.php?${new URLSearchParams(searchParams).toString()}`
}

export async function fetchCirrusSearch(
  options: FetchCirrusSearchOptions,
): Promise<FetchCirrusSearchResponse> {
  const query = options.params.srsearch.trim()
  if (!query.length) {
    throw new FetchCirrusSearchError('Enter a search query', 'empty_query')
  }

  assertNotAborted(options.signal)

  const lang = options.lang ?? 'en'
  const limit = Math.max(1, Math.min(options.params.srlimit ?? 20, 50))
  const offset = Math.max(0, options.params.sroffset ?? 0)

  const url = buildCirrusSearchApiUrl(lang, {
    ...options.params,
    srlimit: limit,
    sroffset: offset,
  })

  const response = await fetch(url, {
    signal: options.signal,
    headers: { 'Api-User-Agent': API_USER_AGENT },
  })

  if (!response.ok) {
    throw new FetchCirrusSearchError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    error?: { code?: string; info?: string }
    query?: {
      searchinfo?: {
        totalhits?: number
        suggestion?: string
        rewrittenquery?: string
      }
      search?: Array<{
        title?: string
        pageid?: number
        snippet?: string
        size?: number
        wordcount?: number
        timestamp?: string
      }>
    }
    continue?: { sroffset?: number }
  }

  if (data.error) {
    throw new FetchCirrusSearchError(data.error.info ?? data.error.code ?? 'API error', 'api')
  }

  const results: CirrusSearchHit[] = []

  for (const hit of data.query?.search ?? []) {
    const title = typeof hit.title === 'string' ? hit.title.trim() : ''
    if (!title.length) continue

    results.push({
      title,
      pageid: typeof hit.pageid === 'number' ? hit.pageid : 0,
      snippet: stripSearchSnippetHtml(typeof hit.snippet === 'string' ? hit.snippet : ''),
      size: typeof hit.size === 'number' ? hit.size : undefined,
      wordcount: typeof hit.wordcount === 'number' ? hit.wordcount : undefined,
      timestamp: typeof hit.timestamp === 'string' ? hit.timestamp : undefined,
    })
  }

  const searchinfo = data.query?.searchinfo
  const nextOffset =
    typeof data.continue?.sroffset === 'number' ? data.continue.sroffset : undefined

  return {
    results,
    nextOffset,
    totalHits: typeof searchinfo?.totalhits === 'number' ? searchinfo.totalhits : undefined,
    suggestion: typeof searchinfo?.suggestion === 'string' ? searchinfo.suggestion : undefined,
    rewrittenQuery:
      typeof searchinfo?.rewrittenquery === 'string' ? searchinfo.rewrittenquery : undefined,
  }
}
