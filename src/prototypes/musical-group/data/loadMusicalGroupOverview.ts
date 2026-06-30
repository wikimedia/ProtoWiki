import { formatCommonsPhotosLabel, getCommonsCategoryCount, resolveCommonsCategory } from './commonsImages'
import type { CommonsCategoryCount } from './commonsImages'
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


async function resolveCommonsCategoryCount(
  data: MusicalGroupData,
  signal?: AbortSignal,
): Promise<CommonsCategoryCount | undefined> {
  const category = resolveCommonsCategory(data)
  if (!category) return undefined
  return getCommonsCategoryCount(category, signal)
}

function buildImagesOverview(
  data: MusicalGroupData,
  info?: CommonsCategoryCount,
): MusicalGroupOverviewData['images'] | undefined {
  if (!resolveCommonsCategory(data) || !info) return undefined
  // Nothing known (empty/missing category or a failed lookup) — show no count.
  if (info.files === 0 && info.subcats === 0) return undefined
  return {
    itemCount: info.subcats > 0 ? info.subcats : info.files,
    itemCountLabel: formatCommonsPhotosLabel(info.files, info.subcats),
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

  // The article content and the image count are independent — run them in
  // parallel and never let the (best-effort) count block or break the article.
  const [overview, categoryInfo] = await Promise.all([
    fetchMusicalGroupOverview(data, { signal }),
    resolveCommonsCategoryCount(data, signal).catch(() => undefined),
  ])

  overview.images = buildImagesOverview(data, categoryInfo)

  setCachedMusicalGroupOverview(id, overview)
  return { overview, fromCache: false }
}
