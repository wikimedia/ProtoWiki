import { wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) dashpage-suggestion-mode'

/** Max Action API search pages to walk when filling a morelike batch. */
const MAX_SEARCH_PAGES = 5

export class FetchMorelikePageTitlesError extends Error {
  constructor(
    message: string,
    public readonly code: 'no_seeds' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchMorelikePageTitlesError'
  }
}

export interface FetchMorelikePageTitlesOptions {
  limit?: number
  excludeTitles?: string[]
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
}

type SearchResponse = {
  batchcomplete?: string
  continue?: { sroffset?: string; continue?: string }
  query?: {
    search?: Array<{ title?: string; ns?: number }>
  }
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchMorelikePageTitlesError('Request aborted', 'aborted')
  }
}

function actionUrl(wikiHost: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  assertNotAborted(signal)
  const response = await fetch(url, {
    signal,
    headers: { 'Api-User-Agent': API_USER_AGENT },
  })
  if (!response.ok) {
    throw new FetchMorelikePageTitlesError(`HTTP ${response.status}`, 'http')
  }
  return response.json()
}

function appendSearchHits(
  hits: Array<{ title?: string; ns?: number }>,
  titles: string[],
  seen: Set<string>,
  exclude: Set<string>,
  limit: number,
): void {
  for (const hit of hits) {
    if (titles.length >= limit) return
    if (hit.ns !== undefined && hit.ns !== 0) continue
    const title = typeof hit.title === 'string' ? hit.title.trim() : ''
    if (!title.length) continue
    const key = normalizeTitleKey(title)
    if (seen.has(key) || exclude.has(key)) continue
    seen.add(key)
    titles.push(title)
  }
}

/**
 * Paginate Cirrus search until `limit` distinct titles are collected or results
 * are exhausted. Excluded titles are skipped rather than returned.
 */
async function collectMorelikeTitles(
  wikiHost: string,
  srsearch: string,
  limit: number,
  exclude: Set<string>,
  seen: Set<string>,
  signal?: AbortSignal,
): Promise<string[]> {
  const titles: string[] = []
  let offset = 0
  let searchPages = 0

  while (titles.length < limit && searchPages < MAX_SEARCH_PAGES) {
    assertNotAborted(signal)

    const batchSize = Math.min(50, Math.max(limit * 2, limit))
    const data = (await fetchJson(
      actionUrl(wikiHost, {
        action: 'query',
        list: 'search',
        srsearch,
        srwhat: 'text',
        srnamespace: '0',
        srlimit: String(batchSize),
        sroffset: String(offset),
      }),
      signal,
    )) as SearchResponse

    const hits = data.query?.search ?? []
    appendSearchHits(hits, titles, seen, exclude, limit)
    searchPages += 1

    if (titles.length >= limit || !hits.length) break

    const nextOffset = data.continue?.sroffset
    if (nextOffset == null || nextOffset === '') break
    offset = Number.parseInt(nextOffset, 10)
    if (Number.isNaN(offset)) break
  }

  return titles
}

/**
 * Cirrus "more like this" via Action API `list=search` and `srsearch=morelike:…`.
 * Paginates past excluded hits; falls back to per-seed queries when a combined
 * search yields nothing usable.
 */
export async function fetchMorelikePageTitles(
  seedTitles: string[],
  options: FetchMorelikePageTitlesOptions = {},
): Promise<string[]> {
  const seeds = [...new Set(seedTitles.map((title) => title.trim()).filter(Boolean))]
  if (!seeds.length) {
    return []
  }

  const limit = Math.max(1, Math.min(options.limit ?? 6, 50))
  const exclude = new Set((options.excludeTitles ?? []).map(normalizeTitleKey))
  for (const seed of seeds) {
    exclude.add(normalizeTitleKey(seed))
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const seen = new Set<string>()
  let titles = await collectMorelikeTitles(
    wikiHost,
    `morelike:${seeds.join('|')}`,
    limit,
    exclude,
    seen,
    options.signal,
  )

  if (titles.length >= limit) {
    return titles
  }

  for (const seed of seeds) {
    if (titles.length >= limit) break

    const seedTitlesFromSearch = await collectMorelikeTitles(
      wikiHost,
      `morelike:${seed}`,
      limit,
      exclude,
      seen,
      options.signal,
    )

    for (const title of seedTitlesFromSearch) {
      if (titles.length >= limit) break
      titles.push(title)
    }
  }

  return titles
}
