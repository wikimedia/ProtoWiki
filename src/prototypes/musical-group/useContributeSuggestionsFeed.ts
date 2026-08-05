import { onUnmounted, ref, watch, type Ref } from 'vue'

import { bookmarksKey, savedPagesListKey } from './data/cacheKeys'
import { normalizeEnwikiTitle } from './data/enwikiTitle'
import { fetchAllSavedSuggestions, fetchEditSuggestionForPage } from './data/fetchEditSuggestion'
import { fetchMorelikeTitles, resolveRelatedSummary } from './data/fetchRelatedReading'
import { getCachedContributeFeed, getCachedHelpWanted, setCachedContributeFeed } from './data/homeTabCache'
import type { HomeHelpWanted, HomeSavedItem } from './data/types'

/** How many related suggestions to resolve per loadMore call. */
const PAGE_SIZE = 5
/** Refill the title pool from another seed once it drops below this. */
const REFILL_THRESHOLD = PAGE_SIZE
/** Titles fetched per morelike API call. */
const MORELIKE_BATCH = 20
/** Minimum titles to add from one seed per refill round. */
const TITLES_PER_SEED = 2

function titlesPerSeed(seedCount: number): number {
  return Math.max(TITLES_PER_SEED, Math.ceil(REFILL_THRESHOLD / Math.max(seedCount, 1)))
}

interface SeedCursor {
  searchTitle: string
  displayTitle: string
  offset: number
}

interface PooledTitle {
  title: string
  relatedToTitle: string
}

function titleKey(title: string): string {
  return normalizeEnwikiTitle(title).toLowerCase()
}

function shuffleSeeds(seeds: SeedCursor[]): void {
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seeds[i], seeds[j]] = [seeds[j], seeds[i]]
  }
}

export function useContributeSuggestionsFeed(
  savedItems: Ref<HomeSavedItem[]>,
  active: Ref<boolean>,
) {
  const savedSuggestions = ref<HomeHelpWanted[]>([])
  const savedLoading = ref(false)
  const relatedSuggestions = ref<HomeHelpWanted[]>([])
  const relatedLoading = ref(false)
  const relatedHasMore = ref(true)
  const error = ref<string | null>(null)

  let seenTitles = new Set<string>()
  let excludedIds = new Set<string>()
  let seedTitles = new Set<string>()
  let seeds: SeedCursor[] = []
  let titlePool: PooledTitle[] = []
  let nextSeedIndex = 0
  let savedAbort: AbortController | null = null
  let relatedAbort: AbortController | null = null
  let loadedForKey: string | null = null
  let savedLoadedForKey: string | null = null

  function savedKey(): string {
    return savedPagesListKey(savedItems.value)
  }

  function persistState() {
    setCachedContributeFeed({
      dependencyKey: savedKey(),
      savedSuggestions: savedSuggestions.value,
      relatedSuggestions: relatedSuggestions.value,
      seenTitles: [...seenTitles],
      excludedIds: [...excludedIds],
      seedTitles: [...seedTitles],
      seeds,
      titlePool,
      nextSeedIndex,
      relatedHasMore: relatedHasMore.value,
      fetchedAt: Date.now(),
    })
  }

  function restoreFromCache(key: string): boolean {
    const cached = getCachedContributeFeed(key)
    if (!cached) return false

    savedSuggestions.value = cached.savedSuggestions
    relatedSuggestions.value = cached.relatedSuggestions
    seenTitles = new Set(cached.seenTitles)
    excludedIds = new Set(cached.excludedIds)
    seedTitles = new Set(cached.seedTitles)
    seeds = cached.seeds
    titlePool = cached.titlePool
    nextSeedIndex = cached.nextSeedIndex
    relatedHasMore.value = cached.relatedHasMore
    savedLoading.value = false
    relatedLoading.value = false
    error.value = null
    savedLoadedForKey = key
    return true
  }

  /** Home preview caches suggestions separately; seed the full-page feed from that cache. */
  function restoreFromHelpWantedCache(key: string): boolean {
    const helpCached = getCachedHelpWanted(bookmarksKey())
    if (!helpCached?.length) return false

    resetRelatedState()

    const savedIdSet = new Set(savedItems.value.map((item) => item.id))
    const savedEnwikiSet = new Set(
      savedItems.value
        .filter((item) => item.enwikiTitle)
        .map((item) => normalizeEnwikiTitle(item.enwikiTitle as string).toLowerCase()),
    )

    const saved: HomeHelpWanted[] = []
    const related: HomeHelpWanted[] = []

    for (const suggestion of helpCached) {
      const isSaved =
        savedIdSet.has(suggestion.itemId) ||
        Boolean(
          suggestion.enwikiTitle &&
            savedEnwikiSet.has(normalizeEnwikiTitle(suggestion.enwikiTitle).toLowerCase()),
        )

      if (isSaved) {
        saved.push(suggestion)
      } else {
        related.push(suggestion)
      }

      excludedIds.add(suggestion.itemId)
      if (suggestion.enwikiTitle) {
        seenTitles.add(normalizeEnwikiTitle(suggestion.enwikiTitle).toLowerCase())
      }
    }

    savedSuggestions.value = saved
    relatedSuggestions.value = related
    savedLoading.value = false
    relatedLoading.value = false
    error.value = null
    savedLoadedForKey = key
    persistState()
    return true
  }

  function resetRelatedState() {
    relatedAbort?.abort()
    relatedAbort = null

    relatedSuggestions.value = []
    relatedLoading.value = false
    error.value = null

    seenTitles = new Set<string>()
    excludedIds = new Set<string>()
    seedTitles = new Set<string>()
    seeds = []
    titlePool = []
    nextSeedIndex = 0

    for (const item of savedItems.value) {
      excludedIds.add(item.id)
      if (!item.enwikiTitle) continue
      const key = titleKey(item.enwikiTitle)
      seenTitles.add(key)
      if (seedTitles.has(key)) continue
      seedTitles.add(key)
      seeds.push({ searchTitle: item.enwikiTitle, displayTitle: item.title, offset: 0 })
    }

    shuffleSeeds(seeds)
    relatedHasMore.value = seeds.length > 0
  }

  function promoteRelatedSeed(title: string) {
    const key = titleKey(title)
    if (seedTitles.has(key)) return
    seedTitles.add(key)
    seeds.push({ searchTitle: title, displayTitle: title, offset: 0 })
  }

  async function refillPool(signal: AbortSignal) {
    if (!seeds.length) {
      relatedHasMore.value = false
      return
    }

    let passes = 0
    const maxPasses = Math.max(seeds.length * 2, 4)

    while (titlePool.length < REFILL_THRESHOLD && passes < maxPasses) {
      const start = nextSeedIndex

      for (let i = 0; i < seeds.length && titlePool.length < REFILL_THRESHOLD; i++) {
        const seed = seeds[(start + i) % seeds.length]
        const titles = await fetchMorelikeTitles(
          seed.searchTitle,
          signal,
          MORELIKE_BATCH,
          seed.offset,
        )
        seed.offset += MORELIKE_BATCH

        const perSeed = titlesPerSeed(seeds.length)
        let added = 0
        for (const title of titles) {
          if (added >= perSeed) break

          const key = titleKey(title)
          if (seenTitles.has(key)) continue
          seenTitles.add(key)
          titlePool.push({ title, relatedToTitle: seed.displayTitle })
          added++
        }
      }

      nextSeedIndex = (start + seeds.length) % seeds.length
      passes++
    }

    relatedHasMore.value = seeds.length > 0
  }

  async function resolveRelatedSuggestion(
    { title, relatedToTitle }: PooledTitle,
    signal: AbortSignal,
  ): Promise<HomeHelpWanted | null> {
    const summary = await resolveRelatedSummary(title, relatedToTitle, signal)
    if (!summary) return null

    const trackKey = summary.itemId ?? `enwiki:${titleKey(title)}`
    if (excludedIds.has(trackKey)) return null

    excludedIds.add(trackKey)

    const suggestion = await fetchEditSuggestionForPage(
      {
        itemId: summary.itemId,
        title: summary.title,
        enwikiTitle: title,
        description: summary.description,
        thumbnailUrl: summary.thumbnailUrl,
      },
      relatedToTitle,
      signal,
      'musical-group-contribute-related',
    )

    if (suggestion) {
      promoteRelatedSeed(title)
    }

    return suggestion
  }

  async function loadSavedSuggestions(key: string) {
    savedAbort?.abort()
    savedAbort = new AbortController()
    const { signal } = savedAbort

    savedSuggestions.value = []
    savedLoading.value = true

    try {
      await fetchAllSavedSuggestions(savedItems.value, signal, {
        onEach: (suggestion) => {
          savedSuggestions.value = [...savedSuggestions.value, suggestion]
        },
      })
      savedLoadedForKey = key
      persistState()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      savedSuggestions.value = []
    } finally {
      savedLoading.value = false
    }
  }

  async function loadMoreRelated() {
    if (!active.value || relatedLoading.value || savedLoading.value || !relatedHasMore.value) {
      return
    }

    relatedAbort?.abort()
    relatedAbort = new AbortController()
    const { signal } = relatedAbort

    relatedLoading.value = true
    error.value = null

    try {
      await refillPool(signal)

      let resolvedCount = 0
      let attempts = 0
      const maxAttempts = PAGE_SIZE * 4

      while (resolvedCount < PAGE_SIZE && titlePool.length && attempts < maxAttempts) {
        const pooled = titlePool.shift()
        if (!pooled) break
        attempts++

        const suggestion = await resolveRelatedSuggestion(pooled, signal)
        if (suggestion) {
          relatedSuggestions.value = [...relatedSuggestions.value, suggestion]
          resolvedCount++
        }
      }

      relatedHasMore.value = seeds.length > 0
      persistState()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load more edit suggestions.'
      relatedHasMore.value = false
    } finally {
      relatedLoading.value = false
    }
  }

  watch(
    () => [savedKey(), active.value] as const,
    ([key, isActive], oldValue) => {
      const prevKey = oldValue?.[0]

      if (key !== prevKey) {
        loadedForKey = null
        savedLoadedForKey = null
      }

      if (!isActive) {
        savedAbort?.abort()
        relatedAbort?.abort()
        savedAbort = null
        relatedAbort = null
        savedLoading.value = false
        relatedLoading.value = false
        return
      }

      if (loadedForKey === key) return

      loadedForKey = key
      if (restoreFromCache(key)) return
      if (restoreFromHelpWantedCache(key)) return

      resetRelatedState()

      void (async () => {
        await loadSavedSuggestions(key)
        if (!active.value || savedLoadedForKey !== key) return
        void loadMoreRelated()
      })()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    savedAbort?.abort()
    relatedAbort?.abort()
  })

  return {
    savedSuggestions,
    savedLoading,
    relatedSuggestions,
    relatedLoading,
    relatedHasMore,
    error,
    loadMoreRelated,
  }
}
