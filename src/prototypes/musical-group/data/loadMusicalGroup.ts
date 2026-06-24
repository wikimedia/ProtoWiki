import { fetchMusicalGroup } from './fetchMusicalGroup'
import { getCachedMusicalGroup, setCachedMusicalGroup } from './musicalGroupCache'
import type { FetchMusicalGroupOptions, MusicalGroupData } from './types'

export interface LoadMusicalGroupResult {
  data: MusicalGroupData
  fromCache: boolean
}

export async function loadMusicalGroup(
  id: string,
  options: FetchMusicalGroupOptions = {},
): Promise<LoadMusicalGroupResult> {
  const cached = getCachedMusicalGroup(id)
  if (cached) {
    return { data: cached.data, fromCache: true }
  }

  const { data, commonsImageCount, commonsImageCountCapped } = await fetchMusicalGroup(id, options)
  setCachedMusicalGroup(id, data, { commonsImageCount, commonsImageCountCapped })
  return { data, fromCache: false }
}
