import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { normalizeWikiUsername } from '@/lib/config'
import { getCachedImpact, setCachedImpact } from '@/lib/impactCache'
import { FetchUserImpactError, fetchUserImpact } from '@/lib/fetchUserImpact'
import { EMPTY_IMPACT_DATA, type ImpactData } from '@/lib/impactTypes'

export function useRealUserImpact(usernameSource: Ref<string> | ComputedRef<string>): {
  impactProps: ComputedRef<ImpactData>
  loading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
  hasCache: ComputedRef<boolean>
  lastFetchedAt: Ref<number | null>
  editedPageTitles: Ref<string[]>
} {
  const impactData = ref<ImpactData>({ ...EMPTY_IMPACT_DATA })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedAt = ref<number | null>(null)
  const editedPageTitles = ref<string[]>([])

  let abortController: AbortController | null = null

  function loadFromCache(raw: string): void {
    const cached = getCachedImpact(raw)
    if (cached) {
      impactData.value = { ...EMPTY_IMPACT_DATA, ...cached.data }
      lastFetchedAt.value = cached.fetchedAt
      editedPageTitles.value = cached.data.editedPageTitles ?? []
      return
    }
    impactData.value = { ...EMPTY_IMPACT_DATA }
    lastFetchedAt.value = null
    editedPageTitles.value = []
  }

  watch(
    usernameSource,
    (name) => {
      error.value = null
      loadFromCache(name)
    },
    { immediate: true },
  )

  const normalizedUsername = computed(() => normalizeWikiUsername(usernameSource.value))

  const hasCache = computed(() => lastFetchedAt.value != null)

  const impactProps = computed(() => impactData.value)

  async function refresh(): Promise<void> {
    const name = normalizedUsername.value
    if (!name.length) {
      error.value = 'Enter a Wikipedia username in the user menu'
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    error.value = null

    try {
      const data = await fetchUserImpact(name, { signal })
      const entry = setCachedImpact(name, data)
      impactData.value = { ...EMPTY_IMPACT_DATA, ...data }
      lastFetchedAt.value = entry.fetchedAt
      editedPageTitles.value = data.editedPageTitles ?? []
    } catch (err) {
      if (err instanceof FetchUserImpactError && err.code === 'aborted') {
        return
      }
      const message =
        err instanceof FetchUserImpactError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to fetch impact data'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  return {
    impactProps,
    loading,
    error,
    refresh,
    hasCache,
    lastFetchedAt,
    editedPageTitles,
  }
}
