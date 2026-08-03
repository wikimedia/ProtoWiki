import { loadConfig, wikimediaApiFetchHeaders } from '@/config'

import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { listBookmarks } from './bookmarks'
import { utcDayKey } from './cacheKeys'
import { enwikiArticleUrl } from './enwikiTitle'
import {
  getCachedTranslationSuggestions,
  setCachedTranslationSuggestions,
} from './homeTabCache'
import { getCachedMusicalGroup } from './musicalGroupCache'
import { fetchPageSummary } from './pageSummary'
import type { HomeTranslationSuggestion } from './types'

const TRANSLATION_API =
  'https://api.wikimedia.org/service/lw/recommendation/api/v1/translation'
const DEFAULT_SOURCE_LANG = 'en'
const SUMMARY_CONCURRENCY = 3
/** Ask the API for extra candidates so a sparse seeded response can still fill the module. */
const API_COUNT_BUFFER = 4
const MIN_API_COUNT = 12

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

function translationCacheKey(targetLangs: string[]): string {
  return `${utcDayKey()}:${targetLangs.join(',')}`
}

function addSeedTitle(seen: Set<string>, seeds: string[], title: string | undefined): void {
  const trimmed = title?.trim()
  if (!trimmed || seen.has(trimmed.toLowerCase())) return
  seen.add(trimmed.toLowerCase())
  seeds.push(trimmed)
}

/** Article titles to seed the recommendation API (never QIDs — those return empty). */
function collectSeedTitles(): string[] {
  const seen = new Set<string>()
  const seeds: string[] = []

  for (const entry of listBookmarks()) {
    const cached = getCachedMusicalGroup(entry.id)
    addSeedTitle(seen, seeds, cached?.data.enwikiTitle)
  }

  const config = loadConfig()
  const lists = config.userPageLists[config.user]
  for (const title of [...lists.readingList, ...lists.editedPages, ...lists.watchlist]) {
    addSeedTitle(seen, seeds, title)
  }

  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seeds[i], seeds[j]] = [seeds[j], seeds[i]]
  }

  return seeds
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

  const seedTitles = collectSeedTitles()
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
