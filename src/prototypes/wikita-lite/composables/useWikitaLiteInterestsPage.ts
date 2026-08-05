import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { fetchMorelikeTitles, resolveRelatedSummary } from '../../musical-group/data/fetchRelatedReading'
import { normalizeEnwikiTitle } from '../../musical-group/data/enwikiTitle'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import type { HomeRelated } from '../../musical-group/data/types'

import { useWikitaLiteSuggestionPreferencesSingleton } from './useWikitaLiteSuggestionPreferences'

const MAX_INTERESTS = 10
const RELATED_PREVIEW_LIMIT = 5

export function useWikitaLiteInterestsPage() {
  const router = useRouter()
  const { listInterests, commitInterests } = useWikitaLiteSuggestionPreferencesSingleton()

  const draftInterests = ref<string[]>([...listInterests()])
  const relatedItems = ref<HomeRelated[]>([])
  const relatedLoading = ref(false)
  const relatedSeedTitle = ref<string | null>(draftInterests.value[0] ?? null)

  let relatedAbort: AbortController | null = null
  let refreshDebounce: ReturnType<typeof setTimeout> | null = null

  function persistInterests(): void {
    commitInterests(draftInterests.value)
    draftInterests.value = [...listInterests()]
  }

  function addInterest(title: string): void {
    const trimmed = title.trim()
    if (!trimmed.length) return
    const key = trimmed.toLowerCase()
    if (draftInterests.value.some((entry) => entry.toLowerCase() === key)) return
    if (draftInterests.value.length >= MAX_INTERESTS) return
    draftInterests.value = [...draftInterests.value, trimmed]
    relatedSeedTitle.value = trimmed
    persistInterests()
  }

  function removeInterest(title: string): void {
    const key = title.toLowerCase()
    draftInterests.value = draftInterests.value.filter((entry) => entry.toLowerCase() !== key)
    if (relatedSeedTitle.value?.toLowerCase() === key) {
      relatedSeedTitle.value =
        draftInterests.value[draftInterests.value.length - 1] ??
        draftInterests.value[0] ??
        null
    }
    persistInterests()
  }

  function excludedInterestKeys(): Set<string> {
    return new Set(
      draftInterests.value.map((entry) => normalizeEnwikiTitle(entry).toLowerCase()),
    )
  }

  async function loadRelatedPreview(signal: AbortSignal): Promise<void> {
    if (!draftInterests.value.length) {
      relatedItems.value = []
      relatedLoading.value = false
      relatedSeedTitle.value = null
      return
    }

    const seed = relatedSeedTitle.value ?? draftInterests.value[0]
    if (!seed) {
      relatedItems.value = []
      relatedLoading.value = false
      return
    }

    relatedLoading.value = true
    relatedItems.value = []
    try {
      const excluded = excludedInterestKeys()
      const fetchLimit = RELATED_PREVIEW_LIMIT + excluded.size + 5
      const titles = await fetchMorelikeTitles(seed, signal, fetchLimit)
      const candidateTitles = titles
        .filter((title) => !excluded.has(normalizeEnwikiTitle(title).toLowerCase()))
        .slice(0, RELATED_PREVIEW_LIMIT + 3)

      const resolved = await mapWithConcurrency(
        candidateTitles,
        2,
        (title) => resolveRelatedSummary(title, seed, signal),
        signal,
      )
      relatedItems.value = resolved
        .filter((item): item is HomeRelated => item !== null)
        .filter((item) => !excluded.has(normalizeEnwikiTitle(item.title).toLowerCase()))
        .slice(0, RELATED_PREVIEW_LIMIT)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      relatedItems.value = []
    } finally {
      if (!signal.aborted) relatedLoading.value = false
    }
  }

  function scheduleRefresh(): void {
    if (refreshDebounce) clearTimeout(refreshDebounce)
    refreshDebounce = setTimeout(() => {
      relatedAbort?.abort()
      relatedAbort = new AbortController()
      void loadRelatedPreview(relatedAbort.signal)
    }, 300)
  }

  watch(draftInterests, scheduleRefresh, { deep: true, immediate: true })

  function discardAndClose(): void {
    router.back()
  }

  function saveAndClose(): void {
    router.back()
  }

  onBeforeUnmount(() => {
    if (refreshDebounce) clearTimeout(refreshDebounce)
    relatedAbort?.abort()
  })

  return {
    draftInterests,
    relatedItems,
    relatedLoading,
    addInterest,
    removeInterest,
    discardAndClose,
    saveAndClose,
  }
}
