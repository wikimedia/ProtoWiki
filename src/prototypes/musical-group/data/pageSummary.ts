import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { contentWikiHost } from './enwikiTitle'
import {
  getCachedPageSummary,
  getPageSummaryInFlight,
  setCachedPageSummary,
  setPageSummaryInFlight,
} from './pageSummaryCache'
import { createSharedRequest, joinSharedRequest } from './sharedRequest'

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
    `https://${contentWikiHost()}/api/rest_v1/page/summary/${slug}`,
    {
      signal,
      headers: wikimediaApiFetchHeaders(purpose),
    },
  )
  if (!response.ok) return null
  return (await response.json()) as PageSummary
}

export interface FetchPageSummaryOptions {
  /** Retry the network when the only cached value is a prior failure (`null`). */
  bypassFailureCache?: boolean
}

/** REST `/page/summary/{title}` on English Wikipedia. */
export async function fetchPageSummary(
  title: string,
  signal?: AbortSignal,
  purpose = 'musical-group-home-summary',
  options?: FetchPageSummaryOptions,
): Promise<PageSummary | null> {
  const cached = getCachedPageSummary(title)
  if (cached !== undefined) {
    if (cached !== null || !options?.bypassFailureCache) return cached
  }

  const inFlight = getPageSummaryInFlight(title)
  if (inFlight) return joinSharedRequest(inFlight, signal)

  const request = createSharedRequest((sharedSignal) =>
    fetchPageSummaryFromNetwork(title, sharedSignal, purpose)
      .then((summary) => {
        setCachedPageSummary(title, summary)
        return summary
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') throw err
        setCachedPageSummary(title, null)
        return null
      }),
    signal,
  )

  setPageSummaryInFlight(title, request)
  return joinSharedRequest(request, signal)
}
