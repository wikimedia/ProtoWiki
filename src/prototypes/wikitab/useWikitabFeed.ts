import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { fetchDailyFeed } from './data/fetchDailyFeed'
import { WIKITAB_SECTIONS, type WikitabCardData, type WikitabFeed, type WikitabSectionSpec } from './sections'

export interface WikitabSectionState {
  spec: WikitabSectionSpec
  items: WikitabCardData[]
}

export function useWikitabFeed() {
  const feed = shallowRef<WikitabFeed | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let controller: AbortController | null = null

  async function load(): Promise<void> {
    controller?.abort()
    const local = new AbortController()
    controller = local

    loading.value = true
    error.value = null

    try {
      const result = await fetchDailyFeed(local.signal)
      if (local.signal.aborted) return
      feed.value = result
    } catch (cause) {
      if (local.signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load the feed.'
    } finally {
      if (!local.signal.aborted) loading.value = false
    }
  }

  const sections = computed<WikitabSectionState[]>(() =>
    WIKITAB_SECTIONS.map((spec) => ({ spec, items: feed.value?.[spec.id] ?? [] })),
  )

  onMounted(load)
  onUnmounted(() => controller?.abort())

  return { sections, loading, error, reload: load }
}
