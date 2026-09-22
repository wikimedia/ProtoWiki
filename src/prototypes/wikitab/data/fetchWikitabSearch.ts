import { wikimediaApiFetchHeaders } from '@/config'

import { filterDisambiguationPageIds } from './filterDisambiguationPages'

const SEARCH_HOST = 'en.wikipedia.org'
const DEFAULT_SEARCH_LIMIT = 6
const OVERFETCH_BUFFER = 4
const REST_SEARCH_MAX = 50

export interface WikitabSearchResult {
  id: number
  title: string
  description?: string
  thumbnailUrl?: string
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

/** Title lookahead against English Wikipedia (Core REST search). */
export async function fetchWikitabSearch(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<WikitabSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  const limit = options.limit ?? DEFAULT_SEARCH_LIMIT
  const restLimit = Math.min(limit + OVERFETCH_BUFFER, REST_SEARCH_MAX)

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(restLimit),
  })

  const response = await fetch(
    `https://${SEARCH_HOST}/w/rest.php/v1/search/title?${params.toString()}`,
    {
      signal: options.signal,
      headers: wikimediaApiFetchHeaders('wikitab-search'),
    },
  )

  if (!response.ok) {
    throw new Error(`Search failed (HTTP ${response.status})`)
  }

  const data = (await response.json()) as {
    pages?: Array<{
      id?: number
      title?: string
      description?: string
      thumbnail?: { url?: string }
    }>
  }

  const mapped = (data.pages ?? [])
    .filter((page): page is typeof page & { id: number; title: string } =>
      typeof page.id === 'number' && typeof page.title === 'string',
    )
    .map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description?.trim() || undefined,
      thumbnailUrl: normalizeThumbnailUrl(page.thumbnail?.url),
    }))

  const disambiguationIds = await filterDisambiguationPageIds(
    mapped.map((page) => page.id),
    { signal: options.signal },
  )

  return mapped.filter((page) => !disambiguationIds.has(page.id)).slice(0, limit)
}
