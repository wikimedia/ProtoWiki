import { ref } from 'vue'

import { fetchWikitabNearbyArticles } from './data/fetchWikitabNearby'
import {
  buildNearbyCoordKey,
  clearAllCachedNearby,
  clearCachedNearby,
  isCacheBypassed,
  isNearbyCacheFresh,
  readCachedNearby,
  type CachedNearby,
  writeCachedNearby,
} from './data/nearbyCache'
import { fetchWikitabPageSummary } from './data/fetchWikitabPageSummary'
import {
  loadNearbyLastCoord,
  persistNearbyLastCoord,
  type WikitabNearbyLastCoord,
} from './data/wikitabConfig'
import { WIKITAB_LANGUAGE } from './data/wikitabLanguage'
import {
  WIKITAB_NEARBY_MODULE_SPEC,
  type WikitabCardData,
  type WikitabCardLoading,
} from './sections'

const { initialCount } = WIKITAB_NEARBY_MODULE_SPEC

export type WikitabNearbyConsentPhase = 'prompt' | 'locating' | 'loading' | 'ready'

function cardPageid(card: WikitabCardData): number | null {
  const match = card.key.match(/^nearby:(\d+)$/)
  return match ? Number(match[1]) : null
}

function readStoredCoord(): WikitabNearbyLastCoord | null {
  return loadNearbyLastCoord()
}

function requestBrowserPosition(signal: AbortSignal): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unavailable'))
      return
    }

    const onAbort = (): void => {
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        signal.removeEventListener('abort', onAbort)
        resolve(position.coords)
      },
      (err) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    )
  })
}

function geolocationErrorMessage(error: unknown): string {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Location access was denied. Allow location to see nearby articles.'
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'Your location could not be determined.'
    }
    if (error.code === error.TIMEOUT) {
      return 'Finding your location timed out.'
    }
  }
  if (error instanceof Error && error.message === 'unavailable') {
    return 'Location is not available in this browser.'
  }
  return 'Could not get your location.'
}

/**
 * Featured-style: warm localStorage paints complete cards on first tick.
 * Most page opens never hit the network — only TTL expiry / force / first opt-in.
 */
export function useWikitabNearby() {
  const initialStoredCoord = readStoredCoord()
  const initialCached =
    initialStoredCoord && !isCacheBypassed()
      ? readCachedNearby(WIKITAB_LANGUAGE, initialStoredCoord)
      : null

  const items = ref<WikitabCardData[]>(initialCached?.items ?? [])
  const pendingByKey = ref(new Map<string, WikitabCardLoading>())
  const consentPhase = ref<WikitabNearbyConsentPhase>(
    initialCached?.items.length
      ? 'ready'
      : initialStoredCoord
        ? 'loading'
        : 'prompt',
  )
  const promptError = ref<string | null>(null)
  const loading = ref(false)
  const fillingInitial = ref(false)
  const loadingMore = ref(false)
  /*
   * Nearby loads the full geosearch page in one request (`loadMore` is a no-op).
   * `hasMore` only means "still short of the initial grid" so the section can
   * top up — never "fetch another page". Extra buffered cards are revealed
   * client-side via `reserved` vs `items.length`.
   */
  const hasMore = ref(
    initialCached ? initialCached.items.length > 0 && initialCached.items.length < initialCount : false,
  )
  const error = ref<string | null>(null)
  const hasActivated = ref(Boolean(initialCached?.items.length || initialStoredCoord))

  let controller: AbortController | null = null
  let activeCoord: WikitabNearbyLastCoord | null = initialStoredCoord
  let loadedCoordKey: string | null = initialCached
    ? buildNearbyCoordKey(initialStoredCoord!)
    : null
  /** Preserve fetchedAt when rewriting cache after summary enrichment. */
  let cacheFetchedAt: number | null = initialCached?.fetchedAt ?? null
  let staleRefreshInFlight = false
  let enrichGeneration = 0

  function persistItems(cards: WikitabCardData[] = items.value): void {
    if (!activeCoord) return
    const fetchedAt = cacheFetchedAt ?? Date.now()
    writeCachedNearby(WIKITAB_LANGUAGE, activeCoord, cards, false, fetchedAt)
  }

  function setPending(key: string, loadingState: WikitabCardLoading): void {
    const next = new Map(pendingByKey.value)
    if (loadingState) next.set(key, loadingState)
    else next.delete(key)
    pendingByKey.value = next
  }

  function patchCard(pageid: number, patch: Partial<WikitabCardData>): void {
    items.value = items.value.map((card) => {
      if (cardPageid(card) !== pageid) return card
      return { ...card, ...patch }
    })
  }

  async function enrichCards(
    cards: WikitabCardData[],
    signal: AbortSignal,
  ): Promise<WikitabCardData[]> {
    const generation = ++enrichGeneration
    const needsWork = cards.filter((card) => !card.thumbnailUrl || !card.description)
    if (!needsWork.length) return cards

    await Promise.all(
      needsWork.map(async (card) => {
        const title = card.title
        const pageid = cardPageid(card)
        if (!title || pageid === null) return

        const needsThumbnail = !card.thumbnailUrl
        const needsDescription = !card.description

        setPending(card.key, {
          ...(needsThumbnail ? { thumbnail: true } : {}),
          ...(needsDescription ? { description: true } : {}),
        })

        try {
          const summary = await fetchWikitabPageSummary(title, signal, 'wikitab-nearby-summary')
          if (signal.aborted || generation !== enrichGeneration || !summary) return

          const patch: Partial<WikitabCardData> = {}
          if (needsThumbnail && summary.thumbnailUrl) patch.thumbnailUrl = summary.thumbnailUrl
          if (needsDescription && summary.description) patch.description = summary.description
          if (Object.keys(patch).length) patchCard(pageid, patch)
        } catch (cause) {
          if (signal.aborted || (cause as Error)?.name === 'AbortError') return
        } finally {
          if (!signal.aborted && generation === enrichGeneration) {
            setPending(card.key, false)
          }
        }
      }),
    )

    return items.value
  }

  function paintFromCache(cached: CachedNearby, coord: WikitabNearbyLastCoord): void {
    items.value = cached.items
    hasMore.value = cached.items.length > 0 && cached.items.length < initialCount
    consentPhase.value = 'ready'
    hasActivated.value = true
    promptError.value = null
    error.value = null
    loading.value = false
    fillingInitial.value = false
    pendingByKey.value = new Map()
    activeCoord = coord
    loadedCoordKey = buildNearbyCoordKey(coord)
    cacheFetchedAt = cached.fetchedAt
  }

  async function fetchArticlesForCoord(
    coord: WikitabNearbyLastCoord,
    signal: AbortSignal,
    options?: { background?: boolean },
  ): Promise<void> {
    const background = options?.background === true
    activeCoord = coord

    if (!background) {
      loading.value = true
      fillingInitial.value = true
      if (items.value.length === 0) {
        consentPhase.value = 'loading'
        error.value = null
        pendingByKey.value = new Map()
        hasMore.value = false
      } else {
        error.value = null
      }
    }

    try {
      const cards = await fetchWikitabNearbyArticles(coord.lat, coord.lon, signal)
      if (signal.aborted) return

      if (!cards.length) {
        if (background) return
        error.value = 'No nearby articles found.'
        consentPhase.value = 'prompt'
        promptError.value = error.value
        items.value = []
        return
      }

      items.value = cards
      hasMore.value = cards.length > 0 && cards.length < initialCount
      consentPhase.value = 'ready'
      hasActivated.value = true
      promptError.value = null
      error.value = null
      loadedCoordKey = buildNearbyCoordKey(coord)
      cacheFetchedAt = Date.now()
      // Persist shell cards immediately so a reload mid-enrich still paints titles.
      persistItems(cards)

      if (!background) {
        loading.value = false
        fillingInitial.value = false
      }

      // Enrich then rewrite localStorage with full description/thumbnail payloads.
      await enrichCards(cards, signal)
      if (signal.aborted) return
      persistItems()
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return
      if (background) return
      error.value = 'Could not load nearby articles.'
      if (!items.value.length) {
        consentPhase.value = 'prompt'
        promptError.value = error.value
      }
    } finally {
      if (!signal.aborted && !background) {
        loading.value = false
        fillingInitial.value = false
      }
    }
  }

  function scheduleStaleRefresh(coord: WikitabNearbyLastCoord): void {
    if (staleRefreshInFlight) return
    staleRefreshInFlight = true

    const local = new AbortController()
    controller = local

    void fetchArticlesForCoord(coord, local.signal, { background: true }).finally(() => {
      if (controller === local) {
        staleRefreshInFlight = false
        controller = null
      }
    })
  }

  /**
   * Home-load entry. Warm fresh cache → no network. Stale cache → keep painted
   * cards and refresh quietly in the background. Miss → foreground fetch.
   */
  async function refresh(options?: { force?: boolean }): Promise<void> {
    const stored = readStoredCoord()
    if (!stored) {
      consentPhase.value = 'prompt'
      loadedCoordKey = null
      activeCoord = null
      return
    }

    activeCoord = stored
    const force = options?.force === true
    const coordKey = buildNearbyCoordKey(stored)

    if (force) {
      controller?.abort()
      clearCachedNearby(WIKITAB_LANGUAGE)
      cacheFetchedAt = null
      loadedCoordKey = null
      items.value = []
      pendingByKey.value = new Map()
      const local = new AbortController()
      controller = local
      await fetchArticlesForCoord(stored, local.signal)
      return
    }

    if (isCacheBypassed()) {
      controller?.abort()
      const local = new AbortController()
      controller = local
      await fetchArticlesForCoord(stored, local.signal)
      return
    }

    // Already painted for this location — most revisits / ordered-load passes.
    if (loadedCoordKey === coordKey && items.value.length > 0) {
      error.value = null
      consentPhase.value = 'ready'
      const cached = readCachedNearby(WIKITAB_LANGUAGE, stored)
      if (cached && !isNearbyCacheFresh(cached.fetchedAt)) {
        scheduleStaleRefresh(stored)
      }
      return
    }

    const cached = readCachedNearby(WIKITAB_LANGUAGE, stored)
    if (cached?.items.length) {
      paintFromCache(cached, stored)
      // Complete cards from storage — do not re-backfill. Network only if TTL expired.
      if (!isNearbyCacheFresh(cached.fetchedAt)) {
        scheduleStaleRefresh(stored)
      }
      return
    }

    controller?.abort()
    const local = new AbortController()
    controller = local
    await fetchArticlesForCoord(stored, local.signal)
  }

  async function requestNearby(): Promise<void> {
    promptError.value = null
    consentPhase.value = 'locating'

    controller?.abort()
    const local = new AbortController()
    controller = local
    const { signal } = local

    try {
      const coords = await requestBrowserPosition(signal)
      if (signal.aborted) return

      const stored: WikitabNearbyLastCoord = {
        lat: coords.latitude,
        lon: coords.longitude,
        updatedAt: Date.now(),
      }
      persistNearbyLastCoord(stored)
      clearCachedNearby(WIKITAB_LANGUAGE)
      cacheFetchedAt = null
      loadedCoordKey = null
      await fetchArticlesForCoord(stored, signal)
    } catch (cause) {
      if (signal.aborted || (cause as Error)?.name === 'AbortError') return

      if (cause instanceof GeolocationPositionError && cause.code === cause.PERMISSION_DENIED) {
        persistNearbyLastCoord(null)
        clearAllCachedNearby()
        loadedCoordKey = null
        activeCoord = null
      }

      promptError.value = geolocationErrorMessage(cause)
      consentPhase.value = 'prompt'
      loading.value = false
      fillingInitial.value = false
    }
  }

  /** Nearby has no paged API — the section reveals from the in-memory list only. */
  async function loadMore(): Promise<void> {
    loadingMore.value = false
    hasMore.value = items.value.length > 0 && items.value.length < initialCount
  }

  function abort(): void {
    controller?.abort()
    enrichGeneration++
    pendingByKey.value = new Map()
    loading.value = false
    fillingInitial.value = false
    loadingMore.value = false
    staleRefreshInFlight = false
  }

  return {
    items,
    pendingByKey,
    consentPhase,
    promptError,
    loading,
    fillingInitial,
    loadingMore,
    hasMore,
    error,
    hasActivated,
    refresh,
    requestNearby,
    loadMore,
    abort,
  }
}
