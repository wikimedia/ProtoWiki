import { wikimediaApiFetchHeaders } from '@/config'
import { t } from '@/i18n'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { utcDayParts } from './cacheKeys'
import { contentWikiHost } from './enwikiTitle'
import { createSharedRequest, joinSharedRequest, type SharedRequest } from './sharedRequest'

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
const inFlight = new Map<string, SharedRequest<FeaturedFeedDayResult>>()

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
    url: `https://${contentWikiHost()}/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`,
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

  let request = inFlight.get(dayKey)
  if (!request) {
    const created = createSharedRequest(async (sharedSignal): Promise<FeaturedFeedDayResult> => {
      const response = await fetchWikimedia(url, {
        signal: sharedSignal,
        headers: wikimediaApiFetchHeaders(purpose),
      })
      if (!response.ok) {
        return { dayKey, json: null, ok: false, status: response.status }
      }
      const json = (await response.json()) as FeaturedFeedDayResponse
      sessionCache.set(dayKey, json)
      return { dayKey, json, ok: true }
    }, signal)
    const clear = () => {
      if (inFlight.get(dayKey) === created) inFlight.delete(dayKey)
    }
    created.promise.then(clear, clear)
    inFlight.set(dayKey, created)
    request = created
  }

  return joinSharedRequest(request, signal)
}

/** Which feed failed — each has its own messages, since the sentence agrees with the noun. */
export type WikimediaFeedResource = 'featured' | 'trending'

export function wikimediaFeedErrorMessage(
  status: number | undefined,
  resource: WikimediaFeedResource,
): string {
  if (resource === 'trending') {
    if (status === 429) return t('feed.errorTrendingRateLimited')
    if (status) return t('feed.errorTrendingHttp', status)
    return t('feed.errorTrendingOffline')
  }
  if (status === 429) return t('feed.errorFeaturedRateLimited')
  if (status) return t('feed.errorFeaturedHttp', status)
  return t('feed.errorFeaturedOffline')
}

export function clearFeaturedFeedSessionCache(): void {
  sessionCache.clear()
  inFlight.clear()
}
