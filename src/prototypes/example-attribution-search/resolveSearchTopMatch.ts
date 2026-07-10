import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

const SEARCH_LIMIT = 10

/**
 * External search engines often blend keyword + semantic retrieval.
 * Wikimedia exposes both on wiki api.php; we route client-side:
 * - short / title-like queries → full-text CirrusSearch (Special:Search)
 * - natural-language queries → semantic search (cirrusSemanticSearch=1)
 */
export function shouldUseSemanticSearch(query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed.length) return false

  const words = trimmed.split(/\s+/)
  if (/^(who|what|when|where|why|how|which)\b/i.test(trimmed)) return true
  if (words.length >= 3) return true
  return false
}

/** Top article title from hybrid wiki search, skipping disambiguation pages. */
export async function resolveSearchTopMatch(
  query: string,
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<string | null> {
  const trimmed = query.trim()
  if (!trimmed.length) return null

  const lang = options.lang ?? 'en'
  const host = wikiHostFromLang(lang)
  const semantic = shouldUseSemanticSearch(trimmed)

  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: trimmed,
    srlimit: String(SEARCH_LIMIT),
    srnamespace: '0',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  if (semantic) {
    params.set('cirrusSemanticSearch', '1')
  }

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders(semantic ? 'semantic-search' : 'fulltext-search'),
  })

  if (!response.ok) return null

  const data = (await response.json()) as {
    query?: { search?: Array<{ title?: string }> }
  }

  const titles = (data.query?.search ?? [])
    .map((hit) => hit.title)
    .filter((title): title is string => typeof title === 'string' && title.length > 0)

  if (!titles.length) return null

  const candidates = await withoutDisambiguationPages(titles, {
    signal: options.signal,
    host,
  })

  return candidates[0] ?? null
}

async function withoutDisambiguationPages(
  titles: string[],
  options: { signal?: AbortSignal; host: string },
): Promise<string[]> {
  if (!titles.length) return []

  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'disambiguation',
    titles: titles.join('|'),
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const response = await fetch(`https://${options.host}/w/api.php?${params.toString()}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders('query-pageprops'),
  })

  if (!response.ok) return titles

  const data = (await response.json()) as {
    query?: { pages?: Array<{ title: string; pageprops?: { disambiguation?: string } }> }
  }

  const disambiguationTitles = new Set(
    (data.query?.pages ?? [])
      .filter((page) => page.pageprops?.disambiguation !== undefined)
      .map((page) => page.title),
  )

  return titles.filter((title) => !disambiguationTitles.has(title))
}
