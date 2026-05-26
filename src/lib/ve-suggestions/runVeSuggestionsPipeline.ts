import { FakeWiki, FakeWikiHttpError } from 'fakewiki'

import {
  buildFallbackCard,
  buildSectionRanges,
  buildSectionTitleMap,
  buildSuggestionCard,
  hydrateCardsFromSnippetCache,
  hydrateCardDescriptionParts,
  isEligibleSuggestion,
  isEligibleSuggestionCard,
  sortCards,
  type SuggestionCardData,
} from './veSuggestionCards'
import { VE_METHOD_COUNT, VE_METHODS } from './veMethods'
import {
  getCachedRun,
  normalizePageTitle,
  setCachedRun,
  type CachedMethodResult,
  type CachedVeSuggestionsRun,
} from './veSuggestionsCache'

export interface VeSuggestionsPipelineProgress {
  completed: number
  total: number
}

export interface VeSuggestionsPipelineResult {
  pageTitle: string
  cards: SuggestionCardData[]
  methodErrors: Array<{ methodName: string; message: string }>
  fromCache: boolean
  fetchedAt?: number
  error: string | null
}

export interface RunVeSuggestionsPipelineOptions {
  forceRefresh?: boolean
  onProgress?: (progress: VeSuggestionsPipelineProgress) => void
  /** Stop after collecting this many suggestions (skips remaining VE methods). */
  maxSuggestions?: number
  /** Suggestion types to ignore when counting toward `maxSuggestions`. */
  excludeSuggestionTypes?: string[]
}

import { wikiBaseUrlFromLang } from '@/lib/config'

const DEFAULT_API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) ve-suggestions'

export function createVeSuggestionsWiki(lang = 'en', apiUserAgentSuffix?: string): FakeWiki {
  const suffix = apiUserAgentSuffix?.trim()
  return new FakeWiki(wikiBaseUrlFromLang(lang), {
    apiUserAgent: suffix ? `${DEFAULT_API_USER_AGENT} ${suffix}` : DEFAULT_API_USER_AGENT,
  })
}

function wrapGetPageSource(
  wiki: FakeWiki,
  prefetchedByTitle: Map<string, string>,
): () => void {
  const original = wiki.getPageSource.bind(wiki)

  wiki.getPageSource = async (pageName: string): Promise<string> => {
    const key = normalizePageTitle(pageName)
    const cached = prefetchedByTitle.get(key)
    if (cached !== undefined) return cached
    const source = await original(pageName)
    prefetchedByTitle.set(key, source)
    return source
  }

  return () => {
    wiki.getPageSource = original
  }
}

export function cardsFromMethodResults(
  wiki: FakeWiki,
  pageTitle: string,
  methodResults: Record<string, CachedMethodResult>,
  snippetHtmlByKey: Record<string, string>,
  pageSource?: string,
): SuggestionCardData[] {
  const cards: SuggestionCardData[] = []

  for (const method of VE_METHODS) {
    const result = methodResults[method.methodName]
    if (!result || result.ok === false) continue
    const response = result.response
    for (let index = 0; index < response.suggestions.length; index++) {
      const suggestion = response.suggestions[index]
      if (!suggestion) continue
      if (!isEligibleSuggestion(response, suggestion)) continue
      cards.push(
        buildFallbackCard(
          wiki,
          method.methodName,
          pageTitle,
          response,
          suggestion,
          index,
          snippetHtmlByKey,
          pageSource,
        ),
      )
    }
  }

  return sortCards(cards)
}

export function methodErrorsFromResults(
  methodResults: Record<string, CachedMethodResult>,
): Array<{ methodName: string; message: string }> {
  const methodErrors: Array<{ methodName: string; message: string }> = []
  for (const method of VE_METHODS) {
    const result = methodResults[method.methodName]
    if (result?.ok === false) {
      methodErrors.push({ methodName: method.methodName, message: result.error })
    }
  }
  return methodErrors
}

export function cardsFromCachedRun(
  wiki: FakeWiki,
  run: CachedVeSuggestionsRun,
): SuggestionCardData[] {
  const snippetHtmlByKey = run.snippetHtmlByKey ?? {}
  if (run.cards?.length) {
    return sortCards(
      hydrateCardsFromSnippetCache(run.cards, run.pageTitle, snippetHtmlByKey)
        .map((card) => hydrateCardDescriptionParts(card, wiki))
        .filter(isEligibleSuggestionCard),
    )
  }
  return cardsFromMethodResults(wiki, run.pageTitle, run.methodResults, snippetHtmlByKey, run.pageSource)
}

export async function runVeSuggestionsPipeline(
  wiki: FakeWiki,
  pageTitle: string,
  options: RunVeSuggestionsPipelineOptions = {},
): Promise<VeSuggestionsPipelineResult> {
  const trimmed = normalizePageTitle(pageTitle)
  if (!trimmed.length) {
    return {
      pageTitle: trimmed,
      cards: [],
      methodErrors: [],
      fromCache: false,
      error: 'Please enter a page title.',
    }
  }

  const forceRefresh = options.forceRefresh ?? false

  if (!forceRefresh) {
    const cached = getCachedRun(trimmed)
    if (cached) {
      return {
        pageTitle: trimmed,
        cards: cardsFromCachedRun(wiki, cached),
        methodErrors: methodErrorsFromResults(cached.methodResults),
        fromCache: true,
        fetchedAt: cached.fetchedAt,
        error: null,
      }
    }
  }

  const existingCache = getCachedRun(trimmed)
  const run: CachedVeSuggestionsRun = {
    fetchedAt: Date.now(),
    pageTitle: trimmed,
    pageSource: existingCache?.pageSource,
    methodResults: forceRefresh ? {} : { ...(existingCache?.methodResults ?? {}) },
    cards: [],
    snippetHtmlByKey: forceRefresh ? {} : { ...(existingCache?.snippetHtmlByKey ?? {}) },
  }

  const pageSourceCache = new Map<string, string>()
  if (run.pageSource) {
    pageSourceCache.set(trimmed, run.pageSource)
  }

  const restoreGetPageSource = wrapGetPageSource(wiki, pageSourceCache)
  let error: string | null = null

  try {
    if (!run.pageSource) {
      try {
        run.pageSource = await wiki.getPageSource(trimmed)
        pageSourceCache.set(trimmed, run.pageSource)
        setCachedRun(trimmed, { ...run })
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught)
        return {
          pageTitle: trimmed,
          cards: [],
          methodErrors: [],
          fromCache: false,
          error: `Could not load page source: ${message}`,
        }
      }
    }

    const sectionTitleMap = buildSectionTitleMap(run.pageSource)
    const sectionRanges = buildSectionRanges(run.pageSource)
    const snippetHtmlCache = run.snippetHtmlByKey ?? {}
    const maxSuggestions = options.maxSuggestions
    const excludedTypes = new Set(options.excludeSuggestionTypes ?? [])
    const methods =
      maxSuggestions != null && maxSuggestions > 0 ?
        [...VE_METHODS].sort(() => Math.random() - 0.5)
      : VE_METHODS

    let completed = 0
    let abortedForRateLimit = false
    let eligibleSuggestionCount = 0

    for (const method of methods) {
      if (abortedForRateLimit) break
      if (maxSuggestions != null && eligibleSuggestionCount >= maxSuggestions) break

      try {
        const response = await method.run(wiki, trimmed)
        run.methodResults[method.methodName] = { ok: true, response }

        for (let index = 0; index < response.suggestions.length; index++) {
          if (maxSuggestions != null && eligibleSuggestionCount >= maxSuggestions) break

          const suggestion = response.suggestions[index]
          if (!suggestion) continue
          if (!isEligibleSuggestion(response, suggestion)) continue
          const card = await buildSuggestionCard(
            wiki,
            method.methodName,
            trimmed,
            response,
            suggestion,
            index,
            sectionTitleMap,
            sectionRanges,
            run.pageSource ?? '',
            snippetHtmlCache,
          )

          if (excludedTypes.has(card.suggestionType)) continue

          run.cards = [...(run.cards ?? []), card]
          eligibleSuggestionCount += 1

          if (maxSuggestions != null && eligibleSuggestionCount >= maxSuggestions) {
            break
          }
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught)
        run.methodResults[method.methodName] = { ok: false, error: message }

        if (caught instanceof FakeWikiHttpError && caught.status === 429) {
          error = message
          abortedForRateLimit = true
        }
      }

      completed += 1
      options.onProgress?.({ completed, total: VE_METHOD_COUNT })

      run.fetchedAt = Date.now()
      run.snippetHtmlByKey = snippetHtmlCache
      run.cards = sortCards(run.cards ?? [])
      setCachedRun(trimmed, {
        ...run,
        methodResults: { ...run.methodResults },
        cards: [...(run.cards ?? [])],
        snippetHtmlByKey: { ...snippetHtmlCache },
      })
    }

    const cards = sortCards(hydrateCardsFromSnippetCache(run.cards ?? [], trimmed, snippetHtmlCache))

    return {
      pageTitle: trimmed,
      cards,
      methodErrors: methodErrorsFromResults(run.methodResults),
      fromCache: false,
      fetchedAt: run.fetchedAt,
      error,
    }
  } finally {
    restoreGetPageSource()
  }
}
