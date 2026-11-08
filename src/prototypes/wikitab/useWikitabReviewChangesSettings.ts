import { onMounted, onUnmounted, ref } from 'vue'

import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { isWikitabFeatureAvailable } from './data/wikitabLanguageSupport'

/** Needs ORES `rcshow=oresreview` — off (and its toggle hidden) where it isn't deployed. */
const RISKY_EDITS_AVAILABLE = isWikitabFeatureAvailable('review-changes-risky')

export function useWikitabReviewChangesSettings() {
  const showSavedEdits = ref(loadWikitabConfig().reviewChangesShowSavedEdits)
  const showRecentRiskyEdits = ref(
    RISKY_EDITS_AVAILABLE && loadWikitabConfig().reviewChangesShowRecentRiskyEdits,
  )

  function syncFromStorage(): void {
    const config = loadWikitabConfig()
    showSavedEdits.value = config.reviewChangesShowSavedEdits
    showRecentRiskyEdits.value =
      RISKY_EDITS_AVAILABLE && config.reviewChangesShowRecentRiskyEdits
  }

  function setShowSavedEdits(value: boolean): void {
    showSavedEdits.value = value
    patchWikitabConfig({ reviewChangesShowSavedEdits: value })
  }

  function setShowRecentRiskyEdits(value: boolean): void {
    if (!RISKY_EDITS_AVAILABLE) return
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
