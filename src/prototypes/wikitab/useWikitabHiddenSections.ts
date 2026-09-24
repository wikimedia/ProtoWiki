import { onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import type { WikitabModuleId } from './sections'

export function useWikitabHiddenSections() {
  const hiddenIds = ref<WikitabModuleId[]>(loadWikitabConfig().hiddenSectionIds)

  function syncFromStorage(): void {
    hiddenIds.value = loadWikitabConfig().hiddenSectionIds
  }

  function isHidden(id: WikitabModuleId): boolean {
    return hiddenIds.value.includes(id)
  }

  function hideSection(id: WikitabModuleId): void {
    if (isHidden(id)) return

    hiddenIds.value = [...hiddenIds.value, id]
    patchWikitabConfig({ hiddenSectionIds: hiddenIds.value })
  }

  function showSection(id: WikitabModuleId): void {
    if (!isHidden(id)) return

    hiddenIds.value = hiddenIds.value.filter((hiddenId) => hiddenId !== id)
    patchWikitabConfig({ hiddenSectionIds: hiddenIds.value })
  }

  function toggleSection(id: WikitabModuleId): void {
    if (isHidden(id)) showSection(id)
    else hideSection(id)
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

  return { hiddenIds, isHidden, hideSection, showSection, toggleSection }
}
