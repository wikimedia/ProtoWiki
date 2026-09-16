import { computed, onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'
import { fetchDailyFeed } from './data/fetchDailyFeed'
import { WIKITAB_SECTIONS, type WikitabCardData, type WikitabFeed, type WikitabSectionSpec } from './sections'

export interface WikitabSectionState {
  spec: WikitabSectionSpec
  items: WikitabCardData[]
}

export function useWikitabFeed(options: { enabled?: Ref<boolean> } = {}) {
  const feed = shallowRef<WikitabFeed | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let controller: AbortController | null = null

  async function load(): Promise<void> {
    if (options.enabled && !options.enabled.value) {
      controller?.abort()
      loading.value = false
      return
    }

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

  if (options.enabled) {
    watch(
      options.enabled,
      (enabled) => {
        if (enabled) void load()
        else {
          controller?.abort()
          loading.value = false
        }
      },
      { immediate: true },
    )
  } else {
    void load()
  }

  onUnmounted(() => controller?.abort())

  return { sections, loading, error, reload: load }
}
