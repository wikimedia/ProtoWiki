import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import {
  fetchMorelikeResultsBatched,
  fetchPagesMetadata,
  MorelikeFetchError,
  normalizeTitleKey,
  type MorelikeSearchHit,
} from '@/lib/fetchMorelike'
import { fetchGrowthTaskSignals } from '@/lib/fetchGrowthTaskSignals'
import { DEFAULT_MLT_CUSTOM } from '@/lib/morelikeMlt'

import { resolveTaskForSignals, type TaskColor } from './microtaskCatalog'

export interface Suggestion {
  title: string
  description: string
  thumbnailSrc?: string
  taskHeading: string
  taskDescription: string
  taskColor: TaskColor
}

export interface SuggestionsState {
  suggestions: Ref<Suggestion[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  count: ComputedRef<number>
}

export interface SuggestionSeedState {
  seeds: string[]
  /** Stable identity for cache hits — refetch only when this changes. */
  cacheKey: string
}

const RESULT_LIMIT = 20
const LANG = 'en'
const STORAGE_KEY = 'protowiki:no-distractions:suggestions'

interface StoredSuggestionsCache {
  cacheKey: string
  suggestions: Suggestion[]
  error: string | null
}

function readSuggestionsCache(cacheKey: string): StoredSuggestionsCache | null {
  if (typeof localStorage === 'undefined' || !cacheKey.length) return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSuggestionsCache
    if (parsed.cacheKey !== cacheKey || !Array.isArray(parsed.suggestions)) return null
    return parsed
  } catch {
    return null
  }
}

function writeSuggestionsCache(
  cacheKey: string,
  cachedSuggestions: Suggestion[],
  cachedError: string | null,
): void {
  if (typeof localStorage === 'undefined' || !cacheKey.length) return

  try {
    const payload: StoredSuggestionsCache = {
      cacheKey,
      suggestions: cachedSuggestions,
      error: cachedError,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota or privacy mode — ignore; in-memory cache still works this session.
  }
}

function clearSuggestionsCache(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}

let shared: SuggestionsState | null = null
let bindSeeds: ((getter: () => SuggestionSeedState) => void) | null = null

/** Stable key for comparing interest seed sets (order-insensitive). */
function seedsKey(seeds: string[]): string {
  return seeds
    .map((seed) => seed.trim())
    .filter(Boolean)
    .map(normalizeTitleKey)
    .sort()
    .join('\u0000')
}

/** Dedupe seeds for fetch while preserving picker order. */
function orderedSeeds(seeds: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of seeds) {
    const title = raw.trim()
    if (!title.length) continue
    const key = normalizeTitleKey(title)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(title)
  }
  return out
}

/**
 * Cache identity for suggestion fetches. When interests come from the URL param,
 * only the interest set matters. When they are implicit (seeded from the picked
 * article), include the title so a title change invalidates the cache.
 */
export function resolveSuggestionSeedState(
  interests: string[],
  title: string,
  hasExplicitInterests: boolean,
): SuggestionSeedState {
  const seeds = interests
  const seedKey = seedsKey(seeds)
  if (!seedKey.length) {
    return { seeds: [], cacheKey: '' }
  }
  const cacheKey = hasExplicitInterests
    ? `interests:${seedKey}`
    : `title:${normalizeTitleKey(title)}:${seedKey}`
  return { seeds, cacheKey }
}

function createState(): SuggestionsState {
  const suggestions = ref<Suggestion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const count = computed(() => suggestions.value.length)

  const seedStateGetterRef = ref<() => SuggestionSeedState>(() => ({
    seeds: [],
    cacheKey: '',
  }))
  let loadedCacheKey = ''
  let abortController: AbortController | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function hydrateFromStorage(cacheKey: string): boolean {
    const stored = readSuggestionsCache(cacheKey)
    if (!stored) return false

    suggestions.value = stored.suggestions
    error.value = stored.error
    loadedCacheKey = cacheKey
    loading.value = false
    return true
  }

  async function assignTasks(
    hits: MorelikeSearchHit[],
    signal: AbortSignal,
  ): Promise<Suggestion[]> {
    const signalsByTitle = await fetchGrowthTaskSignals(
      hits.map((hit) => hit.title),
      { lang: LANG, signal },
    )

    return hits.flatMap((hit) => {
      const task = resolveTaskForSignals(signalsByTitle.get(normalizeTitleKey(hit.title)))
      if (!task) return []

      return [
        {
          title: hit.title,
          description: hit.description || 'No description available.',
          thumbnailSrc: hit.thumbnail?.url,
          taskHeading: task.heading,
          taskDescription: task.description,
          taskColor: task.color,
        },
      ]
    })
  }

  async function runFetch(seeds: string[], fetchCacheKey: string): Promise<void> {
    abortController?.abort()

    if (!seeds.length) {
      suggestions.value = []
      error.value = null
      loadedCacheKey = ''
      loading.value = false
      clearSuggestionsCache()
      return
    }

    abortController = new AbortController()
    const signal = abortController.signal
    loading.value = true
    error.value = null

    try {
      const ordered = orderedSeeds(seeds)

      // Show the interest pages themselves (first), then interleaved morelike hits.
      const relatedLimit = Math.max(1, RESULT_LIMIT - ordered.length)
      const [seedHits, relatedHits] = await Promise.all([
        fetchPagesMetadata(ordered, { lang: LANG, signal }).catch(() => [] as MorelikeSearchHit[]),
        fetchMorelikeResultsBatched(ordered, {
          limit: relatedLimit,
          mltPreset: 'default',
          mltCustom: DEFAULT_MLT_CUSTOM,
          lang: LANG,
          signal,
          maxCalls: 3,
        }),
      ])

      const merged: MorelikeSearchHit[] = []
      const seen = new Set<string>()
      for (const hit of [...seedHits, ...relatedHits]) {
        const key = normalizeTitleKey(hit.title)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(hit)
        if (merged.length >= RESULT_LIMIT) break
      }

      const assigned = await assignTasks(merged, signal)
      if (signal.aborted) return
      // Drop stale responses when interests/title changed mid-flight.
      if (fetchCacheKey !== seedStateGetterRef.value().cacheKey) return
      suggestions.value = assigned
      loadedCacheKey = fetchCacheKey
      writeSuggestionsCache(fetchCacheKey, assigned, null)
    } catch (fetchError) {
      if (fetchError instanceof MorelikeFetchError && fetchError.code === 'aborted') return
      if ((fetchError as Error).name === 'AbortError') return
      if (fetchCacheKey !== seedStateGetterRef.value().cacheKey) return
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Could not load suggestions.'
      suggestions.value = []
      loadedCacheKey = fetchCacheKey
    } finally {
      if (!signal.aborted && fetchCacheKey === seedStateGetterRef.value().cacheKey) {
        loading.value = false
      }
    }
  }

  function scheduleFetch(cacheKey: string): void {
    if (cacheKey === loadedCacheKey) return
    if (cacheKey.length && hydrateFromStorage(cacheKey)) return

    if (debounceTimer) clearTimeout(debounceTimer)
    suggestions.value = []
    error.value = null
    loading.value = cacheKey.length > 0

    debounceTimer = setTimeout(() => {
      const { seeds, cacheKey: currentKey } = seedStateGetterRef.value()
      if (currentKey !== cacheKey) return
      void runFetch(seeds, currentKey)
    }, 400)
  }

  watch(
    () => seedStateGetterRef.value().cacheKey,
    (cacheKey) => scheduleFetch(cacheKey),
  )

  bindSeeds = (getter: () => SuggestionSeedState) => {
    seedStateGetterRef.value = getter
    const { cacheKey } = getter()
    if (cacheKey === loadedCacheKey) {
      loading.value = false
      return
    }
    if (cacheKey.length && hydrateFromStorage(cacheKey)) return
    scheduleFetch(cacheKey)
  }

  return { suggestions, loading, error, count }
}

/**
 * Suggested edits seeded by morelike (similar articles) + Growth newcomer task
 * types (via cirrusdoc). Shared singleton so the home and all-suggestions screens
 * reuse one fetch when the cache key is unchanged. Results persist in
 * localStorage keyed by interests (or title when interests are implicit) so a
 * full page reload does not refetch unless that key changes.
 *
 * Pass a seed-state getter once from the route shell; child screens call
 * `useSuggestions()` with no args to read the shared cache.
 */
export function useSuggestions(
  seedState?: () => SuggestionSeedState,
): SuggestionsState {
  if (!shared) shared = createState()
  if (seedState) bindSeeds?.(seedState)
  return shared
}
