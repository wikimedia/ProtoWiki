/**
 * Daily reads: articles like the reader's own pages ("Related to …"), from
 * CirrusSearch `morelike:`; a reader with no pages gets random Vital articles.
 */

import { selectRandomArticle } from '@/components/article/shared/selectRandomArticle'
import { wikimediaApiFetchHeaders } from '@/config'

import {
  fetchReadingListPages,
  type SavedPageListItem,
} from '../template-saved-pages/fetchReadingListPages'
import type { HomeArticleCard } from './HomeArticleCards.vue'
import { readDayCache, utcDayKey, writeDayCache } from './homeCache'
import { titleKey } from './useHomeSeeds'

/* `morelike:` ranks against English Wikipedia, like the other Home lookups. */
const HOST = 'en.wikipedia.org'
const CACHE_SLOT = 'daily-reads'
/** Seeds used per load — enough variety without fanning out into many calls. */
const SEED_COUNT = 3
export const DAILY_READS_COUNT = 3
/** Random picks tried before settling for fewer cards (picks can repeat). */
const RANDOM_ATTEMPTS = DAILY_READS_COUNT * 2

interface MorelikeHit {
  title: string
  description?: string
  thumbnailUrl?: string
}

interface GeneratorPage {
  title: string
  index?: number
  description?: string
  thumbnail?: { source?: string }
}

/** Up to `limit` articles like `seed` (never the seed itself), best match first. */
async function fetchMorelike(
  seed: string,
  limit: number,
  signal: AbortSignal,
): Promise<MorelikeHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `morelike:${seed}`,
    gsrnamespace: '0',
    gsrlimit: String(limit + 1),
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    // Large Codex card thumbnails are 96px — 2× for sharp screens.
    pithumbsize: '200',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const response = await fetch(`https://${HOST}/w/api.php?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('home-daily-reads'),
  })
  if (!response.ok) throw new Error(`Failed to load daily reads (HTTP ${response.status}).`)

  const data = (await response.json()) as { query?: { pages?: GeneratorPage[] } }
  const seedKey = titleKey(seed)
  return [...(data.query?.pages ?? [])]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .filter((page) => titleKey(page.title) !== seedKey)
    .slice(0, limit)
    .map((page) => ({
      title: page.title,
      description: page.description,
      thumbnailUrl: page.thumbnail?.source,
    }))
}

function pickRandom<T>(items: readonly T[], count: number): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

/**
 * Wikipedia's Vital articles, picked at random (ProtoWiki's own random pick),
 * with their descriptions and thumbnails (the Saved pages template's lookup, in
 * one call). No supporting text: there's no page of the reader's they relate to.
 */
async function loadRandomReads(signal: AbortSignal): Promise<HomeArticleCard[]> {
  const titles = new Map<string, string>()
  for (let i = 0; i < RANDOM_ATTEMPTS && titles.size < DAILY_READS_COUNT; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    // `fresh`: a new pick each time, not the session's remembered one.
    const { title } = await selectRandomArticle({ source: 'vital', langs: ['en'], fresh: true })
    titles.set(titleKey(title), title)
  }

  const pages = await fetchReadingListPages([...titles.values()], { signal, lang: 'en' })
  return pages
    .filter((page): page is Extract<SavedPageListItem, { kind: 'page' }> => page.kind === 'page')
    .map((page) => ({
      title: page.title,
      description: page.description || undefined,
      thumbnailUrl: page.thumbnailUrl ?? undefined,
    }))
}

/**
 * Articles like the reader's own pages. A few random seeds, one `morelike`
 * call each — one at a time — interleaved round-robin so the cards mix seeds;
 * duplicates and the seeds themselves are dropped. A reader with no pages gets
 * random articles instead. Cached per day and seed set, so the Home doesn't
 * reshuffle on every visit.
 */
export async function loadDailyReads(
  seeds: string[],
  signal: AbortSignal,
): Promise<HomeArticleCard[]> {
  const personal = seeds.length > 0
  const cacheKey = `${utcDayKey()}|${personal ? seeds.map(titleKey).sort().join('|') : `random:${DAILY_READS_COUNT}`}`
  const cached = readDayCache<HomeArticleCard>(CACHE_SLOT, cacheKey)
  if (cached) return cached

  if (!personal) {
    const cards = await loadRandomReads(signal)
    writeDayCache(CACHE_SLOT, cacheKey, cards)
    return cards
  }

  const picked = pickRandom(seeds, SEED_COUNT)
  // One spare hit per seed leaves headroom for cross-seed duplicates.
  const perSeed = Math.ceil(DAILY_READS_COUNT / picked.length) + 1
  const batches: MorelikeHit[][] = []
  for (const seed of picked) {
    // One seed failing shouldn't cost the others.
    batches.push(
      await fetchMorelike(seed, perSeed, signal).catch((error: unknown) => {
        if (signal.aborted) throw error
        return []
      }),
    )
  }

  const seen = new Set(seeds.map(titleKey))
  const cards: HomeArticleCard[] = []
  for (let round = 0; cards.length < DAILY_READS_COUNT && round < perSeed; round++) {
    batches.forEach((hits, index) => {
      const hit = hits[round]
      if (!hit || cards.length >= DAILY_READS_COUNT || seen.has(titleKey(hit.title))) return
      seen.add(titleKey(hit.title))
      cards.push({
        title: hit.title,
        description: hit.description,
        thumbnailUrl: hit.thumbnailUrl,
        supportingText: `Related to ${picked[index]}`,
      })
    })
  }

  writeDayCache(CACHE_SLOT, cacheKey, cards)
  return cards
}
