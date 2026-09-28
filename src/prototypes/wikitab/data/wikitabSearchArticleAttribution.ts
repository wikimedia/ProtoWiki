import { fetchAttributionSignals } from '@/components/attribution/fetchAttributionSignals'
import { AttributionApiError, type AttributionTrustAndRelevance } from '@/components/attribution/types'

interface CachedAttribution {
  trust: AttributionTrustAndRelevance | undefined
}

const cache = new Map<string, CachedAttribution>()
const inflight = new Map<string, Promise<CachedAttribution>>()

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

/** Synchronous cache peek — `null` when not yet loaded. */
export function peekCachedSearchArticleAttribution(
  title: string,
): AttributionTrustAndRelevance | undefined | null {
  const trimmed = title.trim()
  if (!trimmed) return null
  const cached = cache.get(trimmed)
  if (!cached) return null
  return cached.trust
}

/** Shared cache loader for search result cards. */
export async function fetchSearchArticleAttributionTrust(
  title: string,
  signal: AbortSignal,
): Promise<AttributionTrustAndRelevance | undefined> {
  try {
    const entry = await loadAttribution(title.trim(), signal)
    return entry.trust
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    if (err instanceof AttributionApiError && err.code === 'aborted') throw err
    return undefined
  }
}
