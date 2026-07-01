import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { utcDayParts } from './cacheKeys'
import { EN_WIKI_HOST } from './enwikiTitle'

export interface FeaturedFeedDayResponse {
  tfa?: {
    title?: string
    normalizedtitle?: string
    description?: string
    extract?: string
    thumbnail?: { source?: string }
    content_urls?: { desktop?: { page?: string } }
    wikibase_item?: string
  }
  dyk?: {
    text?: string
    html?: string
    pages?: { title?: string }[]
  }[]
  mostread?: {
    date?: string
    articles?: {
      title?: string
      views?: number
      rank?: number
    }[]
  }
}

const sessionCache = new Map<string, FeaturedFeedDayResponse>()
const inFlight = new Map<string, Promise<FeaturedFeedDayResponse | null>>()

function featuredFeedUrl(date = new Date()): { url: string; dayKey: string } {
  const { yyyy, mm, dd, key } = utcDayParts(date)
  return {
    dayKey: key,
    url: `https://${EN_WIKI_HOST}/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`,
  }
}

/** Shared daily featured feed fetch with session dedup. */
export async function fetchEnwikiFeaturedFeedDay(
  signal?: AbortSignal,
  purpose = 'musical-group-featured-feed',
): Promise<{ dayKey: string; json: FeaturedFeedDayResponse | null }> {
  const { url, dayKey } = featuredFeedUrl()

  const sessionHit = sessionCache.get(dayKey)
  if (sessionHit) return { dayKey, json: sessionHit }

  let bodyPromise = inFlight.get(dayKey)
  if (!bodyPromise) {
    bodyPromise = (async () => {
      const response = await fetchWikimedia(url, {
        signal,
        headers: wikimediaApiFetchHeaders(purpose),
      })
      if (!response.ok) return null
      const json = (await response.json()) as FeaturedFeedDayResponse
      sessionCache.set(dayKey, json)
      return json
    })().finally(() => {
      inFlight.delete(dayKey)
    })
    inFlight.set(dayKey, bodyPromise)
  }

  const json = await bodyPromise
  return { dayKey, json }
}

export function clearFeaturedFeedSessionCache(): void {
  sessionCache.clear()
  inFlight.clear()
}
