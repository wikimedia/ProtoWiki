import { computed, type CSSProperties } from 'vue'

import {
  EXPLORE_READ_MODULE_IDS,
  type ExploreReadModuleId,
} from '../data/homeModuleIds'
import { useWikitaLiteModuleMenuModeSingleton } from './useWikitaLiteModuleMenuMode'
import { useWikitaLitePinnedModulesSingleton } from './useWikitaLitePinnedModules'

export function useWikitaLiteExploreModuleOrder() {
  const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
  const { pinnedIdsForView } = useWikitaLitePinnedModulesSingleton()
  const pinnedModuleIds = pinnedIdsForView('read')

  const orderByModuleId = computed((): Partial<Record<ExploreReadModuleId, number>> => {
    if (!useModuleMenuMode.value) return {}

    const pinned = pinnedModuleIds.value.filter((id) =>
      (EXPLORE_READ_MODULE_IDS as readonly string[]).includes(id),
    ) as ExploreReadModuleId[]
    const unpinned = EXPLORE_READ_MODULE_IDS.filter((id) => !pinned.includes(id))
    const ordered = [...pinned, ...unpinned]

    return Object.fromEntries(ordered.map((id, index) => [id, index])) as Partial<
      Record<ExploreReadModuleId, number>
    >
  })

  function exploreModuleOrderStyle(moduleId: ExploreReadModuleId): CSSProperties {
    const order = orderByModuleId.value[moduleId]
    if (order === undefined) return {}
    return { order }
  }

  return {
    exploreModuleOrderStyle,
  }
}
