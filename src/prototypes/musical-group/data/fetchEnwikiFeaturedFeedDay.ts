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
const inFlight = new Map<string, Promise<FeaturedFeedDayResult>>()

export interface FeaturedFeedDayResult {
  dayKey: string
  json: FeaturedFeedDayResponse | null
  ok: boolean
  status?: number
}

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
): Promise<FeaturedFeedDayResult> {
  const { url, dayKey } = featuredFeedUrl()

  const sessionHit = sessionCache.get(dayKey)
  if (sessionHit) return { dayKey, json: sessionHit, ok: true }

  let bodyPromise = inFlight.get(dayKey)
  if (!bodyPromise) {
    bodyPromise = (async (): Promise<FeaturedFeedDayResult> => {
      const response = await fetchWikimedia(url, {
        signal,
        headers: wikimediaApiFetchHeaders(purpose),
      })
      if (!response.ok) {
        return { dayKey, json: null, ok: false, status: response.status }
      }
      const json = (await response.json()) as FeaturedFeedDayResponse
      sessionCache.set(dayKey, json)
      return { dayKey, json, ok: true }
    })().finally(() => {
      inFlight.delete(dayKey)
    })
    inFlight.set(dayKey, bodyPromise)
  }

  return bodyPromise
}

export function wikimediaFeedErrorMessage(
  status: number | undefined,
  resource: string,
): string {
  if (status === 429) {
    return `${resource} is temporarily unavailable. Wikipedia may be rate-limiting requests — try again shortly.`
  }
  if (status) {
    return `${resource} could not be loaded (HTTP ${status}).`
  }
  return `${resource} could not be loaded. Check your connection and try again.`
}

export function clearFeaturedFeedSessionCache(): void {
  sessionCache.clear()
  inFlight.clear()
}
