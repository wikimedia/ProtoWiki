import { computed, onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'
import { fetchDailyFeedProgressive } from './data/fetchDailyFeed'
import {
  WIKITAB_SECTIONS,
  type WikitabCardData,
  type WikitabFeed,
  type WikitabSectionId,
  type WikitabSectionSpec,
} from './sections'

export type WikitabFeedPhase = 'idle' | 'featured' | 'complete' | 'error'

export interface WikitabSectionState {
  spec: WikitabSectionSpec
  items: WikitabCardData[]
}

const SECONDARY_SECTION_IDS: readonly WikitabSectionId[] = ['otd', 'births', 'discussions']

function isSecondarySection(id: WikitabSectionId): boolean {
  return SECONDARY_SECTION_IDS.includes(id)
}

export function isSectionFeedLoading(
  sectionId: WikitabSectionId,
  feedPhase: WikitabFeedPhase,
): boolean {
  if (feedPhase === 'complete' || feedPhase === 'error') return false
  if (feedPhase === 'featured') return isSecondarySection(sectionId)
  return true
}

export function useWikitabFeed(options: { enabled?: Ref<boolean> } = {}) {
  const feed = shallowRef<WikitabFeed | null>(null)
  const feedPhase = ref<WikitabFeedPhase>('idle')
  const error = ref<string | null>(null)

  let controller: AbortController | null = null

  async function load(): Promise<void> {
    if (options.enabled && !options.enabled.value) {
      controller?.abort()
      feedPhase.value = 'idle'
      return
    }

    controller?.abort()
    const local = new AbortController()
    controller = local

    feedPhase.value = 'idle'
    feed.value = null
    error.value = null

    try {
      await fetchDailyFeedProgressive((partial) => {
        if (local.signal.aborted) return
        feed.value = partial
        if (feedPhase.value !== 'featured') feedPhase.value = 'featured'
      }, local.signal)

      if (local.signal.aborted) return
      feedPhase.value = 'complete'
    } catch (cause) {
      if (local.signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load the feed.'
      feedPhase.value = 'error'
    }
  }

  const sections = computed<WikitabSectionState[]>(() =>
    WIKITAB_SECTIONS.map((spec) => ({ spec, items: feed.value?.[spec.id] ?? [] })),
  )

  function isSectionLoading(sectionId: WikitabSectionId): boolean {
    return isSectionFeedLoading(sectionId, feedPhase.value)
  }

  if (options.enabled) {
    watch(
      options.enabled,
      (enabled) => {
        if (enabled) void load()
        else {
          controller?.abort()
          feedPhase.value = 'idle'
        }
      },
      { immediate: true },
    )
  } else {
    void load()
  }

  onUnmounted(() => controller?.abort())

  return { sections, feedPhase, error, isSectionLoading, reload: load }
}
