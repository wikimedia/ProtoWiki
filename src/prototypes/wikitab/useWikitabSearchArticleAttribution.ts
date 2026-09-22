import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

import { fetchAttributionSignals } from '@/components/attribution/fetchAttributionSignals'
import {
  formatCompactCount,
  formatLastUpdatedTooltip,
  formatSearchLastUpdatedLabel,
  pageViewsTooltip,
  referenceCountTooltip,
} from '@/components/attribution/formatAttribution'
import { AttributionApiError, type AttributionTrustAndRelevance } from '@/components/attribution/types'

interface CachedAttribution {
  trust: AttributionTrustAndRelevance | undefined
}

const cache = new Map<string, CachedAttribution>()
const inflight = new Map<string, Promise<CachedAttribution>>()

function formatReferenceCount(count: number): string {
  return count < 1000 ? String(count) : formatCompactCount(count)
}

function labelsFromTrust(trust: AttributionTrustAndRelevance | undefined): {
  pageViewsLabel: string | null
  referenceCountLabel: string | null
  lastUpdatedLabel: string | null
  pageViewsTooltipText: string | null
  referenceCountTooltipText: string | null
  lastUpdatedTooltipText: string | null
} {
  const pageViews = trust?.page_views
  const referenceCount = trust?.reference_count
  const lastUpdated = trust?.last_updated

  return {
    pageViewsLabel: typeof pageViews === 'number' ? formatCompactCount(pageViews) : null,
    referenceCountLabel:
      typeof referenceCount === 'number' && referenceCount > 0
        ? formatReferenceCount(referenceCount)
        : null,
    lastUpdatedLabel: lastUpdated ? formatSearchLastUpdatedLabel(lastUpdated) : null,
    pageViewsTooltipText: typeof pageViews === 'number' ? pageViewsTooltip(pageViews) : null,
    referenceCountTooltipText:
      typeof referenceCount === 'number' && referenceCount > 0
        ? referenceCountTooltip(referenceCount)
        : null,
    lastUpdatedTooltipText: lastUpdated ? formatLastUpdatedTooltip(lastUpdated) : null,
  }
}

async function loadAttribution(title: string, signal: AbortSignal): Promise<CachedAttribution> {
  const cached = cache.get(title)
  if (cached) return cached

  const pending = inflight.get(title)
  if (pending) return pending

  const promise = fetchAttributionSignals(title, {
    expand: ['trust_and_relevance'],
    signal,
  })
    .then((signals) => {
      const entry: CachedAttribution = { trust: signals.trust_and_relevance }
      cache.set(title, entry)
      inflight.delete(title)
      return entry
    })
    .catch((err) => {
      inflight.delete(title)
      throw err
    })

  inflight.set(title, promise)
  return promise
}

export function useWikitabSearchArticleAttribution(title: Ref<string>): {
  pageViewsLabel: Ref<string | null>
  referenceCountLabel: Ref<string | null>
  lastUpdatedLabel: Ref<string | null>
  pageViewsTooltipText: Ref<string | null>
  referenceCountTooltipText: Ref<string | null>
  lastUpdatedTooltipText: Ref<string | null>
  loading: Ref<boolean>
  showSupporting: Ref<boolean>
} {
  const pageViewsLabel = ref<string | null>(null)
  const referenceCountLabel = ref<string | null>(null)
  const lastUpdatedLabel = ref<string | null>(null)
  const pageViewsTooltipText = ref<string | null>(null)
  const referenceCountTooltipText = ref<string | null>(null)
  const lastUpdatedTooltipText = ref<string | null>(null)
  const loading = ref(false)

  let abortController: AbortController | null = null

  function applyLabels(trust: AttributionTrustAndRelevance | undefined): void {
    const labels = labelsFromTrust(trust)
    pageViewsLabel.value = labels.pageViewsLabel
    referenceCountLabel.value = labels.referenceCountLabel
    lastUpdatedLabel.value = labels.lastUpdatedLabel
    pageViewsTooltipText.value = labels.pageViewsTooltipText
    referenceCountTooltipText.value = labels.referenceCountTooltipText
    lastUpdatedTooltipText.value = labels.lastUpdatedTooltipText
  }

  async function load(pageTitle: string): Promise<void> {
    const trimmed = pageTitle.trim()
    if (!trimmed) {
      pageViewsLabel.value = null
      referenceCountLabel.value = null
      lastUpdatedLabel.value = null
      pageViewsTooltipText.value = null
      referenceCountTooltipText.value = null
      lastUpdatedTooltipText.value = null
      loading.value = false
      return
    }

    const cached = cache.get(trimmed)
    if (cached) {
      applyLabels(cached.trust)
      loading.value = false
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true

    try {
      const entry = await loadAttribution(trimmed, signal)
      if (signal.aborted) return
      applyLabels(entry.trust)
    } catch (err) {
      if (signal.aborted || (err instanceof AttributionApiError && err.code === 'aborted')) return
      pageViewsLabel.value = null
      referenceCountLabel.value = null
      lastUpdatedLabel.value = null
      pageViewsTooltipText.value = null
      referenceCountTooltipText.value = null
      lastUpdatedTooltipText.value = null
    } finally {
      if (!signal.aborted) {
        loading.value = false
      }
    }
  }

  watch(
    () => title.value,
    (nextTitle) => {
      void load(nextTitle)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    abortController?.abort()
  })

  const showSupporting = computed(() =>
    Boolean(pageViewsLabel.value || referenceCountLabel.value || lastUpdatedLabel.value),
  )

  return {
    pageViewsLabel,
    referenceCountLabel,
    lastUpdatedLabel,
    pageViewsTooltipText,
    referenceCountTooltipText,
    lastUpdatedTooltipText,
    loading,
    showSupporting,
  }
}
