import { wikimediaApiFetchHeaders } from '@/config'

import { EN_WIKI_HOST } from './enwikiTitle'
import { fetchWithTimeout } from './fetchWithTimeout'

export interface PageSummary {
  title?: string
  normalizedtitle?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
  timestamp?: string
  content_urls?: { desktop?: { page?: string } }
  wikibase_item?: string
}

/** REST `/page/summary/{title}` on English Wikipedia. */
export async function fetchPageSummary(
  title: string,
  signal?: AbortSignal,
  purpose = 'musical-group-home-summary',
): Promise<PageSummary | null> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetchWithTimeout(
    `https://${EN_WIKI_HOST}/api/rest_v1/page/summary/${slug}`,
    {
      signal,
      headers: wikimediaApiFetchHeaders(purpose),
    },
  )
  if (!response.ok) return null
  return (await response.json()) as PageSummary
}
