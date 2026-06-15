import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { useConfig } from '@/composables/useConfig'
import {
  usePrototypeDevSettings,
  type MorelikeStrategy,
} from '@/composables/usePrototypeDevSettings'
import {
  fetchMorelikeForSingleSeed,
  fetchMorelikeResults,
  MorelikeFetchError,
  normalizeTitleKey,
  type MorelikeSearchHit,
} from '@/lib/fetchMorelike'
import {
  fetchMicrotaskQuality,
  pickPrimaryNeed,
} from '@/lib/fetchMicrotaskQuality'
import {
  fetchUserEditedPageTitles,
  FetchUserEditedPageTitlesError,
} from '@/lib/fetchUserEditedPageTitles'
import {
  DEFAULT_MLT_CUSTOM,
  OPENING_TEXT_MLT_CUSTOM,
  type MorelikeMltPreset,
} from '@/lib/morelikeMlt'

import {
  buildSeedSources,
  buildTopicFilterLabel,
  flattenSeedTitles,
  hasSeedTitles,
  sampleSeedsForSerial,
  serialLimitPerSeed,
} from './buildSeedSources'
import { pickMicrotaskForTitle } from './microtaskCatalog'
import { useInterestsSettings } from './useInterestsSettings'
import type { SuggestionDescriptionPart } from './veSuggestions'

export interface StructuredSuggestion {
  articleTitle: string
  articleShortDescription: string
  thumbnailSrc?: string
  pageviewsLabel?: string
  taskHeading: string
  taskDifficulty: 'easy' | 'medium' | 'hard'
  taskTimeEstimate: string
  taskDescriptionParts: SuggestionDescriptionPart[]
}

interface SuggestedEditsState {
  suggestions: Ref<StructuredSuggestion[]>
  currentIndex: Ref<number>
  loading: Ref<boolean>
  error: Ref<string | null>
  hasStarted: Ref<boolean>
  topicFilter: ComputedRef<string>
  totalCount: ComputedRef<number>
  loadPending: ComputedRef<boolean>
  showRefresh: ComputedRef<boolean>
  emptyMessage: ComputedRef<string | null>
  currentSuggestion: ComputedRef<StructuredSuggestion | null>
  onLoad: () => void
  onRefresh: () => void
  onNavigate: (delta: number) => void
}

let sharedState: SuggestedEditsState | null = null

function resolveMltForStrategy(strategy: MorelikeStrategy): {
  preset: MorelikeMltPreset
  custom: typeof DEFAULT_MLT_CUSTOM
} {
  if (strategy === 'opening_text') {
    return { preset: 'custom', custom: OPENING_TEXT_MLT_CUSTOM }
  }
  return { preset: 'default', custom: DEFAULT_MLT_CUSTOM }
}

function mapHitToSuggestion(
  hit: MorelikeSearchHit,
  need?: string | null,
): StructuredSuggestion {
  const task = pickMicrotaskForTitle(hit.title, need)

  return {
    articleTitle: hit.title,
    articleShortDescription: hit.description || 'No short description available.',
    thumbnailSrc: hit.thumbnail?.url,
    taskHeading: task.heading,
    taskDifficulty: task.difficulty,
    taskTimeEstimate: task.timeEstimate,
    taskDescriptionParts: task.descriptionParts,
  }
}

async function resolveEditedPages(
  user: string,
  realUsername: string,
  configuredPages: string[],
  lang: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (user !== 'real') return configuredPages

  const username = realUsername.trim()
  if (!username.length) return []

  if (configuredPages.length) return configuredPages

  try {
    return await fetchUserEditedPageTitles(realUsername, { lang, signal })
  } catch (error) {
    if (error instanceof FetchUserEditedPageTitlesError && error.code === 'no_edits') {
      return []
    }
    throw error
  }
}

async function fetchMorelikeHits(
  strategy: MorelikeStrategy,
  seedTitles: string[],
  lang: string,
  allSeedKeys: Set<string>,
  signal?: AbortSignal,
): Promise<MorelikeSearchHit[]> {
  const { preset, custom } = resolveMltForStrategy(strategy)

  if (strategy === 'serial') {
    const seeds = seedTitles
    const limitPerSeed = serialLimitPerSeed(seeds.length)
    const merged: MorelikeSearchHit[] = []
    const seen = new Set<string>()

    for (const seed of seeds) {
      if (signal?.aborted) {
        throw new MorelikeFetchError('Request aborted', 'aborted')
      }

      const hits = await fetchMorelikeForSingleSeed(seed, {
        limit: limitPerSeed,
        mltPreset: preset,
        mltCustom: custom,
        lang,
        signal,
      })

      for (const hit of hits) {
        const key = normalizeTitleKey(hit.title)
        if (seen.has(key) || allSeedKeys.has(key)) continue
        seen.add(key)
        merged.push(hit)
      }
    }

    return merged
  }

  const hits = await fetchMorelikeResults(seedTitles, {
    limit: 20,
    mltPreset: preset,
    mltCustom: custom,
    lang,
    signal,
  })

  return hits.filter((hit) => !allSeedKeys.has(normalizeTitleKey(hit.title)))
}

async function assignMicrotasks(
  hits: MorelikeSearchHit[],
  microtaskSource: 'random' | 'quality-check',
  lang: string,
  signal?: AbortSignal,
): Promise<StructuredSuggestion[]> {
  if (microtaskSource === 'random' || !hits.length) {
    return hits.map((hit) => mapHitToSuggestion(hit))
  }

  try {
    const qualityResults = await fetchMicrotaskQuality(
      hits.map((hit) => hit.title),
      { lang, signal },
    )
    const needByTitle = new Map(
      qualityResults.map((result) => [normalizeTitleKey(result.title), pickPrimaryNeed(result)]),
    )

    return hits.map((hit) =>
      mapHitToSuggestion(hit, needByTitle.get(normalizeTitleKey(hit.title)) ?? null),
    )
  } catch {
    return hits.map((hit) => mapHitToSuggestion(hit))
  }
}

function createSuggestedEditsState(): SuggestedEditsState {
  const interestsSettings = useInterestsSettings()
  const { morelikeStrategy, microtaskSource, settings: devSettings } = usePrototypeDevSettings()
  const { user, realUsername, lang, currentUserPageLists } = useConfig()

  const suggestions = ref<StructuredSuggestion[]>([])
  const currentIndex = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasStarted = ref(false)

  let abortController: AbortController | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const topicFilter = computed(() => buildTopicFilterLabel(interestsSettings.value))
  const totalCount = computed(() => suggestions.value.length)
  const loadPending = computed(() => !hasStarted.value && suggestions.value.length === 0)
  const showRefresh = computed(() => hasStarted.value)
  const currentSuggestion = computed(() => suggestions.value[currentIndex.value] ?? null)

  const emptyMessage = computed((): string | null => {
    if (loading.value) return null
    if (error.value) return null

    if (user.value === 'real' && !realUsername.value.trim()) {
      return 'Set a username in prototype settings to use editing history.'
    }

    if (hasStarted.value && suggestions.value.length === 0) {
      const sources = buildSeedSources({
        interestsSettings: interestsSettings.value,
        user: user.value,
        editedPages: currentUserPageLists.value.editedPages,
        watchlistPages: currentUserPageLists.value.watchlist,
        readingListPages: currentUserPageLists.value.readingList,
      })

      if (!hasSeedTitles(sources)) {
        return 'Add page interests or enable editing history to get suggestions.'
      }

      return 'No similar articles found — try different interests.'
    }

    return null
  })

  async function runFetch(): Promise<void> {
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    loading.value = true
    error.value = null

    try {
      if (user.value === 'real' && !realUsername.value.trim()) {
        suggestions.value = []
        currentIndex.value = 0
        return
      }

      const editedPages = await resolveEditedPages(
        user.value,
        realUsername.value,
        currentUserPageLists.value.editedPages,
        lang.value,
        signal,
      )

      const sources = buildSeedSources({
        interestsSettings: interestsSettings.value,
        user: user.value,
        editedPages,
        watchlistPages: currentUserPageLists.value.watchlist,
        readingListPages: currentUserPageLists.value.readingList,
      })

      if (!hasSeedTitles(sources)) {
        suggestions.value = []
        currentIndex.value = 0
        return
      }

      let seedTitles = flattenSeedTitles(sources)
      const allSeedKeys = new Set(seedTitles.map(normalizeTitleKey))

      if (devSettings.value.morelikeStrategy === 'serial' && seedTitles.length > 9) {
        seedTitles = sampleSeedsForSerial(sources)
      }

      const hits = await fetchMorelikeHits(
        devSettings.value.morelikeStrategy,
        seedTitles,
        lang.value,
        allSeedKeys,
        signal,
      )

      suggestions.value = await assignMicrotasks(
        hits,
        devSettings.value.microtaskSource,
        lang.value,
        signal,
      )
      currentIndex.value = 0
    } catch (fetchError) {
      if (fetchError instanceof MorelikeFetchError && fetchError.code === 'aborted') {
        return
      }
      if (fetchError instanceof FetchUserEditedPageTitlesError && fetchError.code === 'aborted') {
        return
      }

      const message =
        fetchError instanceof Error ? fetchError.message : 'Could not load suggestions.'
      error.value = message
      suggestions.value = []
      currentIndex.value = 0
    } finally {
      if (!signal.aborted) {
        loading.value = false
        hasStarted.value = true
      }
    }
  }

  function scheduleRefetch(): void {
    if (!hasStarted.value) return

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      void runFetch()
    }, 400)
  }

  watch(
    [
      interestsSettings,
      () => user.value,
      () => realUsername.value,
      () => lang.value,
      () => currentUserPageLists.value.editedPages.join('\0'),
      () => currentUserPageLists.value.watchlist.join('\0'),
      () => currentUserPageLists.value.readingList.join('\0'),
      () => devSettings.value.morelikeStrategy,
      () => devSettings.value.microtaskSource,
    ],
    scheduleRefetch,
  )

  function onLoad(): void {
    void runFetch()
  }

  function onRefresh(): void {
    void runFetch()
  }

  function onNavigate(delta: number): void {
    const next = currentIndex.value + delta
    if (next < 0 || next >= suggestions.value.length) return
    currentIndex.value = next
  }

  return {
    suggestions,
    currentIndex,
    loading,
    error,
    hasStarted,
    topicFilter,
    totalCount,
    loadPending,
    showRefresh,
    emptyMessage,
    currentSuggestion,
    onLoad,
    onRefresh,
    onNavigate,
  }
}

export function useSuggestedEdits(): SuggestedEditsState {
  if (!sharedState) {
    sharedState = createSuggestedEditsState()
  }
  return sharedState
}
