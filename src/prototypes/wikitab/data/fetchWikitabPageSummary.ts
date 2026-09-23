import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { articleTitleKey, EN_WIKI_HOST } from './wikitabHtml'

const SUMMARY_CONCURRENCY = 2

export interface WikitabPageSummary {
  pageid: number
  title: string
  description?: string
  thumbnailUrl?: string
}

interface PageSummaryResponse {
  pageid?: number
  title?: string
  description?: string
  thumbnail?: { source?: string }
}

const pageSummaryByTitleKey = new Map<string, WikitabPageSummary>()

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

/** REST page summary with session cache keyed by article title. */
export async function fetchWikitabPageSummary(
  title: string,
  signal: AbortSignal | undefined,
  purpose = 'wikitab-page-summary',
): Promise<WikitabPageSummary | null> {
  const key = articleTitleKey(title)
  const cached = pageSummaryByTitleKey.get(key)
  if (cached) return cached

  const url = `https://${EN_WIKI_HOST}/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, '_'),
  )}?redirect=true`

  try {
    const response = await fetchWikimedia(url, {
      signal,
      headers: wikimediaApiFetchHeaders(purpose),
    })
    if (!response.ok) return null

    const summary = (await response.json()) as PageSummaryResponse
    if (typeof summary.pageid !== 'number' || typeof summary.title !== 'string') return null

    const data: WikitabPageSummary = {
      pageid: summary.pageid,
      title: summary.title,
      description: summary.description?.trim() || undefined,
      thumbnailUrl: normalizeThumbnailUrl(summary.thumbnail?.source),
    }
    pageSummaryByTitleKey.set(articleTitleKey(data.title), data)
    pageSummaryByTitleKey.set(key, data)
    return data
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    return null
  }
}

export async function fetchWikitabPageSummaryThumbnail(
  title: string,
  signal: AbortSignal | undefined,
  purpose = 'wikitab-page-summary',
): Promise<string | undefined> {
  const summary = await fetchWikitabPageSummary(title, signal, purpose)
  return summary?.thumbnailUrl
}

/** Batch summary thumbnail fetch — one request per title, concurrency 2. */
export async function fetchWikitabPageSummaryThumbnails(
  titles: string[],
  signal: AbortSignal | undefined,
  purpose = 'wikitab-page-summary',
): Promise<Map<string, string>> {
  const thumbnails = new Map<string, string>()
  const unique = [...new Set(titles.map((title) => title.trim()).filter(Boolean))]
  if (!unique.length) return thumbnails

  const results = await mapWithConcurrency(
    unique,
    SUMMARY_CONCURRENCY,
    async (title) => {
      const summary = await fetchWikitabPageSummary(title, signal, purpose)
      return { key: articleTitleKey(title), url: summary?.thumbnailUrl }
    },
    signal,
  )

  for (const { key, url } of results) {
    if (url) thumbnails.set(key, url)
  }

  return thumbnails
}
