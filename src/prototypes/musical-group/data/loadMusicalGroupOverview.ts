import { formatCommonsPhotosLabel, getCommonsCategoryCount } from './commonsImages'
import type { CommonsCategoryCount } from './commonsImages'
import { fetchMusicalGroupOverview } from './fetchMusicalGroupOverview'
import {
  getCachedMusicalGroup,
  setCachedMusicalGroupOverview,
} from './musicalGroupCache'
import type { MusicalGroupData, MusicalGroupOverviewData } from './types'

export interface LoadMusicalGroupOverviewOptions {
  signal?: AbortSignal
  onPartial?: (overview: MusicalGroupOverviewData) => void
}

export interface LoadMusicalGroupOverviewResult {
  overview: MusicalGroupOverviewData
  fromCache: boolean
}

async function resolveCommonsCategoryCount(
  data: MusicalGroupData,
  signal?: AbortSignal,
): Promise<CommonsCategoryCount | undefined> {
  const category = data.commonsCategory?.trim()
  if (!category) return undefined
  return getCommonsCategoryCount(category, signal)
}

function buildImagesOverview(
  data: MusicalGroupData,
  info?: CommonsCategoryCount,
): MusicalGroupOverviewData['images'] | undefined {
  // Overview Images card is for Wikidata entities with a Commons category (P373),
  // not enwiki-only articles where label fallback would invent a category name.
  if (!data.commonsCategory?.trim() || !info) return undefined
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
  options: LoadMusicalGroupOverviewOptions = {},
): Promise<LoadMusicalGroupOverviewResult> {
  const cached = getCachedMusicalGroup(id)
  if (cached?.overview && isCachedOverviewUsable(cached.overview)) {
    return { overview: cached.overview, fromCache: true }
  }

  const { signal, onPartial } = options

  const categoryPromise = resolveCommonsCategoryCount(data, signal).catch(() => undefined)

  const overview = await fetchMusicalGroupOverview(data, {
    signal,
    onPartial,
  })

  const categoryInfo = await categoryPromise
  overview.images = buildImagesOverview(data, categoryInfo)
  if (overview.images) {
    onPartial?.(overview)
  }

  setCachedMusicalGroupOverview(id, overview)
  return { overview, fromCache: false }
}
