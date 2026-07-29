import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import type { BookmarkEntry } from './bookmarks'
import { bookmarksKey } from './cacheKeys'
import { entityDisplayLabel, sentenceCase } from './formatLabel'
import {
  getCachedSavedSummaries,
  setCachedSavedSummaries,
} from './homeTabCache'
import { getCachedMusicalGroup } from './musicalGroupCache'
import { fetchPageSummary } from './pageSummary'
import type { HomeSavedItem } from './types'
import { commonsFileUrl, fetchEntityClaims } from './wikidataApi'

const RESOLVE_CONCURRENCY = 3

function savedSummariesNeedRefresh(items: HomeSavedItem[]): boolean {
  return items.some((item) => !item.enwikiTitle)
}

async function resolveSavedThumbnailUrl(
  thumbnailUrl: string | undefined,
  enwikiTitle: string | undefined,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (thumbnailUrl || !enwikiTitle) return thumbnailUrl

  const summary = await fetchPageSummary(enwikiTitle, signal, 'musical-group-saved-summary')
  return summary?.thumbnail?.source
}

function normalizeSavedItemTitle(item: HomeSavedItem): HomeSavedItem {
  return {
    ...item,
    title: entityDisplayLabel(item.title, item.enwikiTitle),
  }
}

async function resolveSavedItem(
  entry: BookmarkEntry,
  signal?: AbortSignal,
): Promise<HomeSavedItem | null> {
  const cached = getCachedMusicalGroup(entry.id)
  if (cached) {
    const { data } = cached
    const thumbnailUrl = await resolveSavedThumbnailUrl(
      data.images[0]?.url ??
        (data.imageFilename ? commonsFileUrl(data.imageFilename, 256) : undefined),
      data.enwikiTitle,
      signal,
    )
    return {
      id: entry.id,
      title: entityDisplayLabel(data.label, data.enwikiTitle),
      enwikiTitle: data.enwikiTitle,
      description: data.description ? sentenceCase(data.description) : '',
      thumbnailUrl,
      savedAt: entry.savedAt,
    }
  }

  try {
    const claims = await fetchEntityClaims(entry.id, signal)
    const thumbnailUrl = await resolveSavedThumbnailUrl(
      claims.imageFilename ? commonsFileUrl(claims.imageFilename, 256) : undefined,
      claims.enwikiTitle,
      signal,
    )
    return {
      id: entry.id,
      title: entityDisplayLabel(claims.label, claims.enwikiTitle),
      enwikiTitle: claims.enwikiTitle,
      description: claims.description ?? '',
      thumbnailUrl,
      savedAt: entry.savedAt,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return null
  }
}

/** Resolve each bookmarked QID to display + lookup metadata (cache-first). */
export async function fetchSavedItemSummaries(
  entries: BookmarkEntry[],
  signal?: AbortSignal,
): Promise<HomeSavedItem[]> {
  const dependencyKey = bookmarksKey()
  const cached = getCachedSavedSummaries(dependencyKey)
  if (cached && !savedSummariesNeedRefresh(cached)) {
    return cached.map(normalizeSavedItemTitle)
  }

  const resolved = await mapWithConcurrency(
    entries,
    RESOLVE_CONCURRENCY,
    (entry) => resolveSavedItem(entry, signal),
    signal,
  )
  const items = resolved
    .filter((item): item is HomeSavedItem => item !== null)
    .map(normalizeSavedItemTitle)
  setCachedSavedSummaries(dependencyKey, items)
  return items
}
