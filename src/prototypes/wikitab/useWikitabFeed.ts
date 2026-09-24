import { computed, onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'
import { fetchDailyFeedProgressive, fetchWikitabSectionFeed } from './data/fetchDailyFeed'
import { persistPartialFeed, readCachedFeed, utcDayKey } from './data/feedCache'
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

const ALL_SECTION_IDS = WIKITAB_SECTIONS.map((section) => section.id)

function isSecondarySection(id: WikitabSectionId): boolean {
  return SECONDARY_SECTION_IDS.includes(id)
}

function enabledSectionsFromHidden(hiddenSectionIds: readonly WikitabSectionId[]): Set<WikitabSectionId> {
  const hidden = new Set(hiddenSectionIds)
  return new Set(ALL_SECTION_IDS.filter((id) => !hidden.has(id)))
}

export function isSectionFeedLoading(
  sectionId: WikitabSectionId,
  feedPhase: WikitabFeedPhase,
): boolean {
  if (feedPhase === 'complete' || feedPhase === 'error') return false
  if (feedPhase === 'featured') return isSecondarySection(sectionId)
  return true
}

export function useWikitabFeed(
  options: {
    enabled?: Ref<boolean>
    hiddenSectionIds?: Ref<WikitabSectionId[]>
    /** When false, the page orchestrator calls `loadSection` in visual order. */
    autoLoad?: boolean
  } = {},
) {
  const feed = shallowRef<WikitabFeed | null>(null)
  const feedPhase = ref<WikitabFeedPhase>('idle')
  const error = ref<string | null>(null)
  const fetchedSections = ref(new Set<WikitabSectionId>())
  const loadingSectionIds = ref(new Set<WikitabSectionId>())

  let controller: AbortController | null = null
  let unhideController: AbortController | null = null

  function currentEnabledSections(): Set<WikitabSectionId> {
    return enabledSectionsFromHidden(options.hiddenSectionIds?.value ?? [])
  }

  async function fetchUnhiddenSection(id: WikitabSectionId, signal: AbortSignal): Promise<void> {
    loadingSectionIds.value = new Set([...loadingSectionIds.value, id])

    try {
      const items = await fetchWikitabSectionFeed(id, signal)
      if (signal.aborted) return

      fetchedSections.value = new Set([...fetchedSections.value, id])
      feed.value = {
        trending: [],
        news: [],
        dyk: [],
        discussions: [],
        otd: [],
        births: [],
        ...feed.value,
        [id]: items,
      }
      persistPartialFeed(utcDayKey(), feed.value)
    } finally {
      if (signal.aborted) return
      const next = new Set(loadingSectionIds.value)
      next.delete(id)
      loadingSectionIds.value = next
    }
  }

  function prepareForOrderedLoad(): void {
    controller?.abort()
    controller = new AbortController()
    feedPhase.value = 'idle'
    error.value = null
    fetchedSections.value = new Set()
    loadingSectionIds.value = new Set()

    const cached = readCachedFeed(utcDayKey())
    if (cached) {
      feed.value = cached
      const enabled = currentEnabledSections()
      const fetched = new Set<WikitabSectionId>()
      for (const id of ALL_SECTION_IDS) {
        if (enabled.has(id) && (cached[id]?.length ?? 0) > 0) fetched.add(id)
      }
      fetchedSections.value = fetched
      feedPhase.value = [...enabled].every((id) => fetched.has(id)) ? 'complete' : 'featured'
    } else {
      feed.value = null
    }
  }

  /** Load one feed section — used by the home-page top-to-bottom orchestrator. */
  async function loadSection(sectionId: WikitabSectionId): Promise<void> {
    if (options.enabled && !options.enabled.value) return
    if (!currentEnabledSections().has(sectionId)) return
    if (fetchedSections.value.has(sectionId)) return

    if (!controller) controller = new AbortController()
    const { signal } = controller

    try {
      await fetchUnhiddenSection(sectionId, signal)
      if (signal.aborted) return

      const enabled = currentEnabledSections()
      const allFetched = [...enabled].every((id) => fetchedSections.value.has(id))
      feedPhase.value = allFetched ? 'complete' : 'featured'
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      error.value = 'Could not load the feed.'
      feedPhase.value = 'error'
    }
  }

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
    fetchedSections.value = new Set()

    const enabled = currentEnabledSections()

    try {
      await fetchDailyFeedProgressive(
        (partial) => {
          if (local.signal.aborted) return
          feed.value = partial
          if (feedPhase.value !== 'featured') feedPhase.value = 'featured'
        },
        local.signal,
        { enabledSections: enabled },
      )

      if (local.signal.aborted) return

      const fetched = new Set<WikitabSectionId>(enabled)
      if (feed.value) {
        for (const id of ALL_SECTION_IDS) {
          if ((feed.value[id]?.length ?? 0) > 0) fetched.add(id)
        }
      }
      fetchedSections.value = fetched
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
    if (loadingSectionIds.value.has(sectionId)) return true
    if (!currentEnabledSections().has(sectionId)) return false
    if (fetchedSections.value.has(sectionId)) return false
    return isSectionFeedLoading(sectionId, feedPhase.value)
  }

  const autoLoad = options.autoLoad !== false

  if (autoLoad) {
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
  } else if (options.enabled) {
    watch(
      options.enabled,
      (enabled) => {
        if (!enabled) {
          controller?.abort()
          feedPhase.value = 'idle'
        }
      },
      { immediate: true },
    )
  }

  if (options.hiddenSectionIds) {
    watch(options.hiddenSectionIds, (nextHidden, prevHidden) => {
      const prevSet = new Set(prevHidden ?? [])
      const nextSet = new Set(nextHidden)

      for (const id of ALL_SECTION_IDS) {
        if (!prevSet.has(id) || nextSet.has(id)) continue

        if (fetchedSections.value.has(id)) continue

        unhideController?.abort()
        unhideController = new AbortController()
        void fetchUnhiddenSection(id, unhideController.signal)
      }
    })
  }

  onUnmounted(() => {
    controller?.abort()
    unhideController?.abort()
  })

  return {
    sections,
    feedPhase,
    error,
    isSectionLoading,
    reload: load,
    prepareForOrderedLoad,
    loadSection,
  }
}
