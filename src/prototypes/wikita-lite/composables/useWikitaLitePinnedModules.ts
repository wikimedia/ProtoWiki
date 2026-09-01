import { computed, ref, watch, type ComputedRef } from 'vue'

import { type WikitaLiteModuleId } from '../data/homeModuleIds'
import { type TabPinnedModules, loadPinnedModules, savePinnedModules } from '../data/modulePins'
import { DEFAULT_WIKITA_LITE_VIEW, WIKITA_LITE_VIEWS, type WikitaLiteView } from '../routes'
import { useWikitaLiteView } from './useWikitaLiteView'

const pinnedByTab = ref<TabPinnedModules>(loadPinnedModules())

watch(
  pinnedByTab,
  (value) => {
    savePinnedModules(value)
  },
  { deep: true },
)

export function useWikitaLitePinnedModules() {
  const { activeView, isHome } = useWikitaLiteView()

  function pinView(): WikitaLiteView {
    return isHome.value ? activeView.value : DEFAULT_WIKITA_LITE_VIEW
  }

  function isPinned(moduleId: WikitaLiteModuleId): boolean {
    return pinnedByTab.value[pinView()].includes(moduleId)
  }

  function isPinnedToHome(moduleId: WikitaLiteModuleId): boolean {
    return pinnedByTab.value.edit.includes(moduleId)
  }

  function togglePin(moduleId: WikitaLiteModuleId): void {
    const view = pinView()
    const current = pinnedByTab.value[view]

    if (current.includes(moduleId)) {
      pinnedByTab.value = {
        ...pinnedByTab.value,
        [view]: current.filter((id) => id !== moduleId),
      }
      return
    }

    pinnedByTab.value = {
      ...pinnedByTab.value,
      [view]: [moduleId, ...current],
    }
  }

  function pinnedIdsForView(view: WikitaLiteView): ComputedRef<WikitaLiteModuleId[]> {
    return computed(() => pinnedByTab.value[view])
  }

  function unpinFromAllTabs(moduleId: WikitaLiteModuleId): void {
    const updated: TabPinnedModules = { ...pinnedByTab.value }

    for (const view of WIKITA_LITE_VIEWS) {
      if (updated[view].includes(moduleId)) {
        updated[view] = updated[view].filter((id) => id !== moduleId)
      }
    }

    pinnedByTab.value = updated
  }

  return {
    pinnedByTab,
    isPinned,
    isPinnedToHome,
    togglePin,
    pinnedIdsForView,
    unpinFromAllTabs,
  }
}

/** Module-level singleton so modules share the same reactive pin state. */
let singleton: ReturnType<typeof useWikitaLitePinnedModules> | null = null

export function useWikitaLitePinnedModulesSingleton() {
  if (!singleton) {
    singleton = useWikitaLitePinnedModules()
  }
  return singleton
}
