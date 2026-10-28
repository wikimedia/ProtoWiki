import { onMounted, onUnmounted, ref } from 'vue'

import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'

export function useWikitabReviewChangesSettings() {
  const showSavedEdits = ref(loadWikitabConfig().reviewChangesShowSavedEdits)
  const showRecentRiskyEdits = ref(loadWikitabConfig().reviewChangesShowRecentRiskyEdits)

  function syncFromStorage(): void {
    const config = loadWikitabConfig()
    showSavedEdits.value = config.reviewChangesShowSavedEdits
    showRecentRiskyEdits.value = config.reviewChangesShowRecentRiskyEdits
  }

  function setShowSavedEdits(value: boolean): void {
    showSavedEdits.value = value
    patchWikitabConfig({ reviewChangesShowSavedEdits: value })
  }

  function setShowRecentRiskyEdits(value: boolean): void {
    showRecentRiskyEdits.value = value
    patchWikitabConfig({ reviewChangesShowRecentRiskyEdits: value })
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

  return {
    showSavedEdits,
    showRecentRiskyEdits,
    setShowSavedEdits,
    setShowRecentRiskyEdits,
    syncFromStorage,
  }
}
