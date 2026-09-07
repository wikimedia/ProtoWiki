import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { normalizeEnwikiTitle } from '../../musical-group/data/enwikiTitle'

import { fetchPageSummary } from '../../musical-group/data/pageSummary'
import {
  getCachedSavedSummaries,
  setCachedSavedSummaries,
} from '../../musical-group/data/homeTabCache'
import type { HomeSavedItem } from '../../musical-group/data/types'
import { readingListKey, readingListSavedPageId } from './readingListSavedPages'

async function resolveReadingListItem(
  title: string,
  savedAt: number,
  signal?: AbortSignal,
): Promise<HomeSavedItem | null> {
  const enwikiTitle = normalizeEnwikiTitle(title)
  if (!enwikiTitle) return null

  const summary = await fetchPageSummary(enwikiTitle, signal, 'wikita-lite-reading-list-summary')

  return {
    id: readingListSavedPageId(enwikiTitle),
    title: summary?.title?.trim() || enwikiTitle,
    enwikiTitle,
    description: summary?.description?.trim() ?? '',
    thumbnailUrl: summary?.thumbnail?.source,
    savedAt,
  }
}

/** Resolve each reading-list title to display + lookup metadata (cache-first). */
export async function fetchReadingListSummaries(
  titles: string[],
  signal?: AbortSignal,
): Promise<HomeSavedItem[]> {
  const dependencyKey = readingListKey()
  const cached = getCachedSavedSummaries(dependencyKey)
  if (cached) {
    return cached
  }

  const resolved = await mapWithConcurrency(
    titles,
    3,
    (title, index) => resolveReadingListItem(title, titles.length - index, signal),
    signal,
  )

  const items = resolved.filter((item): item is HomeSavedItem => item !== null)
  setCachedSavedSummaries(dependencyKey, items)
  return items
}
