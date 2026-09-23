import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import { articleTitleKey } from './data/wikitabHtml'
import type { WikitabCardData } from './sections'

function cardArticleTitleKey(card: WikitabCardData): string | null {
  const title = card.linkTitle ?? card.title
  if (!title?.trim()) return null
  return articleTitleKey(title)
}

export function useWikitabHiddenArticles() {
  const hiddenKeys = ref<string[]>(loadWikitabConfig().hiddenArticleTitleKeys)

  const hiddenSet = computed(() => new Set(hiddenKeys.value))

  function syncFromStorage(): void {
    hiddenKeys.value = loadWikitabConfig().hiddenArticleTitleKeys
  }

  function hideArticle(title: string): void {
    const key = articleTitleKey(title)
    if (!key || hiddenSet.value.has(key)) return

    hiddenKeys.value = [...hiddenKeys.value, key]
    patchWikitabConfig({ hiddenArticleTitleKeys: hiddenKeys.value })
  }

  function filterCards(items: WikitabCardData[]): WikitabCardData[] {
    if (!hiddenKeys.value.length) return items

    return items.filter((card) => {
      const key = cardArticleTitleKey(card)
      return !key || !hiddenSet.value.has(key)
    })
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

  return { hideArticle, filterCards }
}
