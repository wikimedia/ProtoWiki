import { getCommonsCategoryFiles } from './commonsImages'
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

  const membership = await getCommonsCategoryFiles(data.commonsCategory, signal)
  return { count: membership.totalCount, capped: membership.capped }
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
  const { count, capped } = await resolveCommonsImageCount(
    data,
    cached?.commonsImageCount,
    cached?.commonsImageCountCapped,
    signal,
  )

  const overview = await fetchMusicalGroupOverview(data, {
    signal,
    commonsImageCount: count,
    commonsImageCountCapped: capped,
  })

  setCachedMusicalGroupOverview(id, overview)
  return { overview, fromCache: false }
}
