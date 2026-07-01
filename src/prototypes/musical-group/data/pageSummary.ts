import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { EN_WIKI_HOST } from './enwikiTitle'
import {
  getCachedPageSummary,
  getPageSummaryInFlight,
  setCachedPageSummary,
  setPageSummaryInFlight,
} from './pageSummaryCache'

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

async function fetchPageSummaryFromNetwork(
  title: string,
  signal?: AbortSignal,
  purpose = 'musical-group-home-summary',
): Promise<PageSummary | null> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetchWikimedia(
    `https://${EN_WIKI_HOST}/api/rest_v1/page/summary/${slug}`,
    {
      signal,
      headers: wikimediaApiFetchHeaders(purpose),
    },
  )
  if (!response.ok) return null
  return (await response.json()) as PageSummary
}

/** REST `/page/summary/{title}` on English Wikipedia. */
export async function fetchPageSummary(
  title: string,
  signal?: AbortSignal,
  purpose = 'musical-group-home-summary',
): Promise<PageSummary | null> {
  const cached = getCachedPageSummary(title)
  if (cached !== undefined) return cached

  const inFlight = getPageSummaryInFlight(title)
  if (inFlight) return inFlight

  const promise = fetchPageSummaryFromNetwork(title, signal, purpose)
    .then((summary) => {
      setCachedPageSummary(title, summary)
      return summary
    })
    .catch((err) => {
      if ((err as Error).name === 'AbortError') throw err
      setCachedPageSummary(title, null)
      return null
    })

  setPageSummaryInFlight(title, promise)
  return promise
}
