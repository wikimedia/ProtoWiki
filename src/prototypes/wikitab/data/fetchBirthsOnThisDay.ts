import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import type { WikitabCardData } from '../sections'
import { feedBirthsPayloadToCardData } from './wikitabCardPayloadMappers'
import type { WikitabFeedBirthsCardPayload } from './wikitabCardPayloadTypes'
import { WIKITAB_FEED_CARD_THUMB_WIDTH, wikimediaThumbnailAtLeast } from './wikimediaThumbnailUrl'
import { EN_WIKI_HOST, articleUrl } from './wikitabHtml'

interface FeedThumbnail {
  source?: string
}

interface FeedSummary {
  title?: string
  normalizedtitle?: string
  description?: string
  thumbnail?: FeedThumbnail
  content_urls?: { desktop?: { page?: string } }
}

interface OnThisDayItem {
  year?: number
  text?: string
  pages?: FeedSummary[]
}

interface BirthsResponse {
  births?: OnThisDayItem[]
}

function summaryUrl(summary: FeedSummary): string | undefined {
  const direct = summary.content_urls?.desktop?.page
  if (direct) return direct
  return summary.title ? articleUrl(summary.title) : undefined
}

function subtitleFromText(text: string, name: string | undefined): string | undefined {
  if (!name) return undefined
  const prefix = `${name}, `
  if (text.startsWith(prefix)) return text.slice(prefix.length) || undefined
  return undefined
}

function ageInYears(birthYear: number, feedDay: string): number {
  const currentYear = Number(feedDay.slice(0, 4))
  return currentYear - birthYear
}

function mapBirthItem(
  item: OnThisDayItem & { year: number },
  index: number,
  feedDay: string,
): WikitabFeedBirthsCardPayload | null {
  const lead = item.pages?.[0]
  const title = lead?.normalizedtitle ?? lead?.title?.replace(/_/g, ' ')
  const url = lead ? summaryUrl(lead) : undefined
  if (!url || !title) return null

  return {
    key: `births-${item.year}-${index}`,
    url,
    title,
    ageYears: ageInYears(item.year, feedDay),
    description: lead?.description || subtitleFromText(item.text ?? '', title),
    thumbnailUrl: wikimediaThumbnailAtLeast(
      lead?.thumbnail?.source,
      WIKITAB_FEED_CARD_THUMB_WIDTH,
    ),
  }
}

function birthsUrl(day: string): string {
  const [, month, date] = day.split('-')
  return `https://${EN_WIKI_HOST}/api/rest_v1/feed/onthisday/births/${month}/${date}`
}

/** Wikifeeds births for today's month/day (~294 items, newest first). */
export async function fetchBirthsOnThisDay(
  day: string,
  signal?: AbortSignal,
): Promise<WikitabCardData[]> {
  try {
    const response = await fetchWikimedia(birthsUrl(day), {
      headers: wikimediaApiFetchHeaders('wikitab-births'),
      signal,
    })
    if (!response.ok) return []

    const payload = (await response.json()) as BirthsResponse
    return (payload.births ?? [])
      .filter((item): item is OnThisDayItem & { year: number } => typeof item.year === 'number')
      .map((item, index) => mapBirthItem(item, index, day))
      .filter((payload): payload is WikitabFeedBirthsCardPayload => payload !== null)
      .map(feedBirthsPayloadToCardData)
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}
