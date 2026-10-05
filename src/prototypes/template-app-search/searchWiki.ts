import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

const SEARCH_LIMIT = 20
const THUMBNAIL_SIZE = 160

export interface WikiSearchResult {
  pageid: number
  title: string
  /** Title HTML with the matched leading prefix wrapped in `<span class="searchmatch">`. */
  titleHtml: string
  description: string
  thumbnailUrl: string | null
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Wrap the leading substring of `title` matching `query` in a `searchmatch` span. */
function highlightPrefixMatch(title: string, query: string): string {
  const matchLength = Math.min(query.length, title.length)
  const candidate = title.slice(0, matchLength)

  if (!matchLength || candidate.toLocaleLowerCase() !== query.toLocaleLowerCase()) {
    return escapeHtml(title)
  }

  const rest = title.slice(matchLength)
  return `<span class="searchmatch">${escapeHtml(candidate)}</span>${escapeHtml(rest)}`
}

/**
 * Prefix/relevance search (title-completion, not exact full-text match) against a
 * language's Wikipedia — surfaces the most likely article even from a partial query
 * (e.g. "balti" → "Baltimore"), with short descriptions and thumbnails.
 */
export async function searchWiki(
  query: string,
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<WikiSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  const lang = options.lang ?? 'en'
  const host = wikiHostFromLang(lang)

  const params = new URLSearchParams({
    action: 'query',
    generator: 'prefixsearch',
    gpssearch: trimmed,
    gpslimit: String(SEARCH_LIMIT),
    gpsnamespace: '0',
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    pilicense: 'any',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const response = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders('live-search'),
  })

  if (!response.ok) return []

  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        pageid?: number
        title?: string
        index?: number
        description?: string
        thumbnail?: { source?: string }
      }>
    }
  }

  const pages = data.query?.pages ?? []

  return pages
    .filter(
      (page): page is typeof page & { pageid: number; title: string } =>
        typeof page.pageid === 'number' && typeof page.title === 'string',
    )
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({
      pageid: page.pageid,
      title: page.title,
      titleHtml: highlightPrefixMatch(page.title, trimmed),
      description: page.description ?? '',
      thumbnailUrl: page.thumbnail?.source ?? null,
    }))
}
