import { onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { type WikitabModuleId, type WikitabSectionId } from './sections'
import type { WikitabSectionState } from './useWikitabFeed'
import { buildEffectiveHomeOrder } from './useWikitabModuleOrder'

export function useWikitabPinned() {
  const pinnedIds = ref<WikitabModuleId[]>(loadWikitabConfig().pinnedSectionIds)

  function syncFromStorage(): void {
    pinnedIds.value = loadWikitabConfig().pinnedSectionIds
  }

  function isPinned(id: WikitabModuleId): boolean {
    return pinnedIds.value.includes(id)
  }

  function togglePin(id: WikitabModuleId): void {
    if (isPinned(id)) {
      pinnedIds.value = pinnedIds.value.filter((pinnedId) => pinnedId !== id)
    } else {
      pinnedIds.value = [...pinnedIds.value.filter((pinnedId) => pinnedId !== id), id]
    }

    patchWikitabConfig({ pinnedSectionIds: pinnedIds.value })
  }

  function orderSections(
    sections: WikitabSectionState[],
    baseOrder: readonly WikitabModuleId[],
  ): WikitabSectionState[] {
    const sectionById = new Map(sections.map((section) => [section.spec.id, section]))
    const ordered: WikitabSectionState[] = []

    for (const id of buildEffectiveHomeOrder(pinnedIds.value, baseOrder)) {
      const section = sectionById.get(id as WikitabSectionId)
      if (section) ordered.push(section)
    }

    return ordered
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY) return
    syncFromStorage()
  }

  onMounted(() => {
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage)
  })

  return { pinnedIds, isPinned, togglePin, orderSections }
}
