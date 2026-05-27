import { wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) opensearch'

export interface WikipediaOpenSearchItem {
  value: string
  label: string
  description?: string
  url?: string
}

export class FetchWikipediaOpenSearchError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchWikipediaOpenSearchError'
  }
}

export interface FetchWikipediaOpenSearchOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
  /** Max suggestions (default 10). */
  limit?: number
}

/**
 * Title suggestions from Action API `opensearch` (CirrusSearch completion).
 */
export async function fetchWikipediaOpenSearch(
  query: string,
  options: FetchWikipediaOpenSearchOptions = {},
): Promise<WikipediaOpenSearchItem[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  if (options.signal?.aborted) {
    throw new FetchWikipediaOpenSearchError('Request aborted', 'aborted')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const limit = options.limit ?? 10

  const params = new URLSearchParams({
    action: 'opensearch',
    search: trimmed,
    limit: String(limit),
    namespace: '0',
    format: 'json',
    origin: '*',
  })

  const response = await fetch(`https://${wikiHost}/w/api.php?${params.toString()}`, {
    signal: options.signal,
    headers: { 'Api-User-Agent': API_USER_AGENT },
  })

  if (!response.ok) {
    throw new FetchWikipediaOpenSearchError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as [string, string[], string[], string[]]
  const [, titles, descriptions, urls] = data

  return titles.map((title, i) => ({
    value: title,
    label: title,
    description: descriptions[i]?.trim() || undefined,
    url: urls[i],
  }))
}
