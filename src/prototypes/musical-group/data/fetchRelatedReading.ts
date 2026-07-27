import { wikimediaApiFetchHeaders } from '@/config'

import { enwikiArticleUrl, normalizeEnwikiTitle, wikiActionUrl } from './enwikiTitle'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { fetchPageSummary } from './pageSummary'
import type { HomeRelated, HomeSavedItem } from './types'
import { normalizeQid } from './wikidataApi'

/** Minimum related cards shown on the personalized home tab. */
const MIN_RELATED_COUNT = 3

interface SearchHit {
  title?: string
}

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

async function fetchMorelikeHits(
  seedTitle: string,
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    srsearch: `morelike:${seedTitle}`,
    srwhat: 'text',
    srnamespace: '0',
    srlimit: String(limit),
    sroffset: String(offset),
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-home-morelike'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as { query?: { search?: SearchHit[] } }
  return json.query?.search ?? []
}

/** Titles of pages similar to `seedTitle`, via a morelike search. */
export async function fetchMorelikeTitles(
  seedTitle: string,
  signal?: AbortSignal,
  limit = 20,
  offset = 0,
): Promise<string[]> {
  const hits = await fetchMorelikeHits(seedTitle, limit, offset, signal)
  return hits
    .map((hit) => hit.title)
    .filter((title): title is string => Boolean(title))
}

/** Resolve a single article title to a Related reading card, or null. */
export async function resolveRelatedSummary(
  title: string,
  relatedToTitle: string,
  signal?: AbortSignal,
): Promise<HomeRelated | null> {
  const summary = await fetchPageSummary(title, signal, 'musical-group-home-related')

  // Reading cards open inside Wikita whenever the article has a Wikidata item.
  const itemId = normalizeQid(summary?.wikibase_item) ?? undefined

  return {
    title: summary?.normalizedtitle ?? summary?.title ?? title,
    description: summary?.description ?? '',
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl: summary?.content_urls?.desktop?.page ?? enwikiArticleUrl(title),
    itemId,
    relatedToTitle,
  }
}

async function relatedForSeed(
  seedTitle: string,
  relatedToTitle: string,
  excluded: Set<string>,
  signal?: AbortSignal,
  maxCount = 1,
): Promise<HomeRelated[]> {
  const titles = await fetchMorelikeTitles(seedTitle, signal, 8)
  const results: HomeRelated[] = []

  for (const title of titles) {
    if (results.length >= maxCount) break

    const key = normalizeEnwikiTitle(title).toLowerCase()
    if (excluded.has(key)) continue

    const result = await resolveRelatedSummary(title, relatedToTitle, signal)
    if (!result) continue

    const resultKey = normalizeEnwikiTitle(result.title).toLowerCase()
    if (excluded.has(resultKey)) continue

    excluded.add(resultKey)
    results.push(result)
  }

  return results
}

/** Related articles (not already saved) from saved pages; empty unless at least three resolve. */
export async function fetchRelatedReading(
  items: HomeSavedItem[],
  signal?: AbortSignal,
): Promise<HomeRelated[]> {
  const candidates = items.filter((item) => item.enwikiTitle)
  if (!candidates.length) return []

  const excluded = new Set<string>()
  for (const item of items) {
    if (item.enwikiTitle) excluded.add(normalizeEnwikiTitle(item.enwikiTitle).toLowerCase())
  }

  const primarySeeds = pickRandom(candidates, Math.min(candidates.length, MIN_RELATED_COUNT))
  const related: HomeRelated[] = []

  // One recommendation per saved page first so the home preview mixes sources.
  for (const seed of primarySeeds) {
    const fromSeed = await relatedForSeed(
      seed.enwikiTitle as string,
      seed.title,
      excluded,
      signal,
      1,
    )
    related.push(...fromSeed)
  }

  if (related.length < MIN_RELATED_COUNT) {
    for (const seed of pickRandom(candidates, candidates.length)) {
      if (related.length >= MIN_RELATED_COUNT) break

      const fromSeed = await relatedForSeed(
        seed.enwikiTitle as string,
        seed.title,
        excluded,
        signal,
        1,
      )
      related.push(...fromSeed)
    }
  }

  return related.length >= MIN_RELATED_COUNT ? related : []
}
