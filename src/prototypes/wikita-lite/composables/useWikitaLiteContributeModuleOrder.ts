import { computed, type CSSProperties } from 'vue'

import {
  CONTRIBUTE_MODULE_IDS,
  type ContributeModuleId,
} from '../data/homeModuleIds'
import { useWikitaLiteModuleMenuModeSingleton } from './useWikitaLiteModuleMenuMode'
import { useWikitaLitePinnedModulesSingleton } from './useWikitaLitePinnedModules'

export function useWikitaLiteContributeModuleOrder() {
  const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
  const { pinnedIdsForView } = useWikitaLitePinnedModulesSingleton()
  const pinnedModuleIds = pinnedIdsForView('contribute')

  const orderByModuleId = computed((): Partial<Record<ContributeModuleId, number>> => {
    if (!useModuleMenuMode.value) return {}

    const pinned = pinnedModuleIds.value.filter((id) =>
      (CONTRIBUTE_MODULE_IDS as readonly string[]).includes(id),
    ) as ContributeModuleId[]
    const unpinned = CONTRIBUTE_MODULE_IDS.filter((id) => !pinned.includes(id))
    const ordered = [...pinned, ...unpinned]

    return Object.fromEntries(ordered.map((id, index) => [id, index])) as Partial<
      Record<ContributeModuleId, number>
    >
  })

  function contributeModuleOrderStyle(moduleId: ContributeModuleId): CSSProperties {
    const order = orderByModuleId.value[moduleId]
    if (order === undefined) return {}
    return { order }
  }

  return {
    contributeModuleOrderStyle,
  }
}
