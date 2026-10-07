import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import { articleTitleKey } from './data/wikitabHtml'
import type { WikitabCardData } from './sections'

function cardArticleTitleKey(card: WikitabCardData): string | null {
  const title = card.linkTitle ?? card.title
  if (!title?.trim()) return null
  return articleTitleKey(title)
}

interface FilteredItemsCacheEntry {
  epoch: number
  items: WikitabCardData[]
}

const filteredItemsCache = new WeakMap<WikitabCardData[], FilteredItemsCacheEntry>()
let filterCacheEpoch = 0

function invalidateFilterCache(): void {
  filterCacheEpoch++
}

export function useWikitabHiddenArticles() {
  const hiddenKeys = ref<string[]>(loadWikitabConfig().hiddenArticleTitleKeys)

  const hiddenSet = computed(() => new Set(hiddenKeys.value))

  function syncFromStorage(): void {
    hiddenKeys.value = loadWikitabConfig().hiddenArticleTitleKeys
    invalidateFilterCache()
  }

  function hideArticle(title: string): void {
    const key = articleTitleKey(title)
    if (!key || hiddenSet.value.has(key)) return

    hiddenKeys.value = [...hiddenKeys.value, key]
    patchWikitabConfig({ hiddenArticleTitleKeys: hiddenKeys.value })
    invalidateFilterCache()
  }

  function filterCards(items: WikitabCardData[]): WikitabCardData[] {
    if (!hiddenKeys.value.length) return items

    const cached = filteredItemsCache.get(items)
    if (cached && cached.epoch === filterCacheEpoch) return cached.items

    const filtered = items.filter((card) => {
      const key = cardArticleTitleKey(card)
      return !key || !hiddenSet.value.has(key)
    })
    filteredItemsCache.set(items, { epoch: filterCacheEpoch, items: filtered })
    return filtered
  }

  function filterActivityItems(items: WikitabSearchActivityItem[]): WikitabSearchActivityItem[] {
    if (!hiddenKeys.value.length) return items

    return items.filter((item) => {
      const key = articleTitleKey(item.title)
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

  return { hideArticle, filterCards, filterActivityItems }
}
