import { useConfig } from '@/composables/useConfig'

import {
  clearTranslationSuggestionsSessionCache,
  createTranslationSuggestionsFeed,
  loadNextTranslationSuggestion,
  resolveTranslationSeedTitles,
  translationSuggestionsCacheKey,
  type TranslationSuggestionsFeed,
} from '../../musical-group/data/fetchTranslationSuggestions'
import { clearCachedTranslationSuggestions, getCachedTranslationSuggestions } from '../../musical-group/data/homeTabCache'
import type { HomeTranslationSuggestion } from '../../musical-group/data/types'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

import { isSentinelNearViewport, useViewportInfiniteScroll } from './useViewportInfiniteScroll'

export function useWikitaLiteTranslationPage() {
  const { knownLanguages } = useConfig()

  const targetLangs = computed(() =>
    knownLanguages.value.map((lang) => lang.trim().toLowerCase()).filter(Boolean),
  )

  const items = ref<HomeTranslationSuggestion[]>([])
  const loading = ref(true)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const pageActive = ref(true)
  const loadSentinel = ref<HTMLElement | null>(null)

  let feed: TranslationSuggestionsFeed | null = null
  let abort: AbortController | null = null

  function syncFromFeed(): void {
    if (!feed) {
      items.value = []
      hasMore.value = false
      return
    }
    items.value = [...feed.items]
    hasMore.value = !feed.exhausted
  }

  function resetFeed(): void {
    abort?.abort()
    abort = new AbortController()

    const langs = targetLangs.value
    if (!langs.length) {
      feed = null
      items.value = []
      loading.value = false
      loadingMore.value = false
      hasMore.value = false
      error.value = null
      return
    }

    error.value = null
  }

  async function initializeFeed(): Promise<void> {
    resetFeed()

    const langs = targetLangs.value
    if (!langs.length) return

    try {
      const seedTitles = await resolveTranslationSeedTitles(abort?.signal)
      const cacheKey = translationSuggestionsCacheKey(langs)
      const cached = getCachedTranslationSuggestions(cacheKey) ?? []
      feed = createTranslationSuggestionsFeed(langs, cached, seedTitles)
      syncFromFeed()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      feed = null
      items.value = []
      hasMore.value = false
      error.value =
        err instanceof Error ? err.message : 'Could not load translation suggestions.'
    }
  }

  async function loadNext(): Promise<boolean> {
    if (!feed || !hasMore.value || loadingMore.value) return false

    const isInitial = items.value.length === 0
    if (isInitial) {
      loading.value = true
    } else {
      loadingMore.value = true
    }

    try {
      const suggestion = await loadNextTranslationSuggestion(feed, abort?.signal)
      syncFromFeed()
      if (!suggestion) return false
      return true
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false
      if (!items.value.length) {
        error.value =
          err instanceof Error ? err.message : 'Could not load translation suggestions.'
      }
      hasMore.value = false
      return false
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  async function fillViewport(): Promise<void> {
    while (pageActive.value && hasMore.value && !loadingMore.value) {
      const added = await loadNext()
      if (!added) break
      await nextTick()
      if (!isSentinelNearViewport(loadSentinel.value)) break
    }
  }

  async function retryTranslationFeed(): Promise<void> {
    const cacheKey = translationSuggestionsCacheKey(targetLangs.value)
    clearTranslationSuggestionsSessionCache()
    clearCachedTranslationSuggestions(cacheKey)
    await initializeFeed()
    await fillViewport()
  }

  watch(
    targetLangs,
    () => {
      if (!targetLangs.value.length) {
        resetFeed()
        loading.value = false
        return
      }
      void (async () => {
        await initializeFeed()
        await fillViewport()
      })()
    },
    { immediate: true },
  )

  const feedLoading = computed(() => loading.value || loadingMore.value)

  useViewportInfiniteScroll({
    sentinel: loadSentinel,
    active: pageActive,
    hasMore,
    loading: feedLoading,
    loadMore: loadNext,
  })

  onUnmounted(() => {
    abort?.abort()
  })

  return {
    translationSuggestions: items,
    translationLoading: loading,
    translationLoadingMore: loadingMore,
    translationError: error,
    retryTranslationFeed,
    loadSentinel,
  }
}
