import { formatWikimediaApiUserAgent, wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'

import {
  isExcludedEditOpportunityNeed,
  resolveEditOpportunityCopy,
} from './editOpportunityCopy'
import { cdxIconLightbulb } from '@wikimedia/codex-icons'
import type { WikitabCardData } from '../sections'
import {
  fetchWikitabSearchTopTitles,
  type WikitabSearchTopTitle,
} from './fetchWikitabSearchArticles'
import { fetchWikitabPageSummary } from './fetchWikitabPageSummary'
import {
  articleTitleKey,
  EN_WIKI_HOST,
  visualEditorUrl,
} from './wikitabHtml'

export { fetchWikitabSearchTopTitles, type WikitabSearchTopTitle }

const MICROTASK_QUALITY_CHECK_URL = 'https://microtask-generator.toolforge.org/quality-check'
const MORELIKE_BATCH = 20
const REFILL_THRESHOLD = 5
const TITLES_PER_SEED = 2

interface QualityCheckPotentialNeed {
  need?: string
  score?: number
}

interface QualityCheckResult {
  title?: string
  exists?: boolean
  potential_needs?: QualityCheckPotentialNeed[]
}

interface SeedCursor {
  searchTitle: string
  displayTitle: string
  offset: number
}

interface PooledTitle {
  title: string
  relatedToTitle: string
}

export interface WikitabContributeSeed {
  pageid?: number
  title: string
  thumbnailUrl?: string
}

export interface WikitabSearchContributeItem {
  pageid: number
  title: string
  description?: string
  thumbnailUrl?: string
  suggestionLabel: string
  body: string
  need: string
  relatedToTitle?: string
  editHref: string
}

/** Session cache — one resolved card (or a miss) per page, filled as cards stream in. */
type ContributeCacheEntry = WikitabSearchContributeItem | 'none'

const contributeByPageid = new Map<number, ContributeCacheEntry>()
const contributeByTitleKey = new Map<string, ContributeCacheEntry>()

function cloneContributeItem(
  item: WikitabSearchContributeItem,
  relatedToTitle?: string,
): WikitabSearchContributeItem {
  return {
    ...item,
    relatedToTitle: relatedToTitle || undefined,
  }
}

function getCachedContribute(
  pageid: number,
  titleKey: string,
): ContributeCacheEntry | undefined {
  return contributeByPageid.get(pageid) ?? contributeByTitleKey.get(titleKey)
}

function setCachedContribute(
  pageid: number,
  titleKey: string,
  entry: ContributeCacheEntry,
): void {
  contributeByPageid.set(pageid, entry)
  contributeByTitleKey.set(titleKey, entry)
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function microtaskFetchHeaders(purpose: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'User-Agent': formatWikimediaApiUserAgent(purpose),
  }
}

async function fetchQualityCheck(
  title: string,
  signal: AbortSignal | undefined,
): Promise<QualityCheckResult | null> {
  try {
    const response = await fetchWithTimeout(MICROTASK_QUALITY_CHECK_URL, {
      method: 'POST',
      signal,
      headers: microtaskFetchHeaders('wikitab-contribute-quality-check'),
      body: JSON.stringify({ lang: 'en', titles: [title] }),
    })
    if (!response.ok) return null

    const json = (await response.json()) as { results?: QualityCheckResult[] }
    return json.results?.[0] ?? null
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    return null
  }
}

async function fetchMorelikeTitles(
  seedTitle: string,
  offset: number,
  signal: AbortSignal | undefined,
): Promise<string[]> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    list: 'search',
    srsearch: `morelike:${seedTitle}`,
    srnamespace: '0',
    srlimit: String(MORELIKE_BATCH),
    sroffset: String(offset),
  })

  const response = await fetchWikimedia(`https://${EN_WIKI_HOST}/w/api.php?${query.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-contribute-morelike'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as { query?: { search?: { title?: string }[] } }
  return (json.query?.search ?? [])
    .map((hit) => hit.title)
    .filter((title): title is string => Boolean(title))
}

function pickTopNeed(result: QualityCheckResult): { need: string; score: number } | null {
  const needs = (result.potential_needs ?? [])
    .filter((entry): entry is { need: string; score: number } => {
      return typeof entry.need === 'string' && typeof entry.score === 'number'
    })
    .sort((a, b) => b.score - a.score)

  const top = needs.find((entry) => !isExcludedEditOpportunityNeed(entry.need))
  return top ?? null
}

async function resolveContributeItem(
  page: {
    pageid: number
    title: string
    description?: string
    thumbnailUrl?: string
  },
  relatedToTitle: string | undefined,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchContributeItem | null> {
  const titleKey = articleTitleKey(page.title)
  const cached = getCachedContribute(page.pageid, titleKey)
  if (cached === 'none') return null
  if (cached) return cloneContributeItem(cached, relatedToTitle)

  const result = await fetchQualityCheck(page.title, signal)
  if (!result?.exists) {
    setCachedContribute(page.pageid, titleKey, 'none')
    return null
  }

  const top = pickTopNeed(result)
  if (!top) {
    setCachedContribute(page.pageid, titleKey, 'none')
    return null
  }

  const copy = resolveEditOpportunityCopy(top.need)

  let pageid = page.pageid
  let title = page.title
  let description = page.description?.trim() ?? ''
  let thumbnailUrl = page.thumbnailUrl

  if (!description || !thumbnailUrl) {
    const summary = await fetchWikitabPageSummary(page.title, signal, 'wikitab-contribute-summary')
    if (summary) {
      pageid = summary.pageid
      title = summary.title
      if (!description) description = summary.description ?? ''
      if (!thumbnailUrl) thumbnailUrl = summary.thumbnailUrl
    }
  }

  const item: WikitabSearchContributeItem = {
    pageid,
    title,
    description: description || undefined,
    thumbnailUrl,
    suggestionLabel: copy.title,
    body: copy.body,
    need: top.need,
    relatedToTitle,
    editHref: visualEditorUrl(title),
  }

  setCachedContribute(pageid, articleTitleKey(title), {
    ...item,
    relatedToTitle: undefined,
  })
  return item
}

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

/** Map a Contribute feed item to home-feed `WikitabCardData`. */
export function contributeItemToCard(item: WikitabSearchContributeItem): WikitabCardData {
  const title = displayTitle(item.title)
  return {
    key: `suggested-edits:${item.pageid}`,
    href: item.editHref,
    linkTitle: `Edit ${title}: ${item.suggestionLabel}`,
    title,
    description: item.description || undefined,
    thumbnailUrl: item.thumbnailUrl,
    supportingSignals: [
      {
        icon: cdxIconLightbulb,
        text: item.suggestionLabel,
      },
    ],
  }
}

function titlesPerSeed(seedCount: number): number {
  return Math.max(TITLES_PER_SEED, Math.ceil(REFILL_THRESHOLD / Math.max(seedCount, 1)))
}

function shuffleSeeds(seeds: SeedCursor[]): void {
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seeds[i], seeds[j]] = [seeds[j], seeds[i]]
  }
}

export interface WikitabSearchContributeFeedOptions {
  /** Skip morelike titles already saved (home Suggested edits). */
  excludedTitleKeys?: Set<string>
  /** Page ids already emitted — for cache resume. */
  seenPageids?: Iterable<number>
}

/** Stateful feed: edit suggestions for seed articles + morelike expansion. */
export class WikitabSearchContributeFeed {
  private readonly directSeeds: WikitabContributeSeed[]
  private directIndex = 0
  private readonly seenTitles = new Set<string>()
  private readonly emittedPageids = new Set<number>()
  private readonly excludedTitleKeys: Set<string>
  private seeds: SeedCursor[] = []
  private titlePool: PooledTitle[] = []
  private nextSeedIndex = 0
  private directPhaseDone = false
  private relatedExhausted = false

  constructor(seeds: WikitabContributeSeed[], options: WikitabSearchContributeFeedOptions = {}) {
    this.directSeeds = seeds
    this.excludedTitleKeys = options.excludedTitleKeys ?? new Set()

    if (options.seenPageids) {
      for (const pageid of options.seenPageids) this.emittedPageids.add(pageid)
    }

    for (const seed of seeds) {
      this.seenTitles.add(articleTitleKey(seed.title))
      this.seeds.push({
        searchTitle: seed.title,
        displayTitle: displayTitle(seed.title),
        offset: 0,
      })
    }

    shuffleSeeds(this.seeds)
  }

  get hasMore(): boolean {
    if (!this.directPhaseDone && this.directIndex < this.directSeeds.length) return true
    if (this.relatedExhausted) return false
    return this.titlePool.length > 0 || this.seeds.length > 0
  }

  async start(_signal: AbortSignal): Promise<void> {
    // Direct phase begins on first takeNext().
  }

  async takeNext(signal: AbortSignal): Promise<WikitabSearchContributeItem | null> {
    const maxAttempts = 24
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++

      if (!this.directPhaseDone) {
        const item = await this.takeNextDirect(signal)
        if (item) return item
        if (this.directIndex >= this.directSeeds.length) {
          this.directPhaseDone = true
        }
        continue
      }

      const item = await this.takeNextRelated(signal)
      if (item) return item
      if (!this.hasMore) return null
    }

    return null
  }

  private async takeNextDirect(
    signal: AbortSignal,
  ): Promise<WikitabSearchContributeItem | null> {
    while (this.directIndex < this.directSeeds.length) {
      const seed = this.directSeeds[this.directIndex]
      this.directIndex++

      if (seed.pageid != null && this.emittedPageids.has(seed.pageid)) continue

      const item = await resolveContributeItem(
        {
          pageid: seed.pageid ?? 0,
          title: seed.title,
          thumbnailUrl: normalizeThumbnailUrl(seed.thumbnailUrl),
        },
        undefined,
        signal,
      )

      if (item) {
        this.emittedPageids.add(item.pageid)
        return item
      }
    }

    return null
  }

  private async takeNextRelated(
    signal: AbortSignal,
  ): Promise<WikitabSearchContributeItem | null> {
    if (!this.titlePool.length) {
      await this.refillPool(signal)
    }

    const pooled = this.titlePool.shift()
    if (!pooled) return null

    const summary = await fetchWikitabPageSummary(pooled.title, signal, 'wikitab-contribute-summary')
    if (!summary) return null

    if (this.emittedPageids.has(summary.pageid)) return null

    const item = await resolveContributeItem(summary, pooled.relatedToTitle, signal)
    if (item) {
      this.emittedPageids.add(item.pageid)
      return item
    }

    return null
  }

  private async refillPool(signal: AbortSignal): Promise<void> {
    if (!this.seeds.length || this.relatedExhausted) return

    const poolBefore = this.titlePool.length
    let passes = 0
    const maxPasses = Math.max(this.seeds.length * 2, 4)

    while (this.titlePool.length < REFILL_THRESHOLD && passes < maxPasses) {
      const start = this.nextSeedIndex
      const poolAtPassStart = this.titlePool.length

      for (let i = 0; i < this.seeds.length && this.titlePool.length < REFILL_THRESHOLD; i++) {
        const seed = this.seeds[(start + i) % this.seeds.length]
        const titles = await fetchMorelikeTitles(seed.searchTitle, seed.offset, signal)
        seed.offset += MORELIKE_BATCH

        const perSeed = titlesPerSeed(this.seeds.length)
        let added = 0
        for (const title of titles) {
          if (added >= perSeed) break

          const key = articleTitleKey(title)
          if (!key || this.seenTitles.has(key) || this.excludedTitleKeys.has(key)) continue
          this.seenTitles.add(key)
          this.titlePool.push({ title, relatedToTitle: seed.displayTitle })
          added++
        }
      }

      this.nextSeedIndex = (start + this.seeds.length) % this.seeds.length
      passes++

      if (this.titlePool.length === poolAtPassStart) break
    }

    if (this.titlePool.length === poolBefore) {
      this.relatedExhausted = true
    }
  }
}

export function createContributeFeedFromSeeds(
  seeds: WikitabContributeSeed[],
  options: WikitabSearchContributeFeedOptions = {},
): WikitabSearchContributeFeed | null {
  if (!seeds.length) return null
  return new WikitabSearchContributeFeed(seeds, options)
}

export async function createWikitabSearchContributeFeed(
  query: string,
  options: {
    signal?: AbortSignal
    knownTitles?: WikitabSearchTopTitle[]
  } = {},
): Promise<WikitabSearchContributeFeed | null> {
  const titles =
    options.knownTitles?.length
      ? options.knownTitles.slice(0, 6)
      : await fetchWikitabSearchTopTitles(query, { signal: options.signal, limit: 6 })

  if (!titles.length) return null

  const seeds: WikitabContributeSeed[] = titles.map((title) => ({
    pageid: title.pageid,
    title: title.title,
    thumbnailUrl: title.thumbnailUrl,
  }))

  return createContributeFeedFromSeeds(seeds)
}
