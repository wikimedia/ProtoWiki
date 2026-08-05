import { wikimediaApiFetchHeaders } from '@/config'

import { enwikiArticleUrl, wikiActionUrl } from './enwikiTitle'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

export interface InterestSearchHit {
  title: string
  description?: string
  url: string
  thumbnailUrl?: string
}

interface QueryPage {
  title?: string
  thumbnail?: { source?: string }
  description?: string
}

function pagesFromQuery(json: { query?: { pages?: Record<string, QueryPage> | QueryPage[] } }): QueryPage[] {
  const pages = json.query?.pages
  if (!pages) return []
  return Array.isArray(pages) ? pages : Object.values(pages)
}

/** Opensearch titles enriched with descriptions and thumbnails. */
export async function fetchInterestSearchResults(
  query: string,
  signal?: AbortSignal,
  limit = 10,
): Promise<InterestSearchHit[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  const openSearchUrl = wikiActionUrl({
    action: 'opensearch',
    search: trimmed,
    limit: String(limit),
    namespace: '0',
  })

  const openSearchResponse = await fetchWikimedia(openSearchUrl, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-interests-opensearch'),
  })
  if (!openSearchResponse.ok) return []

  const openSearchData = (await openSearchResponse.json()) as [
    string,
    string[],
    string[],
    string[],
  ]
  const [, titles, descriptions, urls] = openSearchData
  if (!titles.length) return []

  const queryUrl = wikiActionUrl({
    action: 'query',
    generator: 'search',
    gsrsearch: trimmed,
    gsrnamespace: '0',
    gsrlimit: String(limit),
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    pithumbsize: '80',
  })

  const queryResponse = await fetchWikimedia(queryUrl, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-interests-search'),
  })

  const enrichedByTitle = new Map<string, { thumbnailUrl?: string; description?: string }>()
  if (queryResponse.ok) {
    const json = (await queryResponse.json()) as { query?: { pages?: Record<string, QueryPage> | QueryPage[] } }
    for (const page of pagesFromQuery(json)) {
      if (!page.title) continue
      enrichedByTitle.set(page.title, {
        thumbnailUrl: page.thumbnail?.source,
        description: page.description?.trim() || undefined,
      })
    }
  }

  return titles.map((title, index) => {
    const enriched = enrichedByTitle.get(title)
    const description =
      enriched?.description || descriptions[index]?.trim() || undefined
    return {
      title,
      description,
      url: urls[index] ?? enwikiArticleUrl(title),
      thumbnailUrl: enriched?.thumbnailUrl,
    }
  })
}
