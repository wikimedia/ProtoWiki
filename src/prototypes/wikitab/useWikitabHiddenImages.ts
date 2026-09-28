import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'

export function useWikitabHiddenImages() {
  const hiddenPageIds = ref<number[]>(loadWikitabConfig().hiddenCommonsImagePageIds)

  const hiddenSet = computed(() => new Set(hiddenPageIds.value))

  function syncFromStorage(): void {
    hiddenPageIds.value = loadWikitabConfig().hiddenCommonsImagePageIds
  }

  function isHidden(pageid: number): boolean {
    return hiddenSet.value.has(pageid)
  }

  function hideImage(pageid: number): void {
    if (!Number.isInteger(pageid) || pageid <= 0 || hiddenSet.value.has(pageid)) return

    hiddenPageIds.value = [...hiddenPageIds.value, pageid]
    patchWikitabConfig({ hiddenCommonsImagePageIds: hiddenPageIds.value })
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

  return { hiddenPageIds, hiddenSet, isHidden, hideImage }
}
