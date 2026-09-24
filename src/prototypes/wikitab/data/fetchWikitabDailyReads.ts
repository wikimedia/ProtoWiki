import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { pickSavedArticleSeeds } from './pickSavedArticleSeeds'
import type { WikitabSavedArticle } from './wikitabConfig'
import { filterDisambiguationPageIds } from './filterDisambiguationPages'
import { fetchWikitabPageSummary } from './fetchWikitabPageSummary'
import type { WikitabCardData } from '../sections'
import { EN_WIKI_HOST, articleTitleKey, articleUrl } from './wikitabHtml'

const MAX_SEEDS = 4
const MORELIKE_BATCH_SIZE = 12
const THUMBNAIL_SIZE = 200

interface RawPage {
  pageid?: number
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
  index?: number
}

interface RawQueryResponse {
  query?: { pages?: Record<string, RawPage> }
}

interface DailyReadsHit {
  pageid: number
  title: string
  description?: string
  extract: string
  thumbnailUrl?: string
}

interface DailyReadsSeedQueue {
  seedTitle: string
  pending: DailyReadsHit[]
}

interface DailyReadsMergedHit {
  hit: DailyReadsHit
  seedTitle: string
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  return function next() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

function sortPagesByGeneratorIndex(pages: RawPage[]): RawPage[] {
  return [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

function stripEmptyParentheses(text: string): string {
  return text.replace(/\s*\(\s*\)/g, '')
}

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

/** Pick up to four saved articles using a deterministic daily shuffle. */
export function pickDailyReadSeeds(
  articles: readonly WikitabSavedArticle[],
  day: string,
): WikitabSavedArticle[] {
  return pickSavedArticleSeeds(articles, day, MAX_SEEDS, 'daily-reads')
}

async function fetchMorelikePages(
  seedTitle: string,
  signal: AbortSignal | undefined,
): Promise<RawPage[]> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `morelike:${seedTitle}`,
    gsrnamespace: '0',
    gsrlimit: String(MORELIKE_BATCH_SIZE),
    prop: 'pageimages|description|extracts',
    exintro: '1',
    explaintext: '1',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
  })

  const response = await fetchWikimedia(`https://${EN_WIKI_HOST}/w/api.php?${query.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-daily-reads-morelike'),
  })

  if (!response.ok) {
    throw new Error(`Daily reads morelike failed (HTTP ${response.status})`)
  }

  const data = (await response.json()) as RawQueryResponse
  return sortPagesByGeneratorIndex(Object.values(data.query?.pages ?? {}))
}

function mapPage(raw: RawPage): DailyReadsHit | null {
  if (typeof raw.pageid !== 'number' || typeof raw.title !== 'string') return null

  return {
    pageid: raw.pageid,
    title: raw.title,
    description: raw.description?.trim() || undefined,
    extract: stripEmptyParentheses((raw.extract ?? '').trim()),
    thumbnailUrl: normalizeThumbnailUrl(raw.thumbnail?.source),
  }
}


function hitToCard({ hit, seedTitle }: DailyReadsMergedHit): WikitabCardData {
  const title = displayTitle(hit.title)
  return {
    key: `daily-reads:${hit.pageid}`,
    href: articleUrl(hit.title),
    linkTitle: title,
    title,
    description: hit.description ?? hit.extract,
    thumbnailUrl: hit.thumbnailUrl,
    supportingText: `Related to ${seedTitle}`,
  }
}

async function enrichDailyReadsCard(
  merged: DailyReadsMergedHit,
  signal: AbortSignal | undefined,
): Promise<WikitabCardData> {
  const card = hitToCard(merged)

  const summary = await fetchWikitabPageSummary(
    merged.hit.title,
    signal,
    'wikitab-daily-reads-summary',
  )
  if (summary) {
    card.thumbnailUrl = summary.thumbnailUrl ?? card.thumbnailUrl
    card.description = card.description ?? summary.description
  }

  return card
}

function dailyMergeRng(day: string, savedArticles: readonly WikitabSavedArticle[]): () => number {
  const fingerprint = savedArticles
    .map((article) => article.titleKey)
    .sort()
    .join('|')
  return mulberry32(hashString(`${day}:${fingerprint}:merge`))
}

/** Stateful feed — seeds load in parallel; cards resolve one at a time via `takeNext()`. */
export class DailyReadsFeed {
  private readonly queues: DailyReadsSeedQueue[] = []
  private readonly seenPageids = new Set<number>()
  private readonly rng: () => number
  private pendingSeedLoads = 0
  private seedLoadsDone = false
  private loadError: Error | null = null
  private readonly wakeups: Array<() => void> = []

  constructor(
    savedArticles: readonly WikitabSavedArticle[],
    day: string,
    signal: AbortSignal | undefined,
    seenPageids?: Iterable<number>,
  ) {
    if (seenPageids) {
      for (const pageid of seenPageids) this.seenPageids.add(pageid)
    }

    this.rng = dailyMergeRng(day, savedArticles)

    const seeds = pickDailyReadSeeds(savedArticles, day)
    const excludedTitleKeys = new Set(savedArticles.map((article) => article.titleKey))

    if (!seeds.length) {
      this.seedLoadsDone = true
      return
    }

    for (const seed of seeds) {
      this.queues.push({ seedTitle: seed.title, pending: [] })
    }

    this.pendingSeedLoads = seeds.length

    seeds.forEach((seed, queueIndex) => {
      void this.loadSeed(seed, excludedTitleKeys, signal, queueIndex)
        .catch((cause) => {
          if ((cause as Error)?.name === 'AbortError') return
          this.loadError ??= cause instanceof Error ? cause : new Error(String(cause))
        })
        .finally(() => {
          this.pendingSeedLoads--
          if (this.pendingSeedLoads === 0) {
            this.seedLoadsDone = true
            // Only wake all-seeds waiters once every seed batch has settled —
            // waking on each seed completion drops waiters that are not ready yet.
            this.notifyWaiters()
          }
        })
    })
  }

  /** Pick a random eligible hit across all seed queues (daily-seeded shuffle). */
  private takeOneRandom(): DailyReadsMergedHit | null {
    const candidates: DailyReadsMergedHit[] = []

    for (const queue of this.queues) {
      for (const hit of queue.pending) {
        if (this.seenPageids.has(hit.pageid)) continue
        candidates.push({ hit, seedTitle: queue.seedTitle })
      }
    }

    if (!candidates.length) return null

    const pick = candidates[Math.floor(this.rng() * candidates.length)]

    for (const queue of this.queues) {
      const index = queue.pending.findIndex((hit) => hit.pageid === pick.hit.pageid)
      if (index >= 0) {
        queue.pending.splice(index, 1)
        break
      }
    }

    this.seenPageids.add(pick.hit.pageid)
    return pick
  }

  hasPending(): boolean {
    return this.queues.some((queue) =>
      queue.pending.some((hit) => !this.seenPageids.has(hit.pageid)),
    )
  }

  private notifyWaiters(): void {
    const waiters = this.wakeups.splice(0)
    for (const wake of waiters) wake()
  }

  private waitForAllSeeds(signal: AbortSignal | undefined): Promise<void> {
    if (this.loadError) return Promise.reject(this.loadError)
    if (this.seedLoadsDone) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const onAbort = (): void => {
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      }

      const cleanup = (): void => {
        signal?.removeEventListener('abort', onAbort)
        const index = this.wakeups.indexOf(onWake)
        if (index >= 0) this.wakeups.splice(index, 1)
      }

      const onWake = (): void => {
        if (signal?.aborted) {
          onAbort()
          return
        }
        if (this.loadError) {
          cleanup()
          reject(this.loadError)
          return
        }
        if (this.seedLoadsDone) {
          cleanup()
          resolve()
          return
        }
        // Another seed finished first — stay registered until all seeds settle.
        this.wakeups.push(onWake)
      }

      signal?.addEventListener('abort', onAbort)
      this.wakeups.push(onWake)
      // Seeds may finish between the guard above and registering — wake immediately if so.
      if (this.seedLoadsDone) onWake()
    })
  }

  private waitForProgress(signal: AbortSignal | undefined): Promise<void> {
    if (this.loadError) return Promise.reject(this.loadError)
    if (this.hasPending() || this.seedLoadsDone) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const onAbort = (): void => {
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      }

      const cleanup = (): void => {
        signal?.removeEventListener('abort', onAbort)
        const index = this.wakeups.indexOf(onWake)
        if (index >= 0) this.wakeups.splice(index, 1)
      }

      const onWake = (): void => {
        if (signal?.aborted) {
          onAbort()
          return
        }
        if (this.loadError) {
          cleanup()
          reject(this.loadError)
          return
        }
        if (this.hasPending() || this.seedLoadsDone) {
          cleanup()
          resolve()
          return
        }
        this.wakeups.push(onWake)
      }

      signal?.addEventListener('abort', onAbort)
      this.wakeups.push(onWake)
      if (this.hasPending() || this.seedLoadsDone) onWake()
    })
  }

  private async loadSeed(
    seed: WikitabSavedArticle,
    excludedTitleKeys: Set<string>,
    signal: AbortSignal | undefined,
    queueIndex: number,
  ): Promise<void> {
    const pages = await fetchMorelikePages(seed.title, signal)
    const hits: DailyReadsHit[] = []

    for (const page of pages) {
      const hit = mapPage(page)
      if (!hit) continue

      const titleKey = articleTitleKey(hit.title)
      if (!titleKey || excludedTitleKeys.has(titleKey)) continue

      hits.push(hit)
    }

    const queue = this.queues[queueIndex]
    if (!queue) return

    if (!hits.length) return

    const disambiguationIds = await filterDisambiguationPageIds(
      hits.map((hit) => hit.pageid),
      { signal },
    )

    queue.pending = hits.filter((hit) => !disambiguationIds.has(hit.pageid))
  }

  /** Next shuffled card, enriched via REST `/page/summary/`. */
  async takeNext(signal: AbortSignal | undefined): Promise<WikitabCardData | null> {
    while (true) {
      if (this.loadError) throw this.loadError

      // Wait for every seed's morelike batch before dequeuing — keeps the daily
      // shuffle fair across all seeds rather than favouring the fastest fetch.
      if (!this.seedLoadsDone) {
        await this.waitForAllSeeds(signal)
      }

      const merged = this.takeOneRandom()
      if (merged) return enrichDailyReadsCard(merged, signal)

      return null
    }
  }
}

export function createDailyReadsFeed(
  savedArticles: readonly WikitabSavedArticle[],
  day: string,
  signal?: AbortSignal,
  seenPageids?: Iterable<number>,
): DailyReadsFeed {
  return new DailyReadsFeed(savedArticles, day, signal, seenPageids)
}
