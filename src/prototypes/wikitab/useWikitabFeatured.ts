import { ref } from 'vue'

import { featuredSpotlightShell, fetchWikitabFeatured } from './data/fetchWikitabFeatured'
import {
  clearCachedFeatured,
  readCachedFeatured,
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

  async function refresh(options: { force?: boolean } = {}): Promise<void> {
    const day = utcDayKey()

    if (!options.force && loadedDay === day && items.value.length > 0) {
      loaded.value = true
      return
    }

    if (!options.force) {
      const cached = readCachedFeatured(day)
      if (cached?.length) {
        items.value = cached
        loadingByKind.value = {}
        loadedDay = day
        loaded.value = true
        error.value = null
        loading.value = false
        return
      }
    } else {
      clearCachedFeatured()
    }

    abortFeatured()
    controller = new AbortController()
    const { signal } = controller

    loading.value = true
    error.value = null
    showShells()

    try {
      const spotlights = await fetchWikitabFeatured(day, signal, patchSpotlight)
      if (signal.aborted) return

      items.value = spotlights
      loadingByKind.value = {}
      writeCachedFeatured(day, spotlights)
      loadedDay = day
      loaded.value = true
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
