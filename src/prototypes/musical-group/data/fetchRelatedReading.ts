import { wikimediaApiFetchHeaders } from '@/config'

import { enwikiArticleUrl, normalizeEnwikiTitle, wikiActionUrl } from './enwikiTitle'
import { fetchWithTimeout } from './fetchWithTimeout'
import { fetchPageSummary } from './pageSummary'
import type { HomeRelated, HomeSavedItem } from './types'
import { normalizeQid } from './wikidataApi'

/** How many saved pages to seed related reading from. */
const RELATED_SEED_COUNT = 2

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

async function fetchMorelikeHits(seedTitle: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    srsearch: `morelike:${seedTitle}`,
    srwhat: 'text',
    srnamespace: '0',
    srlimit: '8',
  })

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-home-morelike'),
  })
  if (!response.ok) return []

  const json = (await response.json()) as { query?: { search?: SearchHit[] } }
  return json.query?.search ?? []
}

async function relatedForSeed(
  seedTitle: string,
  excluded: Set<string>,
  signal?: AbortSignal,
): Promise<HomeRelated | null> {
  const hits = await fetchMorelikeHits(seedTitle, signal)
  const hit = hits.find((candidate) => {
    if (!candidate.title) return false
    return !excluded.has(normalizeEnwikiTitle(candidate.title).toLowerCase())
  })
  if (!hit?.title) return null

  const relatedTitle = hit.title
  const summary = await fetchPageSummary(relatedTitle, signal, 'musical-group-home-related')

  // Reading cards open inside Wikita whenever the article has a Wikidata item.
  const itemId = normalizeQid(summary?.wikibase_item) ?? undefined

  return {
    title: summary?.normalizedtitle ?? summary?.title ?? relatedTitle,
    description: summary?.description ?? '',
    thumbnailUrl: summary?.thumbnail?.source,
    articleUrl:
      summary?.content_urls?.desktop?.page ?? enwikiArticleUrl(relatedTitle),
    itemId,
  }
}

/** Top related article (not already saved) from 2 randomly chosen saved pages. */
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

  const seeds = pickRandom(candidates, RELATED_SEED_COUNT)
  const seen = new Set<string>(excluded)
  const related: HomeRelated[] = []

  for (const seed of seeds) {
    const result = await relatedForSeed(seed.enwikiTitle as string, seen, signal)
    if (!result) continue
    const key = normalizeEnwikiTitle(result.title).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    related.push(result)
  }

  return related
}
