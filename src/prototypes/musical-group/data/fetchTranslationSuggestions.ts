import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { listBookmarks } from './bookmarks'
import { bookmarksKey, utcDayKey } from './cacheKeys'
import { enwikiArticleUrl } from './enwikiTitle'
import {
  getCachedSavedSummaries,
  getCachedTranslationSuggestions,
  setCachedTranslationSuggestions,
} from './homeTabCache'
import { getCachedMusicalGroup } from './musicalGroupCache'
import { fetchSavedItemSummaries } from './fetchSavedItemSummaries'
import { fetchPageSummary } from './pageSummary'
import type { HomeSavedItem, HomeTranslationSuggestion } from './types'

const TRANSLATION_API =
  'https://api.wikimedia.org/service/lw/recommendation/api/v1/translation'
const DEFAULT_SOURCE_LANG = 'en'
const SUMMARY_CONCURRENCY = 3
/** Ask the API for extra candidates so a sparse seeded response can still fill the module. */
const API_COUNT_BUFFER = 4
const MIN_API_COUNT = 12
/** Bump when cache key shape or seeding logic changes (invalidates stale entries). */
const TRANSLATION_CACHE_VERSION = 2

let sessionCached: { key: string; value: HomeTranslationSuggestion[] } | null = null

interface TranslationRecommendation {
  title?: string
}

interface TranslationApiResponse {
  recommendations?: TranslationRecommendation[]
}

const languageDisplayNames =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : null

function targetLanguageLabel(code: string): string {
  const normalized = code.trim().toLowerCase()
  const label = languageDisplayNames?.of(normalized)
  if (label && label !== normalized) return label
  return normalized.toUpperCase()
}

function translationUrl(sourceLang: string, targetLang: string, title: string): string {
  const page = title.replace(/ /g, '_')
  const params = new URLSearchParams({
    from: sourceLang,
    to: targetLang,
    page,
  })
  return `${enwikiArticleUrl('Special:ContentTranslation')}?${params.toString()}`
}

function addSeedTitle(seen: Set<string>, seeds: string[], title: string | undefined): void {
  const trimmed = title?.trim()
  if (!trimmed || seen.has(trimmed.toLowerCase())) return
  seen.add(trimmed.toLowerCase())
  seeds.push(trimmed)
}

function translationCacheKey(targetLangs: string[]): string {
  const bookmarkIds = listBookmarks()
    .map((entry) => entry.id)
    .sort()
    .join(',')
  return `${TRANSLATION_CACHE_VERSION}:${utcDayKey()}:${targetLangs.join(',')}:${bookmarkIds}`
}

function addSeedTitlesFromSavedItems(
  seen: Set<string>,
  seeds: string[],
  items: HomeSavedItem[],
): void {
  for (const item of items) {
    addSeedTitle(seen, seeds, item.enwikiTitle)
  }
}

/** Article titles to seed the recommendation API (never QIDs — those return empty). */
function collectSeedTitlesFromCache(): string[] {
  const seen = new Set<string>()
  const seeds: string[] = []

  const cachedSaved = getCachedSavedSummaries(bookmarksKey())
  if (cachedSaved) {
    addSeedTitlesFromSavedItems(seen, seeds, cachedSaved)
  }

  for (const entry of listBookmarks()) {
    const cached = getCachedMusicalGroup(entry.id)
    addSeedTitle(seen, seeds, cached?.data.enwikiTitle)
  }

  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seeds[i], seeds[j]] = [seeds[j], seeds[i]]
  }

  return seeds
}

/** Resolve enwiki titles from saved pages to seed translation recommendations. */
export async function resolveTranslationSeedTitles(signal?: AbortSignal): Promise<string[]> {
  const seeds = collectSeedTitlesFromCache()
  if (seeds.length || !listBookmarks().length) return seeds

  try {
    const items = await fetchSavedItemSummaries(listBookmarks(), signal)
    const seen = new Set<string>()
    const resolved: string[] = []
    addSeedTitlesFromSavedItems(seen, resolved, items)
    return resolved
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return seeds
  }
}

async function requestRecommendations(
  targetLang: string,
  count: number,
  signal: AbortSignal | undefined,
  seed?: string,
): Promise<TranslationRecommendation[]> {
  const params = new URLSearchParams({
    source: DEFAULT_SOURCE_LANG,
    target: targetLang,
    count: String(count),
    include_pageviews: 'true',
  })
  if (seed) params.set('seed', seed)

  const response = await fetchWikimedia(`${TRANSLATION_API}?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-translation'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as TranslationApiResponse
  return json.recommendations ?? []
}

async function fetchRecommendationsForLanguage(
  targetLang: string,
  count: number,
  signal?: AbortSignal,
  seedTitles: string[] = [],
): Promise<TranslationRecommendation[]> {
  const requestCount = Math.max(count * API_COUNT_BUFFER, MIN_API_COUNT)

  for (const seed of seedTitles) {
    const seeded = await requestRecommendations(targetLang, requestCount, signal, seed)
    if (seeded.length) return seeded
  }

  return requestRecommendations(targetLang, requestCount, signal)
}

async function enrichRecommendation(
  title: string,
  targetLang: string,
  signal?: AbortSignal,
): Promise<HomeTranslationSuggestion | null> {
  const summary = await fetchPageSummary(title, signal, 'wikita-lite-translation-summary')
  const displayTitle = summary?.normalizedtitle ?? summary?.title ?? title

  return {
    id: `${targetLang}:${displayTitle}`,
    title: displayTitle,
    description: summary?.description ?? '',
    thumbnailUrl: summary?.thumbnail?.source,
    enwikiTitle: title,
    sourceLang: DEFAULT_SOURCE_LANG,
    targetLang,
    targetLanguageLabel: targetLanguageLabel(targetLang),
    translationUrl: translationUrl(DEFAULT_SOURCE_LANG, targetLang, title),
  }
}

export function clearTranslationSuggestionsSessionCache(): void {
  sessionCached = null
}

export function translationSuggestionsCacheKey(targetLangs: string[]): string {
  return translationCacheKey(targetLangs)
}

/** Translation suggestions for one or more target languages. */
export async function fetchTranslationSuggestions(
  targetLangs: string[],
  signal?: AbortSignal,
  countPerLanguage = 2,
): Promise<HomeTranslationSuggestion[]> {
  const normalizedLangs = targetLangs.map((lang) => lang.trim().toLowerCase()).filter(Boolean)
  if (!normalizedLangs.length) return []

  const cacheKey = translationCacheKey(normalizedLangs)
  if (sessionCached?.key === cacheKey) {
    return sessionCached.value
  }

  const stored = getCachedTranslationSuggestions(cacheKey)
  if (stored?.length) {
    sessionCached = { key: cacheKey, value: stored }
    return stored
  }

  const seedTitles = await resolveTranslationSeedTitles(signal)
  const suggestions: HomeTranslationSuggestion[] = []
  const seen = new Set<string>()

  for (const targetLang of normalizedLangs) {
    const recommendations = await fetchRecommendationsForLanguage(
      targetLang,
      countPerLanguage,
      signal,
      seedTitles,
    )

    const titles = recommendations
      .map((item) => item.title?.trim())
      .filter((title): title is string => Boolean(title))
      .filter((title) => {
        const key = `${targetLang}:${title.toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

    const enriched = await mapWithConcurrency(
      titles,
      SUMMARY_CONCURRENCY,
      async (title) => enrichRecommendation(title, targetLang, signal),
    )

    let addedForLang = 0
    for (const item of enriched) {
      if (!item) continue
      suggestions.push(item)
      addedForLang++
      if (addedForLang >= countPerLanguage) break
    }
  }

  if (suggestions.length) {
    setCachedTranslationSuggestions(cacheKey, suggestions)
    sessionCached = { key: cacheKey, value: suggestions }
  }

  return suggestions
}

export interface TranslationSuggestionsFeed {
  cacheKey: string
  targetLangs: string[]
  items: HomeTranslationSuggestion[]
  seen: Set<string>
  pending: Array<{ title: string; targetLang: string }>
  seedTitles: string[]
  nextSeedIndex: number
  nextLangIndex: number
  refillAttempts: number
  exhausted: boolean
}

const MAX_REFILL_ATTEMPTS = 12

function trackSuggestion(feed: TranslationSuggestionsFeed, item: HomeTranslationSuggestion): void {
  feed.seen.add(`${item.targetLang}:${item.title.toLowerCase()}`)
}

export function createTranslationSuggestionsFeed(
  targetLangs: string[],
  initialItems: HomeTranslationSuggestion[] = [],
  seedTitles: string[] = [],
): TranslationSuggestionsFeed {
  const normalizedLangs = targetLangs.map((lang) => lang.trim().toLowerCase()).filter(Boolean)
  const feed: TranslationSuggestionsFeed = {
    cacheKey: translationCacheKey(normalizedLangs),
    targetLangs: normalizedLangs,
    items: [...initialItems],
    seen: new Set<string>(),
    pending: [],
    seedTitles,
    nextSeedIndex: 0,
    nextLangIndex: 0,
    refillAttempts: 0,
    exhausted: normalizedLangs.length === 0,
  }

  for (const item of initialItems) {
    trackSuggestion(feed, item)
  }

  return feed
}

export function persistTranslationSuggestionsFeed(feed: TranslationSuggestionsFeed): void {
  if (!feed.items.length) return
  setCachedTranslationSuggestions(feed.cacheKey, feed.items)
  sessionCached = { key: feed.cacheKey, value: feed.items }
}

async function refillTranslationPending(
  feed: TranslationSuggestionsFeed,
  signal?: AbortSignal,
): Promise<boolean> {
  if (feed.exhausted || !feed.targetLangs.length) return false

  const targetLang = feed.targetLangs[feed.nextLangIndex % feed.targetLangs.length]
  feed.nextLangIndex += 1

  const seeds = feed.seedTitles.length
    ? [
        feed.seedTitles[feed.nextSeedIndex % feed.seedTitles.length],
        ...feed.seedTitles.filter(
          (_, index) => index !== feed.nextSeedIndex % feed.seedTitles.length,
        ),
      ]
    : []

  if (feed.seedTitles.length) {
    feed.nextSeedIndex = (feed.nextSeedIndex + 1) % feed.seedTitles.length
  }

  feed.refillAttempts += 1

  const recommendations = await fetchRecommendationsForLanguage(
    targetLang,
    MIN_API_COUNT,
    signal,
    seeds,
  )

  let added = 0
  for (const recommendation of recommendations) {
    const title = recommendation.title?.trim()
    if (!title) continue

    const key = `${targetLang}:${title.toLowerCase()}`
    if (feed.seen.has(key)) continue

    feed.seen.add(key)
    feed.pending.push({ title, targetLang })
    added++
  }

  if (!added && feed.refillAttempts >= MAX_REFILL_ATTEMPTS) {
    feed.exhausted = true
  }

  return added > 0
}

/** Resolve and append the next translation suggestion, one card at a time. */
export async function loadNextTranslationSuggestion(
  feed: TranslationSuggestionsFeed,
  signal?: AbortSignal,
): Promise<HomeTranslationSuggestion | null> {
  if (feed.exhausted) return null

  while (!feed.pending.length) {
    const refilled = await refillTranslationPending(feed, signal)
    if (!refilled) {
      feed.exhausted = true
      return null
    }
  }

  while (feed.pending.length) {
    const next = feed.pending.shift()
    if (!next) return null

    const enriched = await enrichRecommendation(next.title, next.targetLang, signal)
    if (!enriched) continue

    trackSuggestion(feed, enriched)
    feed.items.push(enriched)
    persistTranslationSuggestionsFeed(feed)
    return enriched
  }

  feed.exhausted = true
  return null
}
