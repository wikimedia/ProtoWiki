import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

export interface PageSummary {
  extract: string
  thumbnailUrl: string | null
}

/** Lead extract + thumbnail from REST page/summary (framework search snippet source). */
export async function fetchPageSummary(
  title: string,
  options: { signal?: AbortSignal; lang?: string } = {},
): Promise<PageSummary> {
  const trimmed = title.trim()
  if (!trimmed.length) {
    return { extract: '', thumbnailUrl: null }
  }

  const host = wikiHostFromLang(options.lang ?? 'en')
  const encodedTitle = encodeURIComponent(trimmed.replace(/ /g, '_'))
  const response = await fetch(`https://${host}/api/rest_v1/page/summary/${encodedTitle}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders('page-summary'),
  })

  if (!response.ok) {
    return { extract: '', thumbnailUrl: null }
  }

  const data = (await response.json()) as {
    extract?: string
    thumbnail?: { source?: string }
  }

  return {
    extract: typeof data.extract === 'string' ? data.extract.trim() : '',
    thumbnailUrl: data.thumbnail?.source ?? null,
  }
}
