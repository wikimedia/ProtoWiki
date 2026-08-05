import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { normalizeEnwikiTitle, wikiActionUrl } from './enwikiTitle'
import { fetchPageSummary } from './pageSummary'
import type { HomeSavedItem } from './types'

/** Random mainspace titles fetched as contribute-tab seeds when nothing is saved. */
export const CONTRIBUTE_RANDOM_PAGE_COUNT = 8

const RESOLVE_CONCURRENCY = 3

export function randomPageItemId(enwikiTitle: string): string {
  return `enwiki:${normalizeEnwikiTitle(enwikiTitle).toLowerCase()}`
}

export async function fetchRandomTitles(
  count: number,
  signal?: AbortSignal,
): Promise<string[]> {
  const response = await fetchWikimedia(
    wikiActionUrl({
      action: 'query',
      list: 'random',
      rnnamespace: '0',
      rnlimit: String(count),
    }),
    {
      signal,
      headers: wikimediaApiFetchHeaders('musical-group-random-pages'),
    },
  )
  if (!response.ok) return []

  const json = (await response.json()) as {
    query?: { random?: { title?: string }[] }
  }

  return (json.query?.random ?? [])
    .map((entry) => entry.title)
    .filter((title): title is string => Boolean(title))
}

async function resolveRandomPageItem(
  title: string,
  signal?: AbortSignal,
): Promise<HomeSavedItem | null> {
  const summary = await fetchPageSummary(title, signal, 'musical-group-random-page-summary')
  if (!summary?.title && !summary?.normalizedtitle) return null

  const enwikiTitle = summary.normalizedtitle ?? summary.title ?? title

  return {
    id: randomPageItemId(enwikiTitle),
    title: summary.normalizedtitle ?? summary.title ?? title,
    enwikiTitle,
    description: summary.description ?? '',
    thumbnailUrl: summary.thumbnail?.source,
    savedAt: 0,
  }
}

/** Random English Wikipedia articles as synthetic saved-item seeds. */
export async function fetchRandomPageItems(
  count = CONTRIBUTE_RANDOM_PAGE_COUNT,
  signal?: AbortSignal,
): Promise<HomeSavedItem[]> {
  const titles = await fetchRandomTitles(count, signal)
  if (!titles.length) return []

  const items = await mapWithConcurrency(
    titles,
    RESOLVE_CONCURRENCY,
    (title) => resolveRandomPageItem(title, signal),
    signal,
  )

  return items.filter((item): item is HomeSavedItem => item !== null)
}
