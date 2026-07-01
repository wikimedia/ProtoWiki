import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { utcDayKey } from './cacheKeys'
import { enwikiArticleUrl } from './enwikiTitle'
import { fetchEnwikiFeaturedFeedDay, wikimediaFeedErrorMessage } from './fetchEnwikiFeaturedFeedDay'
import { getCachedTrendingFeed, setCachedTrendingFeed } from './homeTabCache'
import { fetchPageSummary, type PageSummary } from './pageSummary'
import type { HomeTrending } from './types'
import { normalizeQid } from './wikidataApi'

const MAX_TRENDING = 10
const SUMMARY_CONCURRENCY = 3

interface MostreadArticle {
  title?: string
  views?: number
  rank?: number
}

let sessionCached: { day: string; value: HomeTrending[] } | null = null

function parseMediaWikiTimestamp(timestamp: string): Date {
  const trimmed = timestamp.trim()
  if (!trimmed.length) return new Date(Number.NaN)
  if (trimmed.includes('T')) {
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`)
  }
  return new Date(trimmed.replace(' ', 'T') + 'Z')
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
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`
  return total.toLocaleString()
}

function viewsPeriodLabel(mostreadDate?: string): string {
  if (!mostreadDate) return 'today'

  const parsed = parseMediaWikiTimestamp(mostreadDate)
  if (Number.isNaN(parsed.getTime())) return 'today'

  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const isYesterday =
    parsed.getUTCFullYear() === yesterday.getUTCFullYear() &&
    parsed.getUTCMonth() === yesterday.getUTCMonth() &&
    parsed.getUTCDate() === yesterday.getUTCDate()
  if (isYesterday) return 'today'

  return `on ${parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })}`
}

export function isTrendingSummaryIncomplete(item: HomeTrending): boolean {
  return !item.lastEditedTimestamp
}

function applySummaryToTrendingItem(
  item: HomeTrending,
  summary: PageSummary | null,
): HomeTrending {
  if (!summary) return item

  const title = (summary.normalizedtitle ?? summary.title ?? item.enwikiTitle).replace(/_/g, ' ')
  const timestamp = summary.timestamp ?? ''

  return {
    ...item,
    title,
    description: summary.description ?? summary.extract ?? item.description,
    thumbnailUrl: summary.thumbnail?.source ?? item.thumbnailUrl,
    articleUrl: summary.content_urls?.desktop?.page ?? item.articleUrl,
    itemId: normalizeQid(summary.wikibase_item) ?? item.itemId,
    lastEditedTimestamp: timestamp,
    lastEditedLabel: timestamp ? `Updated ${formatRelativeTime(timestamp)}` : item.lastEditedLabel,
  }
}

async function enrichMostreadArticle(
  article: MostreadArticle,
  viewsPeriod: string,
  signal?: AbortSignal,
): Promise<HomeTrending | null> {
  if (!article.title || article.views == null) return null

  const enwikiTitle = article.title.replace(/_/g, ' ')
  const summary = await fetchPageSummary(enwikiTitle, signal, 'musical-group-trending')
  const title = (summary?.normalizedtitle ?? summary?.title ?? enwikiTitle).replace(/_/g, ' ')
  const timestamp = summary?.timestamp ?? ''
  const viewCount = article.views

  return {
    title,
    enwikiTitle,
    description: summary?.description ?? summary?.extract ?? '',
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl: summary?.content_urls?.desktop?.page ?? enwikiArticleUrl(enwikiTitle),
    itemId: normalizeQid(summary?.wikibase_item) ?? undefined,
    viewCount,
    viewsLabel: `${formatViewCount(viewCount)} views ${viewsPeriod}`,
    lastEditedTimestamp: timestamp,
    lastEditedLabel: timestamp ? `Updated ${formatRelativeTime(timestamp)}` : 'Updated —',
    rank: article.rank,
  }
}

function trendingItemsChanged(before: HomeTrending[], after: HomeTrending[]): boolean {
  if (before.length !== after.length) return true
  return after.some(
    (item, index) =>
      item.lastEditedTimestamp !== before[index]?.lastEditedTimestamp ||
      item.description !== before[index]?.description ||
      item.thumbnailUrl !== before[index]?.thumbnailUrl ||
      item.itemId !== before[index]?.itemId,
  )
}

/** Re-fetch summaries for trending cards that failed enrichment earlier. */
export async function refillIncompleteTrendingItems(
  items: HomeTrending[],
  signal?: AbortSignal,
): Promise<HomeTrending[]> {
  const incomplete = items.filter(isTrendingSummaryIncomplete)
  if (!incomplete.length) return items

  const byTitle = new Map(items.map((item) => [item.enwikiTitle.toLowerCase(), item]))

  for (const item of incomplete) {
    if (signal?.aborted) break

    const summary = await fetchPageSummary(item.enwikiTitle, signal, 'musical-group-trending', {
      bypassFailureCache: true,
    })
    byTitle.set(item.enwikiTitle.toLowerCase(), applySummaryToTrendingItem(item, summary))
  }

  return items.map((item) => byTitle.get(item.enwikiTitle.toLowerCase()) ?? item)
}

async function persistTrendingIfChanged(
  dayKey: string,
  before: HomeTrending[],
  after: HomeTrending[],
): Promise<HomeTrending[]> {
  if (after.length) {
    sessionCached = { day: dayKey, value: after }
    if (trendingItemsChanged(before, after)) {
      setCachedTrendingFeed(dayKey, after)
    }
  }
  return after
}

export function clearTrendingSessionCache(): void {
  sessionCached = null
}

/** Most-read articles from today's featured feed, enriched with page summaries. */
export async function fetchTrendingFeed(signal?: AbortSignal): Promise<HomeTrending[]> {
  const dayKey = utcDayKey()

  const stored = getCachedTrendingFeed(dayKey)
  if (stored?.length) {
    const refilled = await refillIncompleteTrendingItems(stored, signal)
    return persistTrendingIfChanged(dayKey, stored, refilled)
  }

  if (sessionCached && sessionCached.day === dayKey && sessionCached.value.length) {
    const refilled = await refillIncompleteTrendingItems(sessionCached.value, signal)
    return persistTrendingIfChanged(dayKey, sessionCached.value, refilled)
  }

  const { ok, json, status } = await fetchEnwikiFeaturedFeedDay(signal, 'musical-group-trending-feed')
  if (!ok) {
    throw new Error(wikimediaFeedErrorMessage(status, 'Trending articles'))
  }

  const articles = json?.mostread?.articles
  if (!articles?.length) return []

  const viewsPeriod = viewsPeriodLabel(json.mostread?.date)
  const slice = [...articles]
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .slice(0, MAX_TRENDING)

  const [firstArticle, ...restArticles] = slice
  const firstEnriched = firstArticle
    ? await enrichMostreadArticle(firstArticle, viewsPeriod, signal)
    : null
  const restEnriched = restArticles.length
    ? await mapWithConcurrency(
        restArticles,
        SUMMARY_CONCURRENCY,
        (article) => enrichMostreadArticle(article, viewsPeriod, signal),
        signal,
      )
    : []

  const enriched = [firstEnriched, ...restEnriched].filter(
    (item): item is HomeTrending => item !== null,
  )
  const refilled = await refillIncompleteTrendingItems(enriched, signal)
  return persistTrendingIfChanged(dayKey, enriched, refilled)
}
