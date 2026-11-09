import { wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'

/**
 * Title suggestions from REST `search/title` — what production's search bars
 * use for prefix completion. Each page comes with its short description and a
 * thumbnail, so a result row needs no follow-up request (`opensearch` has no images).
 */
export interface TitleSearchResult {
  title: string
  description: string
  thumbnailSrc?: string
}

export interface TitleSearchOptions {
  signal?: AbortSignal
  lang?: string
  limit?: number
  /** Appended to the API user agent, so requests trace back to a prototype. */
  clientTag?: string
}

export async function fetchTitleSearchResults(
  query: string,
  options: TitleSearchOptions = {},
): Promise<TitleSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  const host = wikiHostFromLang(options.lang ?? 'en')
  const params = new URLSearchParams({ q: trimmed, limit: String(options.limit ?? 6) })
  const response = await fetch(`https://${host}/w/rest.php/v1/search/title?${params}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders(options.clientTag ?? 'title-search'),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = (await response.json()) as {
    pages?: { title: string; description?: string | null; thumbnail?: { url?: string } | null }[]
  }
  return (data.pages ?? []).map((page) => {
    const url = page.thumbnail?.url
    return {
      title: page.title,
      description: page.description ?? '',
      // REST thumbnails are protocol-relative today.
      thumbnailSrc: url?.startsWith('//') ? `https:${url}` : url || undefined,
    }
  })
}

/** A title's page on the real wiki. */
export function wikiPageUrl(lang: string, title: string): string {
  return `https://${wikiHostFromLang(lang)}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}
