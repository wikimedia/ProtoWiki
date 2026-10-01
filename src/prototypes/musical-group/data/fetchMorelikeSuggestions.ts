import { normalizeLang, wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'
import { normalizeEnwikiTitle } from './enwikiTitle'
import { getContentLang } from '@/lib/contentLang'

export interface MorelikeSuggestionHit {
  title: string
  description: string
  thumbnail?: { url: string; width?: number; height?: number } | null
  wikibaseItem?: string
  timestamp?: string
}

interface GeneratorPage {
  title: string
  index?: number
  description?: string
  thumbnail?: { source: string; width: number; height: number }
  revisions?: { timestamp?: string }[]
  pageprops?: { wikibase_item?: string }
}

interface GeneratorResponse {
  query?: { pages?: GeneratorPage[] }
}

function normalizeTitleKey(title: string): string {
  return normalizeEnwikiTitle(title).toLowerCase()
}

function mapPage(page: GeneratorPage): MorelikeSuggestionHit {
  return {
    title: page.title,
    description: page.description?.trim() ?? '',
    thumbnail: page.thumbnail
      ? { url: page.thumbnail.source, width: page.thumbnail.width, height: page.thumbnail.height }
      : null,
    wikibaseItem: page.pageprops?.wikibase_item,
    timestamp: page.revisions?.[0]?.timestamp ?? '',
  }
}

async function fetchGeneratorPages(
  params: URLSearchParams,
  purpose: string,
  signal?: AbortSignal,
): Promise<GeneratorPage[]> {
  const lang = normalizeLang(getContentLang())
  const wikiHost = wikiHostFromLang(lang)
  const response = await fetch(`https://${wikiHost}/w/api.php?${params.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders(purpose),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = (await response.json()) as GeneratorResponse
  const pages = data.query?.pages ?? []
  return [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

/** One Action API round-trip: morelike search + descriptions + thumbnails (+ revision time, Wikidata id). */
export async function fetchMorelikeSuggestions(
  seedTitle: string,
  limit: number,
  signal?: AbortSignal,
  purpose = 'musical-group-morelike',
): Promise<MorelikeSuggestionHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `morelike:${seedTitle.trim()}`,
    gsrnamespace: '0',
    gsrlimit: String(limit),
    prop: 'pageimages|description|revisions|pageprops',
    piprop: 'thumbnail',
    pithumbsize: '160',
    ppprop: 'wikibase_item',
    rvprop: 'timestamp',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const seedKey = normalizeTitleKey(seedTitle)
  return (await fetchGeneratorPages(params, purpose, signal))
    .filter((page) => !seedKey || normalizeTitleKey(page.title) !== seedKey)
    .map(mapPage)
}

/** Minimum mainspace article size for interest-picker random suggestions (`grnminsize`). */
export const RANDOM_SUGGESTION_MIN_BYTES = 5000

export interface RandomSuggestionsOptions {
  /** Minimum article size in bytes (`grnminsize` on the random generator). */
  minSize?: number
}

/** Random mainspace articles when there is no seed interest yet. */
export async function fetchRandomSuggestions(
  limit: number,
  signal?: AbortSignal,
  purpose = 'musical-group-morelike-random',
  options: RandomSuggestionsOptions = {},
): Promise<MorelikeSuggestionHit[]> {
  const minSize = options.minSize ?? RANDOM_SUGGESTION_MIN_BYTES
  const params = new URLSearchParams({
    action: 'query',
    generator: 'random',
    grnnamespace: '0',
    grnfilterredir: 'nonredirects',
    grnlimit: String(Math.max(limit * 4, 20)),
    prop: 'pageimages|description|pageprops',
    piprop: 'thumbnail',
    pithumbsize: '160',
    ppprop: 'wikibase_item',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  if (minSize > 0) {
    params.set('grnminsize', String(minSize))
  }

  const hits = (await fetchGeneratorPages(params, purpose, signal)).map(mapPage)
  const withThumb = hits.filter((hit) => hit.thumbnail?.url)
  const withoutThumb = hits.filter((hit) => !hit.thumbnail?.url)
  return [...withThumb, ...withoutThumb].slice(0, limit)
}

export function sortByLastEdit(hits: MorelikeSuggestionHit[]): MorelikeSuggestionHit[] {
  return [...hits].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : Number.NaN
    const bTime = b.timestamp ? Date.parse(b.timestamp) : Number.NaN
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
    if (Number.isNaN(aTime)) return 1
    if (Number.isNaN(bTime)) return -1
    return bTime - aTime
  })
}
