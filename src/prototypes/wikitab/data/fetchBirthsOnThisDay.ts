import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import type { WikitabCardData } from '../sections'
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
): WikitabCardData {
  const lead = item.pages?.[0]
  const linkTitle = lead?.normalizedtitle ?? lead?.title?.replace(/_/g, ' ')
  const title = linkTitle ?? item.text ?? `Birth ${item.year}`

  return {
    key: `births-${item.year}-${index}`,
    title,
    supportingText: `${ageInYears(item.year, feedDay)} years old`,
    description: lead?.description || subtitleFromText(item.text ?? '', linkTitle),
    href: lead ? summaryUrl(lead) : undefined,
    linkTitle,
    thumbnailUrl: lead?.thumbnail?.source,
    thumbnailTitle:
      !lead?.thumbnail?.source && linkTitle ? linkTitle : undefined,
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
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return []
  }
}
