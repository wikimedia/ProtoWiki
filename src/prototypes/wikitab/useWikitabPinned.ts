import { onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { WIKITAB_SAVED_MODULE_ID, type WikitabModuleId, type WikitabSectionId } from './sections'
import type { WikitabSectionState } from './useWikitabFeed'

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
      pinnedIds.value = [id, ...pinnedIds.value.filter((pinnedId) => pinnedId !== id)]
    }

    patchWikitabConfig({ pinnedSectionIds: pinnedIds.value })
  }

  function orderSections(sections: WikitabSectionState[]): WikitabSectionState[] {
    const pinnedSet = new Set<WikitabModuleId>(pinnedIds.value)
    const pinned = pinnedIds.value
      .filter((id): id is WikitabSectionId => id !== WIKITAB_SAVED_MODULE_ID)
      .map((id) => sections.find((section) => section.spec.id === id))
      .filter((section): section is WikitabSectionState => section !== undefined)
    const unpinned = sections.filter((section) => !pinnedSet.has(section.spec.id))

    return [...pinned, ...unpinned]
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
