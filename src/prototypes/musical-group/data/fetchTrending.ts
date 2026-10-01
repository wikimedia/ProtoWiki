import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { utcDayKey } from './cacheKeys'
import { enwikiArticleUrl } from './enwikiTitle'
import { fetchEnwikiFeaturedFeedDay, wikimediaFeedErrorMessage } from './fetchEnwikiFeaturedFeedDay'
import { getCachedTrendingFeed, setCachedTrendingFeed } from './homeTabCache'
import { fetchPageSummary, type PageSummary } from './pageSummary'
import type { HomeTrending } from './types'
import { normalizeQid } from './wikidataApi'
import {
  formatCompactNumber,
  formatElapsed,
  formatShortDate,
  usesLocalizedFormat,
} from '@/lib/contentFormat'
import { format, MESSAGES } from '../../wikita-lite/i18n'

const MAX_TRENDING = 10
const SUMMARY_CONCURRENCY = 3

/** Most-read entries are full page summaries plus view counts. */
interface MostreadArticle extends PageSummary {
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
  if (usesLocalizedFormat()) return formatElapsed(diffMs)
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatViewCount(total: number): string {
  if (usesLocalizedFormat()) return formatCompactNumber(total)
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`
  return total.toLocaleString()
}

function viewsPeriodLabel(mostreadDate?: string): string {
  if (!mostreadDate) return MESSAGES.viewsToday

  const parsed = parseMediaWikiTimestamp(mostreadDate)
  if (Number.isNaN(parsed.getTime())) return MESSAGES.viewsToday

  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const isYesterday =
    parsed.getUTCFullYear() === yesterday.getUTCFullYear() &&
    parsed.getUTCMonth() === yesterday.getUTCMonth() &&
    parsed.getUTCDate() === yesterday.getUTCDate()
  if (isYesterday) return MESSAGES.viewsToday

  if (usesLocalizedFormat()) return format(MESSAGES.viewsOnDate, formatShortDate(parsed))
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
    lastEditedLabel: timestamp
      ? format(MESSAGES.updatedRelative, formatRelativeTime(timestamp))
      : item.lastEditedLabel,
  }
}

async function enrichMostreadArticle(
  article: MostreadArticle,
  viewsPeriod: string,
  signal?: AbortSignal,
): Promise<HomeTrending | null> {
  if (!article.title || article.views == null) return null

  const enwikiTitle = article.title.replace(/_/g, ' ')
  // The feed already embeds each article's summary; fetch only when it's partial.
  const summary: PageSummary | null =
    article.timestamp && article.content_urls?.desktop?.page
      ? article
      : await fetchPageSummary(enwikiTitle, signal, 'musical-group-trending')
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
    viewsLabel: format(MESSAGES.viewsLabel, formatViewCount(viewCount), viewsPeriod),
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

async function persistTrendingFeed(dayKey: string, after: HomeTrending[]): Promise<HomeTrending[]> {
  if (!after.length) return after

  sessionCached = { day: dayKey, value: after }

  const existing = getCachedTrendingFeed()
  if (!existing?.length || trendingItemsChanged(existing, after)) {
    setCachedTrendingFeed(dayKey, after)
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
    return persistTrendingFeed(dayKey, refilled)
  }

  if (sessionCached && sessionCached.day === dayKey && sessionCached.value.length) {
    const refilled = await refillIncompleteTrendingItems(sessionCached.value, signal)
    return persistTrendingFeed(dayKey, refilled)
  }

  const { ok, json, status } = await fetchEnwikiFeaturedFeedDay(signal, 'musical-group-trending-feed')
  if (!ok) {
    throw new Error(wikimediaFeedErrorMessage(status, 'trending'))
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
  return persistTrendingFeed(dayKey, refilled)
}
