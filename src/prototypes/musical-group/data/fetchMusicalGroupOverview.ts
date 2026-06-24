import { wikimediaApiFetchHeaders } from '@/config'

import { formatCommonsItemCountLabel } from './commonsImages'
import type { MusicalGroupData, MusicalGroupOverviewData } from './types'

const EN_WIKI_HOST = 'en.wikipedia.org'

export interface FetchMusicalGroupOverviewOptions {
  signal?: AbortSignal
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}

interface PageSummaryResponse {
  title?: string
  extract_html?: string
  thumbnail?: { source?: string }
  timestamp?: string
  content_urls?: { desktop?: { page?: string } }
}

interface SearchHit {
  title?: string
  wordcount?: number
}

function parseMediaWikiTimestamp(timestamp: string): Date {
  const trimmed = timestamp.trim()
  if (!trimmed.length) return new Date(Number.NaN)
  if (trimmed.includes('T')) {
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`)
  }
  return new Date(trimmed.replace(' ', 'T') + 'Z')
}

function toPageviewDateParam(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function yesterdayPageviewDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return toPageviewDateParam(d)
}

function pageviewsArticleSlug(title: string): string {
  return encodeURIComponent(title.replace(/ /g, '_'))
}

function formatRelativeTime(isoTimestamp: string): string {
  const then = parseMediaWikiTimestamp(isoTimestamp).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = Date.now() - then
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function formatViewCount(total: number): string {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
  if (total >= 1000) return `${(total / 1000).toFixed(1)}K`
  return total.toLocaleString()
}

function startOfIsoWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

function deadLinkExtractHtml(html: string): string {
  return html
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '<span class="overview-extract__link">$1</span>')
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?strong>/gi, '')
}

function wikiActionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${EN_WIKI_HOST}/w/api.php?${search.toString()}`
}

async function fetchPageSummary(title: string, signal?: AbortSignal): Promise<PageSummaryResponse | null> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetch(`https://${EN_WIKI_HOST}/api/rest_v1/page/summary/${slug}`, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-page-summary'),
  })
  if (!response.ok) return null
  return (await response.json()) as PageSummaryResponse
}

async function fetchArticleWordCount(title: string, signal?: AbortSignal): Promise<number | undefined> {
  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    srsearch: title,
    srnamespace: '0',
    srlimit: '5',
  })

  const response = await fetch(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-wordcount'),
  })
  if (!response.ok) return undefined

  const json = (await response.json()) as { query?: { search?: SearchHit[] } }
  const hits = json.query?.search ?? []
  const normalized = title.replace(/ /g, '_').toLowerCase()
  const match =
    hits.find((hit) => hit.title?.replace(/ /g, '_').toLowerCase() === normalized) ?? hits[0]
  return match?.wordcount
}

function sumPageviewsInRange(
  pageviews: Record<string, number | null>,
  start: string,
  end: string,
): number {
  let total = 0
  for (const [isoDate, views] of Object.entries(pageviews)) {
    if (views == null) continue
    const ymd = isoDate.replace(/-/g, '')
    if (ymd >= start && ymd <= end) {
      total += views
    }
  }
  return total
}

async function fetchArticlePageviews(
  title: string,
  signal?: AbortSignal,
): Promise<{ pageviews: Record<string, number | null>; ok: boolean }> {
  const url = wikiActionUrl({
    action: 'query',
    prop: 'pageviews',
    titles: title,
    pvipdays: '31',
  })

  try {
    const response = await fetch(url, {
      signal,
      headers: wikimediaApiFetchHeaders('musical-group-pageviews'),
    })
    if (!response.ok) {
      return { pageviews: {}, ok: false }
    }

    const json = (await response.json()) as {
      query?: { pages?: Record<string, { missing?: boolean; pageviews?: Record<string, number | null> }> }
    }
    const page = Object.values(json.query?.pages ?? {})[0]
    if (!page || page.missing) {
      return { pageviews: {}, ok: false }
    }

    return { pageviews: page.pageviews ?? {}, ok: true }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return { pageviews: {}, ok: false }
  }
}

async function resolvePageviewsLabel(
  title: string,
  signal?: AbortSignal,
): Promise<{ total: number; label: string }> {
  const fetched = await fetchArticlePageviews(title, signal)
  if (!fetched.ok) {
    return { total: 0, label: '—' }
  }

  const { pageviews } = fetched
  const end = yesterdayPageviewDate()
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  const weekStart = toPageviewDateParam(startOfIsoWeekUtc(yesterday))
  const weekTotal = sumPageviewsInRange(pageviews, weekStart, end)
  if (weekTotal > 0) {
    return {
      total: weekTotal,
      label: `${formatViewCount(weekTotal)} views this week`,
    }
  }

  const sevenDaysAgo = new Date(yesterday)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
  const sevenStart = toPageviewDateParam(sevenDaysAgo)
  const sevenTotal = sumPageviewsInRange(pageviews, sevenStart, end)
  if (sevenTotal > 0) {
    return {
      total: sevenTotal,
      label: `${formatViewCount(sevenTotal)} views in the last 7 days`,
    }
  }

  const thirtyDaysAgo = new Date(yesterday)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
  const monthStart = toPageviewDateParam(thirtyDaysAgo)
  const monthTotal = sumPageviewsInRange(pageviews, monthStart, end)
  if (monthTotal > 0) {
    return {
      total: monthTotal,
      label: `${formatViewCount(monthTotal)} views this month`,
    }
  }

  return { total: 0, label: '—' }
}

function buildPhotosOverview(
  data: MusicalGroupData,
  commonsImageCount?: number,
  commonsImageCountCapped?: boolean,
): MusicalGroupOverviewData['photos'] | undefined {
  if (commonsImageCount === undefined || !data.commonsCategory) return undefined
  return {
    itemCount: commonsImageCount,
    itemCountLabel: formatCommonsItemCountLabel(commonsImageCount, commonsImageCountCapped),
  }
}

export async function fetchMusicalGroupOverview(
  data: MusicalGroupData,
  options: FetchMusicalGroupOverviewOptions = {},
): Promise<MusicalGroupOverviewData> {
  const { signal, commonsImageCount, commonsImageCountCapped } = options
  const fetchedAt = Date.now()

  const photos = buildPhotosOverview(data, commonsImageCount, commonsImageCountCapped)

  if (!data.enwikiTitle) {
    return { noEnglishArticle: true, photos, fetchedAt }
  }

  const title = data.enwikiTitle

  const [summary, wordCount, views] = await Promise.all([
    fetchPageSummary(title, signal),
    fetchArticleWordCount(title, signal),
    resolvePageviewsLabel(title, signal),
  ])

  if (!summary) {
    return { noEnglishArticle: true, photos, fetchedAt }
  }

  const extractHtml = deadLinkExtractHtml(summary.extract_html ?? '')
  const timestamp = summary.timestamp ?? ''
  const relative = timestamp ? formatRelativeTime(timestamp) : '—'

  return {
    photos,
    article: {
      title: summary.title ?? title,
      extractHtml,
      thumbnailUrl: summary.thumbnail?.source,
      articleUrl: summary.content_urls?.desktop?.page ?? `https://${EN_WIKI_HOST}/wiki/${pageviewsArticleSlug(title)}`,
      lastEditedTimestamp: timestamp,
      lastEditedLabel: timestamp ? `Updated ${relative}` : 'Updated —',
      viewCount: views.total,
      viewsLabel: views.label,
      wordCount: wordCount ?? 0,
      wordCountLabel: wordCount ? `${wordCount.toLocaleString()} words` : '',
    },
    fetchedAt,
  }
}
