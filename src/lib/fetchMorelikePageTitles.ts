const WIKI_HOST = 'en.wikipedia.org'
const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) dashpage-suggestion-mode'

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
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchMorelikePageTitlesError('Request aborted', 'aborted')
  }
}

function actionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${WIKI_HOST}/w/api.php?${search.toString()}`
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

/**
 * Cirrus "more like this" via Action API `list=search` and `srsearch=morelike:…`.
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

  const data = (await fetchJson(
    actionUrl({
      action: 'query',
      list: 'search',
      srsearch: `morelike:${seeds.join('|')}`,
      srwhat: 'text',
      srnamespace: '0',
      srlimit: String(limit),
    }),
    options.signal,
  )) as {
    query?: {
      search?: Array<{ title?: string; ns?: number }>
    }
  }

  const seen = new Set<string>()
  const titles: string[] = []

  for (const hit of data.query?.search ?? []) {
    if (hit.ns !== undefined && hit.ns !== 0) continue
    const title = typeof hit.title === 'string' ? hit.title.trim() : ''
    if (!title.length) continue
    const key = normalizeTitleKey(title)
    if (seen.has(key) || exclude.has(key)) continue
    seen.add(key)
    titles.push(title)
  }

  return titles
}
