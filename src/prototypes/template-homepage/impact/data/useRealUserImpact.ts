import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { normalizeLang, normalizeWikiUsername } from '@/config'
import { getCachedImpact, setCachedImpact } from './impactCache'
import { FetchUserImpactError, fetchUserImpact } from './fetchUserImpact'
import { EMPTY_IMPACT_DATA, type ImpactData } from './impactTypes'

function impactHasRenderableData(data: ImpactData): boolean {
  return (
    (data.totalEdits ?? 0) > 0 ||
    !!data.lastEdited ||
    !!data.viewCount ||
    (data.recentActivityData ?? []).some((value) => value > 0)
  )
}

export function useRealUserImpact(
  usernameSource: Ref<string> | ComputedRef<string>,
  wikiSource: Ref<string> | ComputedRef<string>,
): {
  impactProps: ComputedRef<ImpactData>
  loading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
  hasCache: ComputedRef<boolean>
  hasStarted: ComputedRef<boolean>
  hasRenderableData: ComputedRef<boolean>
  lastFetchedAt: Ref<number | null>
} {
  const impactData = ref<ImpactData>({ ...EMPTY_IMPACT_DATA })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasStarted = ref(false)
  const lastFetchedAt = ref<number | null>(null)

  let abortController: AbortController | null = null

  function mergeImpactPatch(patch: Partial<ImpactData>): void {
    impactData.value = { ...impactData.value, ...patch }
    if (!lastFetchedAt.value) {
      lastFetchedAt.value = Date.now()
    }
  }

  function loadFromCache(raw: string, wiki: string): void {
    const cached = getCachedImpact(raw, wiki)
    if (cached) {
      impactData.value = { ...EMPTY_IMPACT_DATA, ...cached.data }
      lastFetchedAt.value = cached.fetchedAt
      hasStarted.value = true
      return
    }
    impactData.value = { ...EMPTY_IMPACT_DATA }
    lastFetchedAt.value = null
    hasStarted.value = false
  }

  watch(
    [usernameSource, wikiSource],
    ([name, wiki]) => {
      error.value = null
      loadFromCache(name, normalizeLang(wiki))
    },
    { immediate: true },
  )

  const normalizedUsername = computed(() => normalizeWikiUsername(usernameSource.value))
  const normalizedWiki = computed(() => normalizeLang(wikiSource.value))

  const hasCache = computed(() => lastFetchedAt.value != null)

  const hasRenderableData = computed(() => impactHasRenderableData(impactData.value))

  const impactProps = computed(() => impactData.value)

  async function refresh(): Promise<void> {
    const name = normalizedUsername.value
    const wiki = normalizedWiki.value
    if (!name.length) {
      error.value = 'Enter a Wikipedia username in the user menu'
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    hasStarted.value = true
    loading.value = true
    error.value = null

    try {
      const data = await fetchUserImpact(name, {
        signal,
        lang: wiki,
        onProgress: (patch) => {
          mergeImpactPatch(patch)
        },
      })
      const entry = setCachedImpact(name, data, wiki)
      impactData.value = { ...EMPTY_IMPACT_DATA, ...data }
      lastFetchedAt.value = entry.fetchedAt
    } catch (err) {
      if (err instanceof FetchUserImpactError && err.code === 'aborted') {
        error.value = null
        return
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        error.value = null
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
    hasStarted: computed(() => hasStarted.value),
    hasRenderableData,
    lastFetchedAt,
  }
}
