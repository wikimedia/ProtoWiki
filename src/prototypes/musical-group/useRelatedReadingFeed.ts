import { onUnmounted, ref, watch, type Ref } from 'vue'

import { normalizeEnwikiTitle } from './data/enwikiTitle'
import { fetchMorelikeTitles, resolveRelatedSummary } from './data/fetchRelatedReading'
import type { HomeRelated, HomeSavedItem } from './data/types'

/** How many related cards to resolve per loadMore call. */
const PAGE_SIZE = 5
/** Refill the title pool from another seed once it drops below this. */
const REFILL_THRESHOLD = PAGE_SIZE
/** Titles fetched per morelike API call. */
const MORELIKE_BATCH = 20
/** Max titles to add from one saved page per refill round. */
const TITLES_PER_SEED = 2

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

/**
 * A paginated "Related reading" feed: each page draws morelike results from
 * saved pages (and later from related cards), resolves them to cards, and
 * dedupes against the saved set and everything already shown. Seeds keep
 * paginating via sroffset; related items become new seeds as the feed grows.
 */
export function useRelatedReadingFeed(
  savedItems: Ref<HomeSavedItem[]>,
  active: Ref<boolean>,
) {
  const related = ref<HomeRelated[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)

  let seen = new Set<string>()
  let seedTitles = new Set<string>()
  let seeds: SeedCursor[] = []
  let titlePool: PooledTitle[] = []
  let nextSeedIndex = 0
  let fetchAbort: AbortController | null = null
  let loadedForKey: string | null = null

  function savedKey(): string {
    return [...savedItems.value]
      .map((item) => item.id)
      .sort()
      .join(',')
  }

  function reset() {
    fetchAbort?.abort()
    fetchAbort = null

    related.value = []
    loading.value = false
    error.value = null

    seen = new Set<string>()
    seedTitles = new Set<string>()
    seeds = []
    titlePool = []
    nextSeedIndex = 0

    for (const item of savedItems.value) {
      if (!item.enwikiTitle) continue
      const key = titleKey(item.enwikiTitle)
      seen.add(key)
      if (seedTitles.has(key)) continue
      seedTitles.add(key)
      seeds.push({ searchTitle: item.enwikiTitle, displayTitle: item.title, offset: 0 })
    }

    shuffleSeeds(seeds)
    hasMore.value = seeds.length > 0
  }

  /** Turn a freshly resolved related card into a future morelike seed. */
  function promoteRelatedSeed(item: HomeRelated) {
    const key = titleKey(item.title)
    if (seedTitles.has(key)) return
    seedTitles.add(key)
    seeds.push({ searchTitle: item.title, displayTitle: item.title, offset: 0 })
  }

  /** Round-robin morelike queries across saved pages so each batch mixes seeds. */
  async function refillPool(signal: AbortSignal) {
    if (!seeds.length) {
      hasMore.value = false
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

        let added = 0
        for (const title of titles) {
          if (added >= TITLES_PER_SEED) break

          const key = titleKey(title)
          if (seen.has(key)) continue
          seen.add(key)
          titlePool.push({ title, relatedToTitle: seed.displayTitle })
          added++
        }
      }

      nextSeedIndex = (start + seeds.length) % seeds.length
      passes++
    }

    hasMore.value = seeds.length > 0
  }

  async function loadMore() {
    if (!active.value || loading.value || !hasMore.value) return

    fetchAbort?.abort()
    fetchAbort = new AbortController()
    const { signal } = fetchAbort

    loading.value = true
    error.value = null

    try {
      await refillPool(signal)

      const batchTitles = titlePool.splice(0, PAGE_SIZE)
      if (batchTitles.length) {
        const resolved = await Promise.all(
          batchTitles.map(({ title, relatedToTitle }) =>
            resolveRelatedSummary(title, relatedToTitle, signal),
          ),
        )
        const fresh = resolved.filter((item): item is HomeRelated => item !== null)
        if (fresh.length) {
          for (const item of fresh) {
            promoteRelatedSeed(item)
          }
          related.value = [...related.value, ...fresh]
        }
      }

      hasMore.value = seeds.length > 0
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load more related reading.'
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [savedKey(), active.value] as const,
    ([key, isActive], oldValue) => {
      const prevKey = oldValue?.[0]

      if (key !== prevKey) {
        loadedForKey = null
      }

      if (!isActive) {
        fetchAbort?.abort()
        fetchAbort = null
        loading.value = false
        return
      }

      if (loadedForKey === key) return

      loadedForKey = key
      reset()
      void loadMore()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    fetchAbort?.abort()
  })

  return {
    related,
    loading,
    hasMore,
    error,
    loadMore,
  }
}
