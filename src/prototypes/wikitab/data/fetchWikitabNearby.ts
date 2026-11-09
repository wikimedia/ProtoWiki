import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { filterDisambiguationPageIds } from './filterDisambiguationPages'
import {
  WIKITAB_FEED_CARD_THUMB_WIDTH,
  wikimediaThumbnailAtLeast,
} from './wikimediaThumbnailUrl'
import type { WikitabCardData } from '../sections'
import { WIKI_HOST, articleUrl } from './wikitabHtml'

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

const GEOSEARCH_LIMIT = 50
const GEOSEARCH_RADIUS_M = 10_000
const PAGEIDS_PER_QUERY = 50

interface GeoSearchHit {
  pageid: number
  title: string
  dist: number
}

interface RawPage {
  pageid?: number
  title?: string
  description?: string
  thumbnail?: { source?: string }
}

function wikiActionUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...params,
  })
  return `https://${WIKI_HOST}/w/api.php?${query.toString()}`
}

export function formatNearbyDistanceMeters(dist: number): string {
  if (!Number.isFinite(dist) || dist < 0) return ''
  if (dist < 1000) return `${Math.round(dist)}m away`
  const km = dist / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km).toString()}km away`
}

async function fetchGeosearchHits(
  lat: number,
  lon: number,
  signal: AbortSignal | undefined,
): Promise<GeoSearchHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat}|${lon}`,
    gsradius: String(GEOSEARCH_RADIUS_M),
    gslimit: String(GEOSEARCH_LIMIT),
    gsnamespace: '0',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const response = await fetchWikimedia(
    `https://${WIKI_HOST}/w/api.php?${params.toString()}`,
    {
      signal,
      headers: wikimediaApiFetchHeaders('wikitab-nearby-geosearch'),
    },
  )

  if (!response.ok) return []

  const data = (await response.json()) as {
    query?: {
      geosearch?: Array<{
        pageid?: number
        title?: string
        dist?: number
      }>
    }
  }

  const hits: GeoSearchHit[] = []
  for (const row of data.query?.geosearch ?? []) {
    if (typeof row.pageid !== 'number' || typeof row.title !== 'string') continue
    hits.push({
      pageid: row.pageid,
      title: row.title,
      dist: typeof row.dist === 'number' ? row.dist : 0,
    })
  }

  return hits
}

async function fetchPageDetails(
  pageIds: number[],
  signal: AbortSignal | undefined,
): Promise<Map<number, RawPage>> {
  const byId = new Map<number, RawPage>()
  if (!pageIds.length) return byId

  for (let index = 0; index < pageIds.length; index += PAGEIDS_PER_QUERY) {
    const batch = pageIds.slice(index, index + PAGEIDS_PER_QUERY)
    const response = await fetchWikimedia(
      wikiActionUrl({
        action: 'query',
        pageids: batch.join('|'),
        prop: 'pageimages|description',
        piprop: 'thumbnail',
        pithumbsize: String(WIKITAB_FEED_CARD_THUMB_WIDTH),
      }),
      {
        signal,
        headers: wikimediaApiFetchHeaders('wikitab-nearby-pages'),
      },
    )

    if (!response.ok) continue

    const data = (await response.json()) as {
      query?: { pages?: RawPage[] }
    }

    for (const page of data.query?.pages ?? []) {
      if (typeof page.pageid !== 'number') continue
      byId.set(page.pageid, page)
    }
  }

  return byId
}

function hitToCard(hit: GeoSearchHit, page: RawPage | undefined): WikitabCardData {
  const title = displayTitle(page?.title ?? hit.title)
  const thumbnailRaw = page?.thumbnail?.source
  const thumbnailUrl = thumbnailRaw
    ? wikimediaThumbnailAtLeast(
        thumbnailRaw.startsWith('//') ? `https:${thumbnailRaw}` : thumbnailRaw,
        WIKITAB_FEED_CARD_THUMB_WIDTH,
      )
    : undefined

  return {
    key: `nearby:${hit.pageid}`,
    url: articleUrl(title),
    title,
    description: page?.description?.trim() || undefined,
    thumbnailUrl,
    supportingText: formatNearbyDistanceMeters(hit.dist),
  }
}

/** Geotagged enwiki articles near `{ lat, lon }`, sorted by distance. */
export async function fetchWikitabNearbyArticles(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WikitabCardData[]> {
  const hits = await fetchGeosearchHits(lat, lon, signal)
  if (!hits.length) return []

  const pageIds = hits.map((hit) => hit.pageid)
  const disambiguationIds = await filterDisambiguationPageIds(pageIds, { signal })
  const filteredHits = hits.filter((hit) => !disambiguationIds.has(hit.pageid))
  if (!filteredHits.length) return []

  const details = await fetchPageDetails(
    filteredHits.map((hit) => hit.pageid),
    signal,
  )

  return filteredHits.map((hit) => hitToCard(hit, details.get(hit.pageid)))
}
