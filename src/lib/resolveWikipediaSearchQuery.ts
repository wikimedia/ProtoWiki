import { FUZZY_SEED_SEARCH, buildMorelikeQuery } from '@/lib/cirrusSearchTuning'
import { wikiHostFromLang } from '@/lib/config'
import { stripSearchSnippetHtml } from '@/lib/fetchMorelikeSearch'

const API_USER_AGENT = 'ProtoWiki/0.1 (https://github.com/wikimedia/protowiki) morelike-search'

/** Pool size for picking topical seeds from a free-text query. */
const SEARCH_FETCH_LIMIT = 7
const MAX_SEEDS = 1

const STOPWORDS = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to'])

export type ResolveStrategy = 'title' | 'search'

export type ResolveStepOutcome = 'miss' | 'hit' | 'retry' | 'pick'

export interface ResolveStep {
  label: string
  /** API query or lookup attempted in this step. */
  query?: string
  outcome: ResolveStepOutcome
  detail?: string
}

export interface ResolvedSeedPage {
  title: string
  pageid: number
  snippet?: string
}

export interface ResolveWikipediaSearchQueryResult {
  pages: ResolvedSeedPage[]
  strategy: ResolveStrategy
  /** Cirrus query sent to morelike, e.g. `morelike:Cutlery|Fish knife`. */
  morelikeQuery: string
  /** Set when Cirrus spell-check retried with a suggested query. */
  correctedQuery?: string
  /** Resolution trail — populated when title lookup does not match immediately. */
  steps: ResolveStep[]
}

export class ResolveWikipediaSearchQueryError extends Error {
  constructor(
    message: string,
    public readonly code: 'empty_query' | 'no_results' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'ResolveWikipediaSearchQueryError'
  }
}

export interface ResolveWikipediaSearchQueryOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
  /** How many article titles to return from full-text search (default `1`). */
  maxSeeds?: number
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ResolveWikipediaSearchQueryError('Request aborted', 'aborted')
  }
}

function actionUrl(wikiHost: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

function unwrapQuotes(query: string): string {
  const trimmed = query.trim()
  const match = trimmed.match(/^["'](.+)["']$/)
  return match ? match[1].trim() : trimmed
}

/** Wikipedia-style title case — good enough for title lookup + redirects. */
function wikiTitleCase(query: string): string {
  return query
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function stripLeadingArticle(query: string): string | null {
  const match = query.match(/^(the|a|an)\s+(.+)/i)
  return match ? match[2].trim() : null
}

/** Variants to try against action=query&titles= before falling back to search. */
function titleLookupVariants(query: string): string[] {
  const unquoted = unwrapQuotes(query)
  const variants: string[] = []
  const seen = new Set<string>()

  function add(candidate: string): void {
    const trimmed = candidate.trim()
    if (!trimmed.length) return
    const key = normalizeTitleKey(trimmed)
    if (seen.has(key)) return
    seen.add(key)
    variants.push(trimmed)
  }

  add(unquoted)
  add(wikiTitleCase(unquoted))

  const withoutArticle = stripLeadingArticle(unquoted)
  if (withoutArticle) {
    add(withoutArticle)
    add(wikiTitleCase(withoutArticle))
  }

  return variants
}

function titleWordCount(title: string): number {
  return title.trim().split(/\s+/).filter(Boolean).length
}

function contentWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length > 0 && !STOPWORDS.has(word))
}

function titleContainsWord(title: string, word: string): boolean {
  const normalized = title.toLowerCase()
  if (normalized.includes(word)) return true
  if (word.endsWith('s') && normalized.includes(word.slice(0, -1))) return true
  if (normalized.includes(`${word}s`)) return true
  return false
}

/** Skip titles that reuse every query term but add extra words (e.g. “Forks Over Knives”). */
function isLiteralPhraseTitle(title: string, words: string[]): boolean {
  if (words.length < 2) return false
  if (!words.every((word) => titleContainsWord(title, word))) return false
  return titleWordCount(title) > words.length
}

/** Share of content words found in the top seed title (0–1). */
function seedRelevanceScore(seeds: ResolvedSeedPage[], words: string[]): number {
  if (!seeds.length || !words.length) return 0
  const matched = words.filter((word) => titleContainsWord(seeds[0].title, word)).length
  return matched / words.length
}

const SUGGESTION_RELEVANCE_THRESHOLD = 0.75

/** Above this, Cirrus already found plenty of matches — ignore did-you-mean. */
const SPELLCHECK_TOTALHITS_MAX = 20

function suggestionDiffersFromQuery(query: string, suggestion: string): boolean {
  const suggested = normalizeTitleKey(unwrapQuotes(displayCorrectedQuery(suggestion)))
  const original = normalizeTitleKey(unwrapQuotes(query))
  return suggested !== original
}

/** True when top wiki hits already contain every query term (original spelling works). */
function originalQueryWordsValidatedByHits(hits: ResolvedSeedPage[], query: string): boolean {
  const words = contentWords(query)
  if (!words.length) return false

  for (const hit of hits.slice(0, 5)) {
    const text = `${hit.title} ${hit.snippet ?? ''}`
    if (words.every((word) => titleContainsWord(text, word))) return true
  }

  return false
}

function shouldRetryWithSuggestion(
  seeds: ResolvedSeedPage[],
  query: string,
  suggestion: string | undefined,
  context: {
    totalHits?: number
    rawHits: ResolvedSeedPage[]
  },
): boolean {
  if (!suggestion || !suggestionDiffersFromQuery(query, suggestion)) return false

  if (typeof context.totalHits === 'number' && context.totalHits > SPELLCHECK_TOTALHITS_MAX) {
    return false
  }

  if (originalQueryWordsValidatedByHits(context.rawHits, query)) {
    return false
  }

  if (!seeds.length) return true

  const words = contentWords(unwrapQuotes(query))
  if (!words.length) return true

  return seedRelevanceScore(seeds, words) < SUGGESTION_RELEVANCE_THRESHOLD
}

function pickSearchSeeds(
  hits: ResolvedSeedPage[],
  query: string,
  maxSeeds = MAX_SEEDS,
): ResolvedSeedPage[] {
  if (!hits.length) return []

  const words = contentWords(query)
  const topical =
    words.length >= 2 ? hits.filter((hit) => !isLiteralPhraseTitle(hit.title, words)) : hits

  const pool = topical.length ? topical : hits
  return pool.slice(0, Math.max(1, maxSeeds))
}

function buildSeedSearchQuery(query: string, usePhrase = true): string {
  const unquoted = unwrapQuotes(query)
  const alreadyQuoted = /^["']/.test(query.trim())
  const wantsPhrase =
    usePhrase && !alreadyQuoted && unquoted.includes(' ') && /^(the|a|an)\s+/i.test(unquoted)
  const body = wantsPhrase ? `"${unquoted.replace(/"/g, '\\"')}"` : unquoted
  return FUZZY_SEED_SEARCH.prefixQuery ? `~${body}` : body
}

function buildFallbackSeedSearchQuery(query: string, primarySrsearch: string): string | null {
  const fallback = buildSeedSearchQuery(query, false)
  return fallback !== primarySrsearch ? fallback : null
}

/** Cirrus returns suggestions like `~knives` — use as-is when already prefixed. */
function normalizeSearchSuggestion(suggestion: string): string {
  const trimmed = suggestion.trim()
  if (trimmed.startsWith('~')) return trimmed
  return buildSeedSearchQuery(trimmed)
}

function displayCorrectedQuery(suggestion: string): string {
  return suggestion.trim().replace(/^~+/, '')
}

interface SeedSearchResponse {
  hits: ResolvedSeedPage[]
  rawHits: ResolvedSeedPage[]
  suggestion?: string
  rawHitCount: number
  totalHits?: number
}

async function fetchSeedSearchHits(
  srsearch: string,
  seedPickQuery: string,
  wikiHost: string,
  signal?: AbortSignal,
  maxSeeds = MAX_SEEDS,
): Promise<SeedSearchResponse> {
  assertNotAborted(signal)

  const response = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      list: 'search',
      srsearch,
      srwhat: FUZZY_SEED_SEARCH.srwhat,
      srnamespace: FUZZY_SEED_SEARCH.srnamespace,
      srlimit: String(Math.max(SEARCH_FETCH_LIMIT, maxSeeds)),
      srprop: FUZZY_SEED_SEARCH.srprop,
      srinfo: 'suggestion|totalhits',
      srqiprofile: FUZZY_SEED_SEARCH.srqiprofile,
    }),
    {
      signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    },
  )

  if (!response.ok) {
    throw new ResolveWikipediaSearchQueryError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      searchinfo?: {
        suggestion?: string
        totalhits?: number
      }
      search?: Array<{
        title?: string
        pageid?: number
        snippet?: string
      }>
    }
  }

  const seen = new Set<string>()
  const rawHits: ResolvedSeedPage[] = []
  const apiHits = data.query?.search ?? []

  for (const hit of apiHits) {
    const title = typeof hit.title === 'string' ? hit.title.trim() : ''
    if (!title.length) continue

    const key = normalizeTitleKey(title)
    if (seen.has(key)) continue
    seen.add(key)

    const snippet = stripSearchSnippetHtml(typeof hit.snippet === 'string' ? hit.snippet : '')
    rawHits.push({
      title,
      pageid: typeof hit.pageid === 'number' ? hit.pageid : 0,
      snippet: snippet.length ? snippet : undefined,
    })
  }

  const suggestion =
    typeof data.query?.searchinfo?.suggestion === 'string'
      ? data.query.searchinfo.suggestion.trim()
      : undefined

  const totalHits =
    typeof data.query?.searchinfo?.totalhits === 'number'
      ? data.query.searchinfo.totalhits
      : undefined

  return {
    hits: pickSearchSeeds(rawHits, seedPickQuery, maxSeeds),
    rawHits,
    suggestion: suggestion?.length ? suggestion : undefined,
    rawHitCount: apiHits.length,
    totalHits,
  }
}

interface TitleLookupResult {
  page: ResolvedSeedPage | null
  matchedCandidate?: string
  triedCandidates: string[]
}

async function resolveByExactTitle(
  query: string,
  wikiHost: string,
  signal?: AbortSignal,
): Promise<TitleLookupResult> {
  const triedCandidates = titleLookupVariants(query)

  for (const candidate of triedCandidates) {
    assertNotAborted(signal)

    const response = await fetch(
      actionUrl(wikiHost, {
        action: 'query',
        titles: candidate,
        redirects: '1',
      }),
      {
        signal,
        headers: { 'Api-User-Agent': API_USER_AGENT },
      },
    )

    if (!response.ok) {
      throw new ResolveWikipediaSearchQueryError(`HTTP ${response.status}`, 'http')
    }

    const data = (await response.json()) as {
      query?: {
        pages?: Array<{
          title?: string
          pageid?: number
          missing?: boolean
        }>
      }
    }

    const page = data.query?.pages?.[0]
    if (!page || page.missing) continue

    const title = typeof page.title === 'string' ? page.title.trim() : ''
    if (!title.length) continue

    return {
      page: {
        title,
        pageid: typeof page.pageid === 'number' ? page.pageid : 0,
      },
      matchedCandidate: candidate,
      triedCandidates,
    }
  }

  return { page: null, triedCandidates }
}

async function resolveWithSuggestion(
  suggestion: string,
  wikiHost: string,
  steps: ResolveStep[],
  signal?: AbortSignal,
  maxSeeds = MAX_SEEDS,
): Promise<{ pages: ResolvedSeedPage[]; correctedQuery: string }> {
  const correctedQuery = displayCorrectedQuery(suggestion)

  steps.push({
    label: 'Spell-check',
    query: correctedQuery,
    outcome: 'retry',
    detail: `Cirrus suggested “${correctedQuery}”.`,
  })

  const titleLookup = await resolveByExactTitle(correctedQuery, wikiHost, signal)
  if (titleLookup.page) {
    steps.push({
      label: 'Title lookup (corrected)',
      query: titleLookup.matchedCandidate,
      outcome: 'hit',
      detail: `Matched article “${titleLookup.page.title}”.`,
    })
    return { pages: [titleLookup.page], correctedQuery }
  }

  steps.push({
    label: 'Title lookup (corrected)',
    query: titleLookup.triedCandidates.join(' · '),
    outcome: 'miss',
    detail: 'No article for the suggested phrase — searching again.',
  })

  const retrySearch = normalizeSearchSuggestion(suggestion)
  const retry = await fetchSeedSearchHits(retrySearch, correctedQuery, wikiHost, signal, maxSeeds)

  const seedTitles = retry.hits.map((hit) => hit.title).join(', ') || 'none'
  steps.push({
    label: 'Full-text search (corrected)',
    query: retrySearch,
    outcome: retry.hits.length ? 'pick' : 'miss',
    detail: retry.hits.length
      ? `Picked seed${retry.hits.length === 1 ? '' : 's'}: ${seedTitles}.`
      : 'No usable seeds from corrected search.',
  })

  return { pages: retry.hits, correctedQuery }
}

async function resolveByFullTextSearch(
  query: string,
  wikiHost: string,
  steps: ResolveStep[],
  signal?: AbortSignal,
  maxSeeds = MAX_SEEDS,
): Promise<{ pages: ResolvedSeedPage[]; correctedQuery?: string }> {
  let srsearch = buildSeedSearchQuery(query)
  let searchResult = await fetchSeedSearchHits(srsearch, query, wikiHost, signal, maxSeeds)

  let usedPhraseFallback = false
  const fallbackSrsearch = buildFallbackSeedSearchQuery(query, srsearch)
  if (fallbackSrsearch && searchResult.rawHitCount === 0 && !searchResult.suggestion) {
    steps.push({
      label: 'Full-text search',
      query: srsearch,
      outcome: 'miss',
      detail: 'Phrase search returned no hits — retrying without quotes.',
    })

    usedPhraseFallback = true
    srsearch = fallbackSrsearch
    searchResult = await fetchSeedSearchHits(srsearch, query, wikiHost, signal, maxSeeds)
  }

  let { hits, suggestion, rawHitCount, totalHits, rawHits } = searchResult

  const initialDetail = [
    rawHitCount ? `${rawHitCount} hit${rawHitCount === 1 ? '' : 's'}` : 'no hits',
    typeof totalHits === 'number' ? `${totalHits} total` : null,
    suggestion ? `suggestion: ${displayCorrectedQuery(suggestion)}` : null,
    hits.length ? `seed: ${hits.map((hit) => hit.title).join(', ')}` : 'no seed picked',
  ]
    .filter(Boolean)
    .join(' · ')

  steps.push({
    label: usedPhraseFallback ? 'Full-text search (retry)' : 'Full-text search',
    query: srsearch,
    outcome: hits.length ? 'pick' : 'miss',
    detail: initialDetail,
  })

  let correctedQuery: string | undefined

  if (suggestion && shouldRetryWithSuggestion(hits, query, suggestion, { totalHits, rawHits })) {
    const resolved = await resolveWithSuggestion(suggestion, wikiHost, steps, signal, maxSeeds)
    if (resolved.pages.length) {
      hits = resolved.pages
      correctedQuery = resolved.correctedQuery
    }
  } else if (suggestion && suggestionDiffersFromQuery(query, suggestion)) {
    steps.push({
      label: 'Spell-check',
      query: displayCorrectedQuery(suggestion),
      outcome: 'miss',
      detail:
        typeof totalHits === 'number' && totalHits > SPELLCHECK_TOTALHITS_MAX
          ? `Skipped — Cirrus already found ${totalHits} matches for the original query.`
          : 'Skipped — top results already contain the query terms.',
    })
  }

  return { pages: hits, correctedQuery }
}

/**
 * Return a canonical article title when the query matches a real page (including
 * redirects and title variants). Returns **`null`** when there is no title hit —
 * unlike {@link resolveWikipediaSearchQuery}, this does not fall back to search.
 */
export async function resolveWikipediaPageTitleIfExact(
  rawQuery: string,
  options: ResolveWikipediaSearchQueryOptions = {},
): Promise<string | null> {
  const query = rawQuery.trim()
  if (!query.length) return null

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  assertNotAborted(options.signal)

  const titleLookup = await resolveByExactTitle(query, wikiHost, options.signal)
  return titleLookup.page?.title ?? null
}

/**
 * Map free text to 1–3 article titles for `morelike:`.
 *
 * Cirrus only accepts real page names in `morelike:` — not arbitrary phrases — so
 * when the query is not an exact title we fuzzy-search for topical seeds first.
 */
export async function resolveWikipediaSearchQuery(
  rawQuery: string,
  options: ResolveWikipediaSearchQueryOptions = {},
): Promise<ResolveWikipediaSearchQueryResult> {
  const query = rawQuery.trim()
  if (!query.length) {
    throw new ResolveWikipediaSearchQueryError('Enter a search query', 'empty_query')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  assertNotAborted(options.signal)

  const maxSeeds = options.maxSeeds ?? MAX_SEEDS

  const steps: ResolveStep[] = []
  const titleLookup = await resolveByExactTitle(query, wikiHost, options.signal)

  if (titleLookup.page) {
    const pages = [titleLookup.page]
    return {
      pages,
      strategy: 'title',
      morelikeQuery: buildMorelikeQuery(pages.map((page) => page.title)),
      steps,
    }
  }

  steps.push({
    label: 'Title lookup',
    query: titleLookup.triedCandidates.join(' · '),
    outcome: 'miss',
    detail: `Tried ${titleLookup.triedCandidates.length} title variant${titleLookup.triedCandidates.length === 1 ? '' : 's'} — no article found.`,
  })

  const { pages: searchHits, correctedQuery } = await resolveByFullTextSearch(
    query,
    wikiHost,
    steps,
    options.signal,
    maxSeeds,
  )
  if (!searchHits.length) {
    throw new ResolveWikipediaSearchQueryError(
      'No Wikipedia pages matched that query',
      'no_results',
    )
  }

  const morelikeQuery = buildMorelikeQuery(searchHits.map((page) => page.title))
  steps.push({
    label: 'Morelike query',
    query: morelikeQuery,
    outcome: 'pick',
    detail: `Running morelike on ${searchHits.map((page) => page.title).join(', ')}.`,
  })

  return {
    pages: searchHits,
    strategy: 'search',
    morelikeQuery,
    correctedQuery,
    steps,
  }
}
