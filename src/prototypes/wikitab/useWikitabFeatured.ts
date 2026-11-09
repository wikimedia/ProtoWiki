import { ref } from 'vue'

import { featuredSpotlightShell, fetchWikitabFeatured } from './data/fetchWikitabFeatured'
import {
  clearCachedFeatured,
  isFeaturedCacheFresh,
  readCachedFeaturedEntry,
  utcDayKey,
  writeCachedFeatured,
} from './data/featuredCache'
import { featuredSpotlightInitialLoading } from './data/wikitabFeaturedSpotlightCard'
import {
  WIKITAB_FEATURED_SPOTLIGHT_KINDS,
  type WikitabCardLoading,
  type WikitabFeaturedSpotlight,
  type WikitabFeaturedSpotlightKind,
} from './sections'
import { WIKITAB_LANGUAGE } from './data/wikitabLanguage'

export type WikitabFeaturedLoadingByKind = Partial<
  Record<WikitabFeaturedSpotlightKind, WikitabCardLoading>
>

export function useWikitabFeatured() {
  const items = ref<WikitabFeaturedSpotlight[]>([])
  /** Per-spotlight fields still in flight while a fetch is running; empty once settled. */
  const loadingByKind = ref<WikitabFeaturedLoadingByKind>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  let controller: AbortController | null = null
  let loadedDay: string | null = null
  let staleRefreshInFlight = false

  function abortFeatured(): void {
    controller?.abort()
    controller = null
  }

  function showShells(): void {
    items.value = WIKITAB_FEATURED_SPOTLIGHT_KINDS.map(featuredSpotlightShell)
    loadingByKind.value = Object.fromEntries(
      WIKITAB_FEATURED_SPOTLIGHT_KINDS.map((kind) => [kind, featuredSpotlightInitialLoading(kind)]),
    )
  }

  function patchSpotlight(spotlight: WikitabFeaturedSpotlight, fieldLoading: WikitabCardLoading) {
    items.value = items.value.map((item) => (item.kind === spotlight.kind ? spotlight : item))
    loadingByKind.value = { ...loadingByKind.value, [spotlight.kind]: fieldLoading }
  }

  async function fetchFromNetwork(
    day: string,
    signal: AbortSignal,
    options: { progressive?: boolean } = {},
  ): Promise<void> {
    if (options.progressive) {
      showShells()
    }

    const spotlights = await fetchWikitabFeatured(
      day,
      signal,
      options.progressive ? patchSpotlight : undefined,
      { skipCache: true },
    )
    if (signal.aborted) return

    items.value = spotlights
    loadingByKind.value = {}
    writeCachedFeatured(WIKITAB_LANGUAGE, day, spotlights)
    loadedDay = day
    loaded.value = true
    error.value = null
  }

  function scheduleStaleFeaturedRefresh(day: string): void {
    if (staleRefreshInFlight) return
    staleRefreshInFlight = true

    abortFeatured()
    controller = new AbortController()
    const { signal } = controller

    void fetchFromNetwork(day, signal, { progressive: false })
      .catch((cause) => {
        if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      })
      .finally(() => {
        if (controller?.signal === signal) staleRefreshInFlight = false
      })
  }

  async function refresh(options: { force?: boolean } = {}): Promise<void> {
    const day = utcDayKey()

    if (!options.force && loadedDay === day && items.value.length > 0) {
      loaded.value = true
      return
    }

    if (!options.force) {
      const cached = readCachedFeaturedEntry(WIKITAB_LANGUAGE, day)
      if (cached?.items.length) {
        items.value = cached.items
        loadingByKind.value = {}
        loadedDay = day
        loaded.value = true
        error.value = null
        loading.value = false

        if (!isFeaturedCacheFresh(cached.fetchedAt)) {
          scheduleStaleFeaturedRefresh(day)
        }
        return
      }
    } else {
      clearCachedFeatured(WIKITAB_LANGUAGE)
    }

    abortFeatured()
    controller = new AbortController()
    const { signal } = controller

    loading.value = true
    error.value = null
    showShells()

    try {
      await fetchFromNetwork(day, signal, { progressive: true })
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      items.value = []
      loadingByKind.value = {}
      error.value = 'Could not load Featured.'
      loaded.value = true
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  return {
    items,
    loadingByKind,
    loading,
    error,
    loaded,
    refresh,
    abortFeatured,
  }
}
