import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { getCachedItemThumbnail, setCachedItemThumbnailBatch } from './itemThumbnailCache'
import { getCachedMusicalGroup } from './musicalGroupCache'
import { setListThumbnailUrlForFirstItem } from './lists'
import { fetchPageSummary } from './pageSummary'
import { commonsFileUrl, fetchEntityClaims } from './wikidataApi'

const RESOLVE_CONCURRENCY = 3

function thumbnailFromCache(id: string): string | undefined {
  const cached = getCachedMusicalGroup(id)
  if (cached) {
    const fromPage =
      cached.data.images[0]?.url ??
      (cached.data.imageFilename ? commonsFileUrl(cached.data.imageFilename, 256) : undefined) ??
      cached.overview?.article?.thumbnailUrl
    if (fromPage) {
      if (!getCachedItemThumbnail(id)) setCachedItemThumbnailBatch({ [id]: fromPage })
      return fromPage
    }
  }

  return getCachedItemThumbnail(id)
}

function hasKnownThumbnail(
  id: string,
  knownThumbnails: Record<string, string>,
): boolean {
  return Boolean(knownThumbnails[id] || thumbnailFromCache(id))
}

async function fetchItemThumbnailUrl(
  id: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const cachedUrl = thumbnailFromCache(id)
  if (cachedUrl) return cachedUrl

  try {
    const claims = await fetchEntityClaims(id, signal)
    const fromClaims = claims.imageFilename
      ? commonsFileUrl(claims.imageFilename, 256)
      : undefined
    if (fromClaims) {
      setCachedItemThumbnailBatch({ [id]: fromClaims })
      return fromClaims
    }

    if (!claims.enwikiTitle) return undefined

    const summary = await fetchPageSummary(
      claims.enwikiTitle,
      signal,
      'musical-group-list-thumbnail',
    )
    const url = summary?.thumbnail?.source
    if (url) setCachedItemThumbnailBatch({ [id]: url })
    return url
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return undefined
  }
}

/** Resolve the list thumbnail from the first item added (cache + stored URL). */
export function resolveListThumbnailUrls(
  itemIds: string[],
  storedThumbnailUrl?: string,
): string[] {
  const firstId = itemIds[0]
  if (!firstId) return []

  const url = storedThumbnailUrl ?? thumbnailFromCache(firstId)
  return url ? [url] : []
}

/** Fetch thumbnail URLs for list items that are not already known. */
export async function fetchMissingListItemThumbnails(
  itemIds: string[],
  knownThumbnails: Record<string, string>,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const missing = [...new Set(itemIds)].filter((id) => !hasKnownThumbnail(id, knownThumbnails))
  if (!missing.length) return {}

  const resolved = await mapWithConcurrency(
    missing,
    RESOLVE_CONCURRENCY,
    async (id) => {
      const url = await fetchItemThumbnailUrl(id, signal)
      return url ? ([id, url] as const) : null
    },
    signal,
  )

  const thumbnails: Record<string, string> = {}
  for (const entry of resolved) {
    if (!entry) continue
    thumbnails[entry[0]] = entry[1]
  }

  if (Object.keys(thumbnails).length) {
    setCachedItemThumbnailBatch(thumbnails)
    for (const [itemId, url] of Object.entries(thumbnails)) {
      setListThumbnailUrlForFirstItem(itemId, url)
    }
  }

  return thumbnails
}
