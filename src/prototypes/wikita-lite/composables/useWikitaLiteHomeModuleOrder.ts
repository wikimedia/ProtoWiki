import { computed, type CSSProperties } from 'vue'

import { HOME_EDIT_MODULE_IDS, type HomeEditModuleId } from '../data/homeModuleIds'
import { useWikitaLiteModuleMenuModeSingleton } from './useWikitaLiteModuleMenuMode'
import { useWikitaLitePinnedModulesSingleton } from './useWikitaLitePinnedModules'

export function useWikitaLiteHomeModuleOrder() {
  const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
  const { pinnedIdsForView } = useWikitaLitePinnedModulesSingleton()
  const pinnedModuleIds = pinnedIdsForView('edit')

  const orderByModuleId = computed((): Partial<Record<HomeEditModuleId, number>> => {
    if (!useModuleMenuMode.value) return {}

    const pinned = pinnedModuleIds.value.filter((id) =>
      (HOME_EDIT_MODULE_IDS as readonly string[]).includes(id),
    )
    const unpinned = HOME_EDIT_MODULE_IDS.filter((id) => !pinned.includes(id))
    const ordered = [...pinned, ...unpinned]

    return Object.fromEntries(ordered.map((id, index) => [id, index])) as Partial<
      Record<HomeEditModuleId, number>
    >
  })

  function homeModuleOrderStyle(moduleId: HomeEditModuleId): CSSProperties {
    const order = orderByModuleId.value[moduleId]
    if (order === undefined) return {}
    return { order }
  }

  return {
    homeModuleOrderStyle,
  }
}
