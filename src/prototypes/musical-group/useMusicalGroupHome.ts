import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { listBookmarks } from './data/bookmarks'
import { fetchFeaturedTabContent } from './data/fetchFeaturedFeed'
import { fetchHelpWanted } from './data/fetchHelpWanted'
import { fetchRecentChanges } from './data/fetchRecentChanges'
import { fetchRelatedReading } from './data/fetchRelatedReading'
import { fetchSavedItemSummaries } from './data/fetchSavedItemSummaries'
import type {
  HomeFeaturedTab,
  HomeHelpWanted,
  HomeRecentChange,
  HomeRelated,
  HomeSavedItem,
} from './data/types'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_RECENTLY_SAVED = 2
const MAX_RECENTLY_SAVED = 5

const EMPTY_FEATURED_TAB: HomeFeaturedTab = {
  didYouKnow: [],
  bornOnThisDay: [],
}

function isAbort(err: unknown): boolean {
  return (err as Error)?.name === 'AbortError'
}

export function useMusicalGroupHome() {
  const featuredTab = ref<HomeFeaturedTab>(EMPTY_FEATURED_TAB)
  const featuredTabLoading = ref(true)
  const savedItems = ref<HomeSavedItem[]>([])
  const helpWanted = ref<HomeHelpWanted[]>([])
  const related = ref<HomeRelated[]>([])
  const recentChanges = ref<HomeRecentChange[]>([])

  const featuredArticle = computed(() => featuredTab.value.article)
  const didYouKnow = computed(() => featuredTab.value.didYouKnow)
  const bornOnThisDay = computed(() => featuredTab.value.bornOnThisDay)

  /**
   * The newest two saved items always; plus any saved within the past day,
   * capped at five.
   */
  const recentlySaved = computed<HomeSavedItem[]>(() => {
    const sorted = [...savedItems.value].sort((a, b) => b.savedAt - a.savedAt)
    if (!sorted.length) return []
    const now = Date.now()
    const withinDay = sorted.filter((item) => now - item.savedAt <= DAY_MS).length
    const count = Math.min(MAX_RECENTLY_SAVED, Math.max(MIN_RECENTLY_SAVED, withinDay))
    return sorted.slice(0, count)
  })

  let abort: AbortController | null = null

  function load(): void {
    abort?.abort()
    abort = new AbortController()
    const { signal } = abort

    featuredTab.value = EMPTY_FEATURED_TAB
    featuredTabLoading.value = true
    fetchFeaturedTabContent(signal)
      .then((value) => {
        featuredTab.value = value
      })
      .catch(() => {})
      .finally(() => {
        featuredTabLoading.value = false
      })

    const entries = listBookmarks()
    if (!entries.length) {
      savedItems.value = []
      helpWanted.value = []
      related.value = []
      recentChanges.value = []
      return
    }

    fetchSavedItemSummaries(entries, signal)
      .then((items) => {
        savedItems.value = items
        if (!items.length) return

        fetchHelpWanted(items, signal)
          .then((value) => {
            helpWanted.value = value
          })
          .catch(() => {})

        fetchRelatedReading(items, signal)
          .then((value) => {
            related.value = value
          })
          .catch(() => {})

        fetchRecentChanges(items, signal)
          .then((value) => {
            recentChanges.value = value
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (isAbort(err)) return
        savedItems.value = []
      })
  }

  onMounted(load)
  onBeforeUnmount(() => abort?.abort())

  return {
    featuredArticle,
    didYouKnow,
    bornOnThisDay,
    featuredTabLoading,
    recentlySaved,
    helpWanted,
    related,
    recentChanges,
  }
}
