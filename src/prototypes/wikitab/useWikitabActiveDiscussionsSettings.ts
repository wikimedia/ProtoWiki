import { onMounted, onUnmounted, ref } from 'vue'

import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'

export function useWikitabActiveDiscussionsSettings() {
  const showNoticeboards = ref(loadWikitabConfig().discussionsShowNoticeboards)
  const showSavedTalk = ref(loadWikitabConfig().discussionsShowSavedTalk)

  function syncFromStorage(): void {
    const config = loadWikitabConfig()
    showNoticeboards.value = config.discussionsShowNoticeboards
    showSavedTalk.value = config.discussionsShowSavedTalk
  }

  function setShowNoticeboards(value: boolean): void {
    showNoticeboards.value = value
    patchWikitabConfig({ discussionsShowNoticeboards: value })
  }

  function setShowSavedTalk(value: boolean): void {
    showSavedTalk.value = value
    patchWikitabConfig({ discussionsShowSavedTalk: value })
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
    showNoticeboards,
    showSavedTalk,
    setShowNoticeboards,
    setShowSavedTalk,
    syncFromStorage,
  }
}
