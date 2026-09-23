import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'

export function useWikitabDismissedActivity() {
  const dismissedRevids = ref<number[]>(loadWikitabConfig().dismissedActivityRevids)

  const dismissedSet = computed(() => new Set(dismissedRevids.value))

  function syncFromStorage(): void {
    dismissedRevids.value = loadWikitabConfig().dismissedActivityRevids
  }

  function isDismissed(revid: number): boolean {
    return dismissedSet.value.has(revid)
  }

  function dismissActivity(revid: number): void {
    if (!Number.isInteger(revid) || revid <= 0 || dismissedSet.value.has(revid)) return

    dismissedRevids.value = [...dismissedRevids.value, revid]
    patchWikitabConfig({ dismissedActivityRevids: dismissedRevids.value })
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

  return { dismissedRevids, dismissedSet, isDismissed, dismissActivity }
}
