import { computed, type CSSProperties } from 'vue'

import { HOME_FEED_MODULE_IDS, type HomeFeedModuleId } from '../data/homeModuleIds'
import { useWikitaLiteModuleMenuModeSingleton } from './useWikitaLiteModuleMenuMode'
import { useWikitaLitePinnedModulesSingleton } from './useWikitaLitePinnedModules'

export function useWikitaLiteHomeModuleOrder() {
  const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
  const { pinnedIdsForView } = useWikitaLitePinnedModulesSingleton()
  const pinnedModuleIds = pinnedIdsForView('edit')

  const orderByModuleId = computed((): Partial<Record<HomeFeedModuleId, number>> => {
    if (!useModuleMenuMode.value) return {}

    const pinned = pinnedModuleIds.value.filter((id) =>
      (HOME_FEED_MODULE_IDS as readonly string[]).includes(id),
    ) as HomeFeedModuleId[]
    const unpinned = HOME_FEED_MODULE_IDS.filter((id) => !pinned.includes(id))
    const ordered = [...pinned, ...unpinned]

    return Object.fromEntries(ordered.map((id, index) => [id, index])) as Partial<
      Record<HomeFeedModuleId, number>
    >
  })

  function homeModuleOrderStyle(moduleId: HomeFeedModuleId): CSSProperties {
    const order = orderByModuleId.value[moduleId]
    if (order === undefined) return {}
    return { order }
  }

  return {
    homeModuleOrderStyle,
  }
}
