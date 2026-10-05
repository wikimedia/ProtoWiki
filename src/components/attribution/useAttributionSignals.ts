import { onScopeDispose, ref, watch, type Ref } from 'vue'

import { fetchAttributionSignals } from './fetchAttributionSignals'
import { fetchContributorCount } from './fetchContributorCount'
import { AttributionApiError, type AttributionSignals, type FetchAttributionSignalsOptions } from './types'

export interface UseAttributionSignalsOptions extends Omit<FetchAttributionSignalsOptions, 'signal'> {
  /** When false, skip the contributor-count backfill. Default true. */
  backfillContributorCount?: boolean
}

export function useAttributionSignals(
  title: Ref<string> | string,
  options: UseAttributionSignalsOptions = {},
): {
  signals: Ref<AttributionSignals | null>
  loading: Ref<boolean>
  error: Ref<string | null>
} {
  const signals = ref<AttributionSignals | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let abortController: AbortController | null = null

  async function load(pageTitle: string): Promise<void> {
    const trimmed = pageTitle.trim()
    if (!trimmed) {
      signals.value = null
      error.value = null
      loading.value = false
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    error.value = null

    const fetchOptions: FetchAttributionSignalsOptions = {
      host: options.host,
      expand: options.expand,
      apiContact: options.apiContact,
      signal,
    }

    try {
      const [attribution, contributorCount] = await Promise.all([
        fetchAttributionSignals(trimmed, fetchOptions),
        options.backfillContributorCount === false
          ? Promise.resolve(null)
          : fetchContributorCount(trimmed, {
              host: options.host,
              signal,
              apiContact: options.apiContact,
            }),
      ])

      if (signal.aborted) return

      const apiContributorCount = attribution.trust_and_relevance?.contributor_counts
      if (
        typeof apiContributorCount !== 'number' &&
        typeof contributorCount === 'number'
      ) {
        attribution.trust_and_relevance = {
          ...attribution.trust_and_relevance,
          contributor_counts: contributorCount,
        }
      }

      signals.value = attribution
    } catch (err) {
      if (signal.aborted) return
      if (err instanceof AttributionApiError) {
        error.value = err.message
      } else if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Failed to load attribution signals'
      }
      signals.value = null
    } finally {
      if (!signal.aborted) {
        loading.value = false
      }
    }
  }

  watch(
    () => (typeof title === 'string' ? title : title.value),
    (nextTitle) => {
      void load(nextTitle)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    abortController?.abort()
  })

  return { signals, loading, error }
}
