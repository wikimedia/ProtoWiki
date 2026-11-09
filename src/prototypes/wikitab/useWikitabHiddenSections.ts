import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { isWikitabModuleAvailable } from './data/wikitabLanguageSupport'
import { WIKITAB_HOME_MODULE_ORDER, type WikitabModuleId } from './sections'

/** Modules the current wiki has no data for — always hidden, never persisted. */
const UNAVAILABLE_MODULE_IDS = WIKITAB_HOME_MODULE_ORDER.filter(
  (id) => !isWikitabModuleAvailable(id),
)

export function useWikitabHiddenSections() {
  /** What the reader chose in Modules — kept intact across language switches. */
  const storedHiddenIds = ref<WikitabModuleId[]>(loadWikitabConfig().hiddenSectionIds)

  /** Stored choice plus modules the current language can't show. */
  const hiddenIds = computed<WikitabModuleId[]>(() => [
    ...storedHiddenIds.value,
    ...UNAVAILABLE_MODULE_IDS.filter((id) => !storedHiddenIds.value.includes(id)),
  ])

  function syncFromStorage(): void {
    storedHiddenIds.value = loadWikitabConfig().hiddenSectionIds
  }

  function isHidden(id: WikitabModuleId): boolean {
    return hiddenIds.value.includes(id)
  }

  function hideSection(id: WikitabModuleId): void {
    if (storedHiddenIds.value.includes(id)) return

    storedHiddenIds.value = [...storedHiddenIds.value, id]
    patchWikitabConfig({ hiddenSectionIds: storedHiddenIds.value })
  }

  function showSection(id: WikitabModuleId): void {
    if (!storedHiddenIds.value.includes(id)) return

    storedHiddenIds.value = storedHiddenIds.value.filter((hiddenId) => hiddenId !== id)
    patchWikitabConfig({ hiddenSectionIds: storedHiddenIds.value })
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

  function reloadFromStorage(): void {
    syncFromStorage()
  }

  return { hiddenIds, isHidden, hideSection, showSection, toggleSection, reloadFromStorage }
}
