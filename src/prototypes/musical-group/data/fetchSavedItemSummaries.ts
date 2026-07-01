import type { BookmarkEntry } from './bookmarks'
import { sentenceCase } from './formatLabel'
import { getCachedMusicalGroup } from './musicalGroupCache'
import { fetchPageSummary } from './pageSummary'
import type { HomeSavedItem } from './types'
import { commonsFileUrl, fetchEntityClaims } from './wikidataApi'

async function resolveSavedThumbnailUrl(
  thumbnailUrl: string | undefined,
  enwikiTitle: string | undefined,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (thumbnailUrl || !enwikiTitle) return thumbnailUrl

  const summary = await fetchPageSummary(enwikiTitle, signal, 'musical-group-saved-summary')
  return summary?.thumbnail?.source
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
      title: data.label,
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
      title: claims.label,
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
  const resolved = await Promise.all(entries.map((entry) => resolveSavedItem(entry, signal)))
  return resolved.filter((item): item is HomeSavedItem => item !== null)
}
