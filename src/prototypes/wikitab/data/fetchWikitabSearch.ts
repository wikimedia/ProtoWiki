import { wikimediaApiFetchHeaders } from '@/config'

const SEARCH_HOST = 'en.wikipedia.org'
const DEFAULT_SEARCH_LIMIT = 6

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

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options.limit ?? DEFAULT_SEARCH_LIMIT),
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

  return (data.pages ?? [])
    .filter((page): page is typeof page & { id: number; title: string } =>
      typeof page.id === 'number' && typeof page.title === 'string',
    )
    .map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description?.trim() || undefined,
      thumbnailUrl: normalizeThumbnailUrl(page.thumbnail?.url),
    }))
}
