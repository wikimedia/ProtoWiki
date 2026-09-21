import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import type { WikitabCardData, WikitabFeed } from '../sections'
import { fetchActiveDiscussions } from './fetchActiveDiscussions'
import { fetchBirthsOnThisDay } from './fetchBirthsOnThisDay'
import { isCacheBypassed, readCachedFeed, utcDayKey, writeCachedFeed } from './feedCache'
import { fetchMainPageOtd } from './fetchMainPageOtd'
import { EN_WIKI_HOST, articleUrl, normalizeFeedHtml, primaryLinkTitle } from './wikitabHtml'

interface FeedThumbnail {
  source?: string
}

interface FeedSummary {
  title?: string
  normalizedtitle?: string
  description?: string
  thumbnail?: FeedThumbnail
  views?: number
  rank?: number
  content_urls?: { desktop?: { page?: string } }
}

interface FeaturedFeedResponse {
  mostread?: { date?: string; articles?: FeedSummary[] }
  dyk?: { html?: string; text?: string }[]
  news?: { story?: string; links?: FeedSummary[] }[]
}

/** Deduplicates concurrent and repeat calls within a single page session. */
const inFlight = new Map<string, Promise<WikitabFeed>>()

function feedUrl(day: string): string {
  const [year, month, date] = day.split('-')
  return `https://${EN_WIKI_HOST}/api/rest_v1/feed/featured/${year}/${month}/${date}`
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`
  return String(views)
}

/** When `mostread.date` matches the requested feed day, suffix with "today". */
function viewsPeriodLabel(mostreadDay: string | undefined, requestedDay: string): string {
  const day = mostreadDay?.slice(0, 10)
  if (day === requestedDay) return 'today'
  return ''
}

function summaryUrl(summary: FeedSummary): string | undefined {
  const direct = summary.content_urls?.desktop?.page
  if (direct) return direct
  return summary.title ? articleUrl(summary.title) : undefined
}

function mapTrending(response: FeaturedFeedResponse, day: string): WikitabCardData[] {
  const articles = response.mostread?.articles ?? []
  const period = viewsPeriodLabel(response.mostread?.date, day)

  return [...articles]
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
    .map((article) => ({
      key: article.title ?? article.normalizedtitle ?? String(article.rank),
      href: summaryUrl(article),
      linkTitle: article.normalizedtitle ?? article.title?.replace(/_/g, ' '),
      title: article.normalizedtitle ?? article.title?.replace(/_/g, ' '),
      description: article.description || undefined,
      supportingText:
        typeof article.views === 'number'
          ? `${formatViews(article.views)} views${period ? ` ${period}` : ''}`
          : undefined,
      thumbnailUrl: article.thumbnail?.source,
    }))
}

function mapDyk(response: FeaturedFeedResponse): WikitabCardData[] {
  return (response.dyk ?? [])
    .filter((hook) => hook.html)
    .map((hook, index) => {
      const html = hook.html as string
      const subject = primaryLinkTitle(html)
      return {
        key: `dyk-${index}`,
        html: normalizeFeedHtml(html),
        href: subject ? articleUrl(subject) : undefined,
        linkTitle: subject,
        thumbnailTitle: subject,
      }
    })
}

function mapNews(response: FeaturedFeedResponse): WikitabCardData[] {
  return (response.news ?? [])
    .filter((item) => item.story)
    .map((item, index) => {
      const story = item.story as string
      const subject = primaryLinkTitle(story)
      /*
       * The card points at the story's bolded link, so prefer that page's own
       * summary for the thumbnail rather than whichever link happens to be first.
       */
      const lead =
        item.links?.find(
          (link) =>
            link.normalizedtitle === subject ||
            link.title?.replace(/_/g, ' ') === subject,
        ) ?? item.links?.[0]
      return {
        key: `news-${index}`,
        html: normalizeFeedHtml(story),
        href: subject ? articleUrl(subject) : lead && summaryUrl(lead),
        linkTitle: subject ?? lead?.normalizedtitle,
        thumbnailUrl: lead?.thumbnail?.source,
      }
    })
}

async function fetchFeaturedPayload(
  day: string,
  signal?: AbortSignal,
): Promise<FeaturedFeedResponse> {
  const response = await fetchWikimedia(feedUrl(day), {
    headers: wikimediaApiFetchHeaders('wikitab-feed'),
    signal,
  })
  if (!response.ok) {
    throw new Error(`Featured feed request failed (${response.status})`)
  }
  return (await response.json()) as FeaturedFeedResponse
}

async function requestFeed(day: string, signal?: AbortSignal): Promise<WikitabFeed> {
  const [featuredResult, otdResult, birthsResult, discussionsResult] = await Promise.allSettled([
    fetchFeaturedPayload(day, signal),
    fetchMainPageOtd(signal),
    fetchBirthsOnThisDay(day, signal),
    fetchActiveDiscussions(signal),
  ])

  if (featuredResult.status === 'rejected') {
    throw featuredResult.reason
  }

  const payload = featuredResult.value
  const otd = otdResult.status === 'fulfilled' ? otdResult.value : []
  const births = birthsResult.status === 'fulfilled' ? birthsResult.value : []
  const discussions =
    discussionsResult.status === 'fulfilled' ? discussionsResult.value : []

  return {
    trending: mapTrending(payload, day),
    news: mapNews(payload),
    discussions,
    otd,
    births,
    dyk: mapDyk(payload),
  }
}

/**
 * Featured feed plus Main Page OTD and births endpoints. Reads through the
 * session map, then the localStorage day cache, before going to the network.
 */
export function fetchDailyFeed(signal?: AbortSignal): Promise<WikitabFeed> {
  const day = utcDayKey()

  const pending = inFlight.get(day)
  if (pending) return pending

  const cached = readCachedFeed(day)
  if (cached) return Promise.resolve(cached)

  const request = requestFeed(day, signal)
    .then((feed) => {
      if (!isCacheBypassed()) writeCachedFeed(day, feed)
      return feed
    })
    .catch((error) => {
      inFlight.delete(day)
      throw error
    })

  inFlight.set(day, request)
  return request
}
