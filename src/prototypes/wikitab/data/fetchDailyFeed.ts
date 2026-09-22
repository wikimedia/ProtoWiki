import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import type { WikitabCardData, WikitabFeed } from '../sections'
import { fetchActiveDiscussions } from './fetchActiveDiscussions'
import { fetchBirthsOnThisDay } from './fetchBirthsOnThisDay'
import {
  isCacheBypassed,
  previousUtcDay,
  readCachedFeed,
  utcDayKey,
  writeCachedFeed,
} from './feedCache'
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

interface InFlightProgressive {
  promise: Promise<WikitabFeed>
  listeners: Set<(feed: WikitabFeed) => void>
  lastFeed: WikitabFeed | null
}

/** Deduplicates concurrent and repeat calls within a single page session. */
const inFlight = new Map<string, InFlightProgressive>()

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

function mapFeaturedFeed(payload: FeaturedFeedResponse, day: string): WikitabFeed {
  return {
    trending: mapTrending(payload, day),
    news: mapNews(payload),
    dyk: mapDyk(payload),
    discussions: [],
    otd: [],
    births: [],
  }
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

/** When today's `mostread` is missing, fall back to the previous UTC day. */
async function resolveTrending(
  payload: FeaturedFeedResponse,
  day: string,
  signal?: AbortSignal,
): Promise<WikitabCardData[]> {
  let trending = mapTrending(payload, day)
  if (trending.length > 0) return trending

  try {
    const yesterday = previousUtcDay(day)
    const fallback = await fetchFeaturedPayload(yesterday, signal)
    trending = mapTrending(fallback, yesterday)
  } catch {
    // Empty state keeps the section visible.
  }
  return trending
}

/**
 * Phase 1: featured feed (Trending, In the news, Did you know). Phase 2: OTD,
 * Birthdays, and Active discussions in parallel, patching the feed as each
 * secondary request settles so lower sections can resolve independently.
 */
async function requestFeedProgressive(
  day: string,
  onUpdate: (feed: WikitabFeed) => void,
  signal?: AbortSignal,
): Promise<WikitabFeed> {
  const payload = await fetchFeaturedPayload(day, signal)
  const trending = await resolveTrending(payload, day, signal)
  const feed = { ...mapFeaturedFeed(payload, day), trending }
  onUpdate(feed)

  await Promise.all([
    fetchMainPageOtd(signal).then(
      (otd) => {
        feed.otd = otd
        onUpdate({ ...feed })
      },
      () => {
        feed.otd = []
        onUpdate({ ...feed })
      },
    ),
    fetchBirthsOnThisDay(day, signal).then(
      (births) => {
        feed.births = births
        onUpdate({ ...feed })
      },
      () => {
        feed.births = []
        onUpdate({ ...feed })
      },
    ),
    fetchActiveDiscussions(signal).then(
      (discussions) => {
        feed.discussions = discussions
        onUpdate({ ...feed })
      },
      () => {
        feed.discussions = []
        onUpdate({ ...feed })
      },
    ),
  ])

  return { ...feed }
}

function notifyListeners(entry: InFlightProgressive, feed: WikitabFeed): void {
  entry.lastFeed = feed
  entry.listeners.forEach((listener) => listener(feed))
}

/**
 * Featured feed plus Main Page OTD and births endpoints. Reads through the
 * session map, then the localStorage day cache, before going to the network.
 * Calls `onUpdate` after the featured payload lands and again as each secondary
 * section resolves.
 */
export function fetchDailyFeedProgressive(
  onUpdate: (feed: WikitabFeed) => void,
  signal?: AbortSignal,
): Promise<WikitabFeed> {
  const day = utcDayKey()

  const cached = readCachedFeed(day)
  if (cached) {
    onUpdate(cached)
    return Promise.resolve(cached)
  }

  const pending = inFlight.get(day)
  if (pending) {
    if (pending.lastFeed) onUpdate(pending.lastFeed)
    pending.listeners.add(onUpdate)
    return pending.promise
  }

  const entry: InFlightProgressive = {
    promise: Promise.resolve({} as WikitabFeed),
    listeners: new Set([onUpdate]),
    lastFeed: null,
  }

  entry.promise = requestFeedProgressive(
    day,
    (feed) => notifyListeners(entry, feed),
    signal,
  )
    .then((feed) => {
      // Skip caching when Trending is still empty so the next tab open can retry.
      if (!isCacheBypassed() && feed.trending.length > 0) writeCachedFeed(day, feed)
      inFlight.delete(day)
      return feed
    })
    .catch((error) => {
      inFlight.delete(day)
      throw error
    })

  inFlight.set(day, entry)
  return entry.promise
}

/** Awaits the complete daily feed without subscribing to intermediate updates. */
export function fetchDailyFeed(signal?: AbortSignal): Promise<WikitabFeed> {
  return fetchDailyFeedProgressive(() => {}, signal)
}
