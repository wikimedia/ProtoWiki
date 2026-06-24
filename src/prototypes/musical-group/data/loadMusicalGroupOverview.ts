import { formatCommonsItemCountLabel, getCommonsCategoryCount } from './commonsImages'
import { fetchMusicalGroupOverview } from './fetchMusicalGroupOverview'
import {
  getCachedMusicalGroup,
  setCachedMusicalGroupOverview,
} from './musicalGroupCache'
import type { FetchMusicalGroupOptions, MusicalGroupData, MusicalGroupOverviewData } from './types'

export interface LoadMusicalGroupOverviewResult {
  overview: MusicalGroupOverviewData
  fromCache: boolean
}

async function resolveCommonsImageCount(
  data: MusicalGroupData,
  cachedCount?: number,
  cachedCapped?: boolean,
  signal?: AbortSignal,
): Promise<{ count?: number; capped?: boolean }> {
  if (cachedCount !== undefined) {
    return { count: cachedCount, capped: cachedCapped }
  }

  if (!data.commonsCategory) return {}

  const { count, hasSubcats } = await getCommonsCategoryCount(data.commonsCategory, signal)
  return { count, capped: hasSubcats }
}

function buildPhotosOverview(
  data: MusicalGroupData,
  count?: number,
  capped?: boolean,
): MusicalGroupOverviewData['photos'] | undefined {
  if (count === undefined || !data.commonsCategory) return undefined
  return {
    itemCount: count,
    itemCountLabel: formatCommonsItemCountLabel(count, capped),
  }
}

export function isCachedOverviewUsable(overview: MusicalGroupOverviewData): boolean {
  const views = overview.article?.viewCount ?? 0
  const label = overview.article?.viewsLabel ?? ''
  if (views > 0) return true
  // Stale entries from failed wikimedia.org metrics fetches (CORS / "0 views …").
  return !label.startsWith('0 views') && label !== '—'
}

export async function loadMusicalGroupOverview(
  id: string,
  data: MusicalGroupData,
  options: FetchMusicalGroupOptions = {},
): Promise<LoadMusicalGroupOverviewResult> {
  const cached = getCachedMusicalGroup(id)
  if (cached?.overview && isCachedOverviewUsable(cached.overview)) {
    return { overview: cached.overview, fromCache: true }
  }

  const { signal } = options

  // The article content and the photo count are independent — run them in
  // parallel and never let the (best-effort) count block or break the article.
  const [overview, countResult] = await Promise.all([
    fetchMusicalGroupOverview(data, { signal }),
    resolveCommonsImageCount(
      data,
      cached?.commonsImageCount,
      cached?.commonsImageCountCapped,
      signal,
    ).catch(() => ({}) as { count?: number; capped?: boolean }),
  ])

  overview.photos = buildPhotosOverview(data, countResult.count, countResult.capped)

  setCachedMusicalGroupOverview(id, overview)
  return { overview, fromCache: false }
}
