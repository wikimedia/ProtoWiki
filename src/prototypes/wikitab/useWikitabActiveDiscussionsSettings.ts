import { onMounted, onUnmounted, ref } from 'vue'

import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { isWikitabFeatureAvailable } from './data/wikitabLanguageSupport'

/** enwiki noticeboards only — off (and its toggle hidden) on other wikis. */
const NOTICEBOARDS_AVAILABLE = isWikitabFeatureAvailable('discussions-noticeboards')

export function useWikitabActiveDiscussionsSettings() {
  const showNoticeboards = ref(
    NOTICEBOARDS_AVAILABLE && loadWikitabConfig().discussionsShowNoticeboards,
  )
  const showSavedTalk = ref(loadWikitabConfig().discussionsShowSavedTalk)

  function syncFromStorage(): void {
    const config = loadWikitabConfig()
    showNoticeboards.value = NOTICEBOARDS_AVAILABLE && config.discussionsShowNoticeboards
    showSavedTalk.value = config.discussionsShowSavedTalk
  }

  function setShowNoticeboards(value: boolean): void {
    if (!NOTICEBOARDS_AVAILABLE) return
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
