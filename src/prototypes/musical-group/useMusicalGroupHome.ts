import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useConfig } from '@/composables/useConfig'

import { WIKITA_SAVE_FEEDBACK_KEY } from './composables/useWikitaSaveFeedback'
import { listBookmarks } from './data/bookmarks'
import { bookmarksKey, utcDayKey } from './data/cacheKeys'
import { fetchActiveDiscussions, clearActiveDiscussionsSessionCache } from './data/fetchActiveDiscussions'
import { fetchFeaturedTabContent, isUsableFeaturedTab } from './data/fetchFeaturedFeed'
import { fetchHelpWanted } from './data/fetchHelpWanted'
import { fetchHomeMentions, filterMentionsExcludingRelated } from './data/fetchHomeMentions'
import { fetchRecentChanges } from './data/fetchRecentChanges'
import { fetchSavedItemSummaries } from './data/fetchSavedItemSummaries'
import { fetchTrendingFeed, isTrendingSummaryIncomplete } from './data/fetchTrending'
import { clearFeaturedFeedSessionCache } from './data/fetchEnwikiFeaturedFeedDay'
import { clearFeaturedTabSessionCache } from './data/fetchFeaturedFeed'
import { clearTrendingSessionCache } from './data/fetchTrending'
import {
  clearTranslationSuggestionsSessionCache,
  fetchTranslationSuggestions,
  translationSuggestionsCacheKey,
} from './data/fetchTranslationSuggestions'
import {
  clearCachedActiveDiscussions,
  clearCachedFeaturedTab,
  clearCachedTranslationSuggestions,
  clearCachedTrendingFeed,
  getCachedActiveDiscussions,
  getCachedFeaturedTab,
  getCachedHelpWanted,
  getCachedHomeMentions,
  getCachedRecentChangesPreview,
  getCachedRelatedFeed,
  getCachedSavedSummaries,
  getCachedTranslationSuggestions,
  getCachedTrendingFeed,
} from './data/homeTabCache'
import { loadRelatedFeedInitialBatch } from './loadRelatedFeedInitialBatch'
import type {
  HomeActiveDiscussion,
  HomeFeaturedTab,
  HomeHelpWanted,
  HomeMention,
  HomeRecentChange,
  HomeRelated,
  HomeSavedItem,
  HomeTranslationSuggestion,
  HomeTrending,
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

export type PersonalizedFeedId = 'related' | 'mentions' | 'helpWanted' | 'recentChanges'

export interface ReloadBookmarksOptions {
  /** Personalized feeds to leave as-is (saved summaries still refresh). */
  skipFeeds?: PersonalizedFeedId[]
}

export function useMusicalGroupHome(options: {
  helpWantedLimit?: number
  translationCountPerLanguage?: number
  translationLanguages?: () => string[]
  getBookmarkChangeSkipFeeds?: () => PersonalizedFeedId[]
} = {}) {
  const helpWantedLimit = options.helpWantedLimit ?? 2
  const translationCountPerLanguage = options.translationCountPerLanguage ?? 2
  const route = useRoute()
  const { knownLanguages } = useConfig()
  const saveFeedback = inject(WIKITA_SAVE_FEEDBACK_KEY, null)
  const featuredTab = ref<HomeFeaturedTab>(EMPTY_FEATURED_TAB)
  const featuredTabLoading = ref(true)
  const featuredTabError = ref<string | null>(null)
  const trendingItems = ref<HomeTrending[]>([])
  const trendingLoading = ref(true)
  const trendingTabError = ref<string | null>(null)
  const activeDiscussions = ref<HomeActiveDiscussion[]>([])
  const activeDiscussionsLoading = ref(true)
  const activeDiscussionsError = ref<string | null>(null)
  const translationSuggestions = ref<HomeTranslationSuggestion[]>([])
  const translationLoading = ref(true)
  const translationError = ref<string | null>(null)
  const hasSavedPages = ref(listBookmarks().length > 0)
  const savedItems = ref<HomeSavedItem[]>([])
  const savedItemsLoading = ref(false)
  const homeRelatedItems = ref<HomeRelated[]>([])
  const homeRelatedLoading = ref(false)
  const homeMentionsRaw = ref<HomeMention[]>([])
  const homeMentionsLoading = ref(false)
  const helpWanted = ref<HomeHelpWanted[]>([])
  const recentChanges = ref<HomeRecentChange[]>([])
  const helpWantedLoading = ref(false)
  const recentChangesLoading = ref(false)

  const featuredArticle = computed(() => featuredTab.value.article)
  const didYouKnow = computed(() => featuredTab.value.didYouKnow)
  const bornOnThisDay = computed(() => featuredTab.value.bornOnThisDay)

  const savedSorted = computed<HomeSavedItem[]>(() =>
    [...savedItems.value].sort((a, b) => b.savedAt - a.savedAt),
  )

  const recentlySaved = computed<HomeSavedItem[]>(() => {
    if (!savedSorted.value.length) return []
    const now = Date.now()
    const withinDay = savedSorted.value.filter((item) => now - item.savedAt <= DAY_MS).length
    const count = Math.min(MAX_RECENTLY_SAVED, Math.max(MIN_RECENTLY_SAVED, withinDay))
    return savedSorted.value.slice(0, count)
  })

  const homeMentions = computed(() =>
    filterMentionsExcludingRelated(homeMentionsRaw.value, homeRelatedItems.value),
  )

  const translationTargetLangs = computed(() => {
    const override = options.translationLanguages?.()
    if (override?.length) return override
    return knownLanguages.value
  })

  let abort: AbortController | null = null
  let bookmarkAbort: AbortController | null = null

  function hydrateBookmarksFromCache(): void {
    const dependencyKey = bookmarksKey()
    const cachedSummaries = getCachedSavedSummaries(dependencyKey)
    if (cachedSummaries) {
      savedItems.value = cachedSummaries
    }

    const cachedRelated = getCachedRelatedFeed('home', dependencyKey)
    if (cachedRelated) {
      homeRelatedItems.value = cachedRelated.items
    }

    const cachedMentions = getCachedHomeMentions(dependencyKey)
    if (cachedMentions) {
      homeMentionsRaw.value = cachedMentions
    }

    const cachedHelp = getCachedHelpWanted(dependencyKey)
    if (cachedHelp) helpWanted.value = cachedHelp

    const cachedRecent = getCachedRecentChangesPreview(dependencyKey)
    if (cachedRecent) recentChanges.value = cachedRecent
  }

  function clearPersonalizedFeeds(): void {
    savedItems.value = []
    homeRelatedItems.value = []
    homeMentionsRaw.value = []
    helpWanted.value = []
    recentChanges.value = []
    savedItemsLoading.value = false
    homeRelatedLoading.value = false
    homeMentionsLoading.value = false
    helpWantedLoading.value = false
    recentChangesLoading.value = false
  }

  async function reloadBookmarks(reloadOptions: ReloadBookmarksOptions = {}): Promise<void> {
    bookmarkAbort?.abort()
    bookmarkAbort = new AbortController()
    const { signal } = bookmarkAbort
    const skipFeeds = new Set(reloadOptions.skipFeeds ?? [])

    const entries = listBookmarks()
    hasSavedPages.value = entries.length > 0
    if (!entries.length) {
      clearPersonalizedFeeds()
      return
    }

    hydrateBookmarksFromCache()
    const dependencyKey = bookmarksKey()

    if (!getCachedSavedSummaries(dependencyKey)) {
      savedItemsLoading.value = true
    }

    let items: HomeSavedItem[]
    try {
      items = await fetchSavedItemSummaries(entries, signal)
      if (signal.aborted) return
      savedItems.value = items
    } catch (err) {
      if (isAbort(err)) return
      clearPersonalizedFeeds()
      return
    } finally {
      savedItemsLoading.value = false
    }

    if (!items.length) {
      homeRelatedItems.value = []
      homeMentionsRaw.value = []
      helpWanted.value = []
      recentChanges.value = []
      return
    }

    const cachedHelp = getCachedHelpWanted(dependencyKey)
    const needsRelatedFetch =
      !skipFeeds.has('related') && !getCachedRelatedFeed('home', dependencyKey)
    const needsMentionsFetch =
      !skipFeeds.has('mentions') && !getCachedHomeMentions(dependencyKey)
    const needsHelpFetch =
      !skipFeeds.has('helpWanted') &&
      (!cachedHelp || cachedHelp.length < helpWantedLimit)
    const needsRecentFetch =
      !skipFeeds.has('recentChanges') && !getCachedRecentChangesPreview(dependencyKey)

    if (needsRelatedFetch) homeRelatedLoading.value = true
    if (needsMentionsFetch) homeMentionsLoading.value = true
    if (needsHelpFetch) {
      helpWantedLoading.value = true
      if (!cachedHelp?.length) helpWanted.value = []
    }
    if (needsRecentFetch) recentChangesLoading.value = true

    const appendHelpWanted = (suggestion: HomeHelpWanted): void => {
      if (helpWanted.value.some((entry) => entry.itemId === suggestion.itemId)) return
      helpWanted.value = [...helpWanted.value, suggestion]
    }

    await Promise.all([
      (async () => {
        if (!needsRelatedFetch) return
        try {
          homeRelatedItems.value = await loadRelatedFeedInitialBatch(
            'home',
            items,
            dependencyKey,
            signal,
          )
        } catch (err) {
          if (isAbort(err)) return
          homeRelatedItems.value = []
        } finally {
          homeRelatedLoading.value = false
        }
      })(),
      (async () => {
        if (!needsMentionsFetch) return
        try {
          const excludeRelated = getCachedRelatedFeed('home', dependencyKey)?.items ?? []
          homeMentionsRaw.value = await fetchHomeMentions(items, signal, undefined, excludeRelated)
        } catch (err) {
          if (isAbort(err)) return
          homeMentionsRaw.value = []
        } finally {
          homeMentionsLoading.value = false
        }
      })(),
      (async () => {
        if (!needsHelpFetch) return
        try {
          helpWanted.value = await fetchHelpWanted(items, signal, helpWantedLimit, {
            onEach: appendHelpWanted,
          })
        } catch (err) {
          if (isAbort(err)) return
        } finally {
          helpWantedLoading.value = false
        }
      })(),
      (async () => {
        if (!needsRecentFetch) return
        try {
          recentChanges.value = await fetchRecentChanges(items, signal)
        } catch (err) {
          if (isAbort(err)) return
        } finally {
          recentChangesLoading.value = false
        }
      })(),
    ])

    if (signal.aborted) return
  }

  async function loadFeatured(signal: AbortSignal): Promise<void> {
    const dayKey = utcDayKey()
    featuredTabError.value = null

    const cached = getCachedFeaturedTab(dayKey)
    if (cached && isUsableFeaturedTab(cached)) {
      featuredTab.value = cached
      featuredTabLoading.value = false
      return
    }

    featuredTab.value = EMPTY_FEATURED_TAB
    featuredTabLoading.value = true
    try {
      featuredTab.value = await fetchFeaturedTabContent(signal)
      if (!isUsableFeaturedTab(featuredTab.value)) {
        featuredTabError.value = 'No featured content is available right now.'
      }
    } catch (err) {
      if (isAbort(err)) return
      featuredTab.value = EMPTY_FEATURED_TAB
      featuredTabError.value =
        err instanceof Error ? err.message : 'Could not load featured content.'
    } finally {
      featuredTabLoading.value = false
    }
  }

  async function loadTrending(signal: AbortSignal, options?: { background?: boolean }): Promise<void> {
    trendingTabError.value = null

    if (!options?.background && !trendingItems.value.length) {
      trendingLoading.value = true
    }

    try {
      trendingItems.value = await fetchTrendingFeed(signal)
    } catch (err) {
      if (isAbort(err)) return
      if (!trendingItems.value.length) {
        trendingItems.value = []
      }
      trendingTabError.value =
        err instanceof Error ? err.message : 'Could not load trending articles.'
    } finally {
      trendingLoading.value = false
    }
  }

  async function loadActiveDiscussions(
    signal: AbortSignal,
    options?: { background?: boolean },
  ): Promise<void> {
    activeDiscussionsError.value = null

    if (!options?.background && !activeDiscussions.value.length) {
      activeDiscussionsLoading.value = true
    }

    try {
      activeDiscussions.value = await fetchActiveDiscussions(signal)
    } catch (err) {
      if (isAbort(err)) return
      if (!activeDiscussions.value.length) {
        activeDiscussions.value = []
      }
      activeDiscussionsError.value =
        err instanceof Error ? err.message : 'Could not load active discussions.'
    } finally {
      activeDiscussionsLoading.value = false
    }
  }

  async function loadTranslationSuggestions(
    signal: AbortSignal,
    options?: { background?: boolean },
  ): Promise<void> {
    translationError.value = null
    const targetLangs = translationTargetLangs.value

    if (!targetLangs.length) {
      translationSuggestions.value = []
      translationLoading.value = false
      return
    }

    if (!options?.background && !translationSuggestions.value.length) {
      translationLoading.value = true
    }

    try {
      translationSuggestions.value = await fetchTranslationSuggestions(
        targetLangs,
        signal,
        translationCountPerLanguage,
      )
    } catch (err) {
      if (isAbort(err)) return
      if (!translationSuggestions.value.length) {
        translationSuggestions.value = []
      }
      translationError.value =
        err instanceof Error ? err.message : 'Could not load translation suggestions.'
    } finally {
      translationLoading.value = false
    }
  }

  async function retryActiveDiscussionsFeed(): Promise<void> {
    const dayKey = utcDayKey()
    clearActiveDiscussionsSessionCache()
    clearCachedActiveDiscussions(dayKey)

    abort?.abort()
    abort = new AbortController()
    await loadActiveDiscussions(abort.signal)
  }

  async function retryTranslationFeed(): Promise<void> {
    const cacheKey = translationSuggestionsCacheKey(translationTargetLangs.value)
    clearTranslationSuggestionsSessionCache()
    clearCachedTranslationSuggestions(cacheKey)

    abort?.abort()
    abort = new AbortController()
    await loadTranslationSuggestions(abort.signal)
  }

  async function refreshIncompleteTrending(signal?: AbortSignal): Promise<void> {
    if (!trendingItems.value.some(isTrendingSummaryIncomplete)) return
    if (!signal) {
      abort?.abort()
      abort = new AbortController()
      signal = abort.signal
    }
    try {
      trendingItems.value = await fetchTrendingFeed(signal)
    } catch (err) {
      if (isAbort(err)) return
    }
  }

  async function retryFeaturedFeed(): Promise<void> {
    const dayKey = utcDayKey()
    clearFeaturedTabSessionCache()
    clearFeaturedFeedSessionCache()
    clearCachedFeaturedTab(dayKey)

    abort?.abort()
    abort = new AbortController()
    await loadFeatured(abort.signal)
  }

  async function retryTrendingFeed(): Promise<void> {
    const dayKey = utcDayKey()
    clearTrendingSessionCache()
    clearCachedTrendingFeed(dayKey)

    abort?.abort()
    abort = new AbortController()
    await loadTrending(abort.signal)
  }

  function load(): void {
    abort?.abort()
    abort = new AbortController()
    const { signal } = abort

    const dayKey = utcDayKey()
    const featuredCached = getCachedFeaturedTab(dayKey)
    const trendingCached = getCachedTrendingFeed(dayKey)
    const activeDiscussionsCached = getCachedActiveDiscussions(dayKey)
    const translationCacheKey = translationSuggestionsCacheKey(translationTargetLangs.value)
    const translationCached = getCachedTranslationSuggestions(translationCacheKey)

    if (featuredCached && isUsableFeaturedTab(featuredCached)) {
      featuredTab.value = featuredCached
      featuredTabLoading.value = false
    } else {
      featuredTab.value = EMPTY_FEATURED_TAB
      featuredTabLoading.value = true
    }

    if (trendingCached?.length) {
      trendingItems.value = trendingCached
      trendingLoading.value = false
    } else {
      trendingItems.value = []
      trendingLoading.value = true
    }

    if (activeDiscussionsCached?.length) {
      activeDiscussions.value = activeDiscussionsCached
      activeDiscussionsLoading.value = false
    } else {
      activeDiscussions.value = []
      activeDiscussionsLoading.value = true
    }

    if (translationCached?.length) {
      translationSuggestions.value = translationCached
      translationLoading.value = false
    } else if (!translationTargetLangs.value.length) {
      translationSuggestions.value = []
      translationLoading.value = false
    } else {
      translationSuggestions.value = []
      translationLoading.value = true
    }

    void (async () => {
      await Promise.all([
        featuredCached ? Promise.resolve() : loadFeatured(signal),
        loadTrending(signal, { background: Boolean(trendingCached?.length) }),
        loadActiveDiscussions(signal, { background: Boolean(activeDiscussionsCached?.length) }),
        loadTranslationSuggestions(signal, { background: Boolean(translationCached?.length) }),
      ])
      if (signal.aborted) return

      await reloadBookmarks()
    })()
  }

  watch(
    () => route.query.tab,
    (tab) => {
      if (tab !== 'trending') return
      void refreshIncompleteTrending()
    },
  )

  watch(
    () => [route.query.item, route.query.tab] as const,
    () => {
      void reloadBookmarks()
    },
  )

  watch(
    () => saveFeedback?.listsVersion.value,
    () => {
      void reloadBookmarks({
        skipFeeds: options.getBookmarkChangeSkipFeeds?.() ?? [],
      })
    },
  )

  watch(
    translationTargetLangs,
    () => {
      abort?.abort()
      abort = new AbortController()
      void loadTranslationSuggestions(abort.signal)
    },
    { deep: true },
  )

  onMounted(load)
  onBeforeUnmount(() => {
    abort?.abort()
    bookmarkAbort?.abort()
  })

  return {
    featuredArticle,
    didYouKnow,
    bornOnThisDay,
    featuredTabLoading,
    featuredTabError,
    retryFeaturedFeed,
    trendingItems,
    trendingLoading,
    trendingTabError,
    retryTrendingFeed,
    activeDiscussions,
    activeDiscussionsLoading,
    activeDiscussionsError,
    retryActiveDiscussionsFeed,
    translationSuggestions,
    translationLoading,
    translationError,
    retryTranslationFeed,
    hasSavedPages,
    savedSorted,
    recentlySaved,
    savedItemsLoading,
    homeRelatedItems,
    homeRelatedLoading,
    homeMentions,
    homeMentionsLoading,
    helpWanted,
    recentChanges,
    helpWantedLoading,
    recentChangesLoading,
    reloadBookmarks,
  }
}
