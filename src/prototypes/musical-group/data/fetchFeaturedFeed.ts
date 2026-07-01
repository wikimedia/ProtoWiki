import { wikimediaApiFetchHeaders } from '@/config'

import { EN_WIKI_HOST, enwikiArticleUrl } from './enwikiTitle'
import { fetchWithTimeout } from './fetchWithTimeout'
import { fetchPageSummary } from './pageSummary'
import type { HomeBornOnThisDay, HomeDidYouKnow, HomeFeatured, HomeFeaturedTab } from './types'
import { normalizeQid } from './wikidataApi'

const MAX_DYK = 5
const MAX_BIRTHS = 5

interface FeedPage {
  title?: string
}

interface FeedTfa {
  title?: string
  normalizedtitle?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
  content_urls?: { desktop?: { page?: string } }
  wikibase_item?: string
}

interface FeedDyk {
  text?: string
  html?: string
  pages?: FeedPage[]
}

interface FeedBirth {
  text?: string
  year?: number
  pages?: FeedPage[]
}

interface FeaturedFeedResponse {
  tfa?: FeedTfa
  dyk?: FeedDyk[]
}

interface BirthsFeedResponse {
  births?: FeedBirth[]
}

let cached: { day: string; value: HomeFeaturedTab } | null = null

function utcDayParts(date: Date): { yyyy: string; mm: string; dd: string; key: string } {
  const yyyy = String(date.getUTCFullYear())
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return { yyyy, mm, dd, key: `${yyyy}${mm}${dd}` }
}

function parseTfa(tfa: FeedTfa | undefined): HomeFeatured | undefined {
  if (!tfa?.title) return undefined

  const enwikiTitle = (tfa.normalizedtitle ?? tfa.title).replace(/_/g, ' ')
  return {
    title: enwikiTitle,
    enwikiTitle,
    description: tfa.description ?? tfa.extract ?? '',
    thumbnailUrl: tfa.thumbnail?.source,
    articleUrl: tfa.content_urls?.desktop?.page ?? enwikiArticleUrl(enwikiTitle),
    itemId: normalizeQid(tfa.wikibase_item) ?? undefined,
  }
}

async function pageCardFields(
  enwikiTitle: string,
  signal?: AbortSignal,
): Promise<{
  title: string
  thumbnailUrl?: string
  articleUrl: string
  itemId?: string
}> {
  const summary = await fetchPageSummary(enwikiTitle, signal, 'musical-group-featured-feed')
  const title = (summary?.normalizedtitle ?? summary?.title ?? enwikiTitle).replace(/_/g, ' ')
  return {
    title,
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl: summary?.content_urls?.desktop?.page ?? enwikiArticleUrl(enwikiTitle),
    itemId: normalizeQid(summary?.wikibase_item) ?? undefined,
  }
}

/** Anchor text of the primary bold-linked article in a DYK hook. */
function extractDykEmphasis(html: string): string | undefined {
  const match = html.match(/<b[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)
  if (!match) return undefined

  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitTextEmphasis(
  text: string,
  emphasis: string,
): { before: string; match: string; after: string } | null {
  const pattern = emphasis
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\u00a0 ]+')
  const match = text.match(new RegExp(pattern))
  if (!match?.index && match?.index !== 0) return null

  return {
    before: text.slice(0, match.index),
    match: match[0],
    after: text.slice(match.index + match[0].length),
  }
}

function resolveDykEmphasis(text: string, html?: string): string | undefined {
  if (!html) return undefined
  const emphasis = extractDykEmphasis(html)
  if (!emphasis || !splitTextEmphasis(text, emphasis)) return undefined
  return emphasis
}

/** Primary linked article from DYK feed item (pages array or Parsoid html hook). */
function dykPrimaryPageTitle(item: FeedDyk): string | undefined {
  const fromPages = item.pages?.[0]?.title
  if (fromPages) return fromPages

  const html = item.html
  if (!html) return undefined

  const match = html.match(/href="(?:https:\/\/en\.wikipedia\.org\/wiki\/|\.\/)([^"?#]+)"/i)
  if (!match) return undefined

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

async function parseDidYouKnow(
  items: FeedDyk[] | undefined,
  signal?: AbortSignal,
): Promise<HomeDidYouKnow[]> {
  if (!items?.length) return []

  const slice = items.slice(0, MAX_DYK)

  return Promise.all(
    slice.map(async (item) => {
      const text = item.text?.trim()
      if (!text) return null

      const emphasis = resolveDykEmphasis(text, item.html)
      const pageTitle = dykPrimaryPageTitle(item)
      if (!pageTitle) {
        return {
          text,
          ...(emphasis ? { emphasis } : {}),
        } satisfies HomeDidYouKnow
      }

      const fields = await pageCardFields(pageTitle, signal)
      return {
        text,
        ...(emphasis ? { emphasis } : {}),
        enwikiTitle: pageTitle.replace(/_/g, ' '),
        title: fields.title,
        thumbnailUrl: fields.thumbnailUrl,
        articleUrl: fields.articleUrl,
        itemId: fields.itemId,
      } satisfies HomeDidYouKnow
    }),
  ).then((entries) => entries.filter((entry): entry is HomeDidYouKnow => entry !== null))
}

async function parseBornOnThisDay(
  items: FeedBirth[] | undefined,
  signal?: AbortSignal,
): Promise<HomeBornOnThisDay[]> {
  if (!items?.length) return []

  const slice = items
    .slice(0, MAX_BIRTHS)
    .filter((item) => item.pages?.[0]?.title && item.text?.trim() && item.year != null)

  return Promise.all(
    slice.map(async (item) => {
      const pageTitle = item.pages![0].title!
      const fields = await pageCardFields(pageTitle, signal)
      return {
        year: item.year!,
        text: item.text!.trim(),
        title: fields.title,
        enwikiTitle: pageTitle.replace(/_/g, ' '),
        thumbnailUrl: fields.thumbnailUrl,
        articleUrl: fields.articleUrl,
        itemId: fields.itemId,
      } satisfies HomeBornOnThisDay
    }),
  )
}

/** Today's featured tab: article of the day, Did you know, and Born on this day. */
export async function fetchFeaturedTabContent(signal?: AbortSignal): Promise<HomeFeaturedTab> {
  const { yyyy, mm, dd, key } = utcDayParts(new Date())
  if (cached && cached.day === key) return cached.value

  const featuredUrl = `https://${EN_WIKI_HOST}/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`
  const birthsUrl = `https://${EN_WIKI_HOST}/api/rest_v1/feed/onthisday/births/${mm}/${dd}`

  try {
    const [featuredResponse, birthsResponse] = await Promise.all([
      fetchWithTimeout(featuredUrl, {
        signal,
        headers: wikimediaApiFetchHeaders('musical-group-featured-feed'),
      }),
      fetchWithTimeout(birthsUrl, {
        signal,
        headers: wikimediaApiFetchHeaders('musical-group-born-on-this-day'),
      }),
    ])

    const featuredJson = featuredResponse.ok
      ? ((await featuredResponse.json()) as FeaturedFeedResponse)
      : {}
    const birthsJson = birthsResponse.ok
      ? ((await birthsResponse.json()) as BirthsFeedResponse)
      : {}

    const [didYouKnow, bornOnThisDay] = await Promise.all([
      parseDidYouKnow(featuredJson.dyk, signal),
      parseBornOnThisDay(birthsJson.births, signal),
    ])

    const value: HomeFeaturedTab = {
      article: parseTfa(featuredJson.tfa),
      didYouKnow,
      bornOnThisDay,
    }

    cached = { day: key, value }
    return value
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return { didYouKnow: [], bornOnThisDay: [] }
  }
}

/** Today's featured article only — convenience wrapper. */
export async function fetchFeaturedArticle(signal?: AbortSignal): Promise<HomeFeatured | undefined> {
  return (await fetchFeaturedTabContent(signal)).article
}
