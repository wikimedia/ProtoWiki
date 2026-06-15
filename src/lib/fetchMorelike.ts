import { normalizeLang, wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'

import {
  resolveMltParams,
  type MorelikeMltCustomSettings,
  type MorelikeMltPreset,
  type MorelikeSortOrder,
} from './morelikeMlt'

export interface MorelikeSearchHit {
  title: string
  description: string
  timestamp: string
  pageUrl: string
  revisionAuthor?: string
  revisionComment?: string
  revisionContent?: string
  thumbnail?: {
    url: string
    width: number
    height: number
  }
}

interface GeneratorRevision {
  timestamp?: string
  user?: string
  comment?: string
  slots?: {
    main?: {
      content?: string
    }
  }
}

interface GeneratorPage {
  title: string
  index?: number
  description?: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  revisions?: GeneratorRevision[]
}

interface GeneratorSearchResponse {
  error?: {
    code?: string
    info?: string
  }
  query?: {
    pages?: GeneratorPage[]
  }
}

export class MorelikeFetchError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http' | 'empty',
  ) {
    super(message)
    this.name = 'MorelikeFetchError'
  }
}

export function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

/** Split seed input on newlines and commas; trim, dedupe, drop empties. */
export function parseSeedTitles(raw: string): string[] {
  const seen = new Set<string>()
  const titles: string[] = []

  for (const part of raw.split(/[\n,]+/)) {
    const title = part.trim()
    if (!title.length || seen.has(title)) continue
    seen.add(title)
    titles.push(title)
  }

  return titles
}

export function buildSrsearch(seedTitles: string[]): string | null {
  if (!seedTitles.length) return null
  return `morelike:${seedTitles.join('|')}`
}

function articleUrl(wikiHost: string, title: string): string {
  return `https://${wikiHost}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

function buildMorelikeSearchParams(
  gsrsearch: string,
  limit: number,
  mltParams: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch,
    gsrnamespace: '0',
    gsrlimit: String(limit),
    prop: 'pageimages|description|revisions',
    piprop: 'thumbnail',
    pithumbsize: '160',
    rvprop: 'timestamp|user|comment|content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  for (const [key, value] of Object.entries(mltParams)) {
    params.set(key, value)
  }

  return params
}

/** Exact URL sent to the Action API (shared by fetch + UI). */
export function buildMorelikeApiRequestUrl(
  seedTitles: string[],
  limit: number,
  mltPreset: MorelikeMltPreset,
  mltCustom: MorelikeMltCustomSettings,
  lang = 'en',
): string | null {
  const gsrsearch = buildSrsearch(seedTitles)
  if (!gsrsearch) return null

  const wikiHost = wikiHostFromLang(lang)
  const params = buildMorelikeSearchParams(gsrsearch, limit, resolveMltParams(mltPreset, mltCustom))
  return `https://${wikiHost}/w/api.php?${params.toString()}`
}

async function fetchMorelikeHits(
  requestUrl: string,
  signal?: AbortSignal,
): Promise<GeneratorPage[]> {
  const response = await fetch(requestUrl, {
    signal,
    headers: wikimediaApiFetchHeaders('morelike-search'),
  })

  if (!response.ok) {
    throw new MorelikeFetchError(`Search failed (HTTP ${response.status})`, 'http')
  }

  const data = (await response.json()) as GeneratorSearchResponse

  if (data.error) {
    throw new MorelikeFetchError(data.error.info ?? data.error.code ?? 'Search failed', 'http')
  }

  const pages = data.query?.pages ?? []

  return [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

function mapRevisionFields(revision: GeneratorRevision | undefined): {
  timestamp: string
  author?: string
  comment?: string
  content?: string
} {
  return {
    timestamp: revision?.timestamp ?? '',
    author: revision?.user,
    comment: revision?.comment,
    content: revision?.slots?.main?.content,
  }
}

function mapPageToHit(wikiHost: string, page: GeneratorPage): MorelikeSearchHit {
  const latest = mapRevisionFields(page.revisions?.[0])

  return {
    title: page.title,
    description: page.description?.trim() ?? '',
    timestamp: latest.timestamp,
    pageUrl: articleUrl(wikiHost, page.title),
    revisionAuthor: latest.author,
    revisionComment: latest.comment,
    revisionContent: latest.content,
    thumbnail: page.thumbnail
      ? {
          url: page.thumbnail.source,
          width: page.thumbnail.width,
          height: page.thumbnail.height,
        }
      : undefined,
  }
}

function sortByNewestEditFirst(hits: MorelikeSearchHit[]): MorelikeSearchHit[] {
  return [...hits].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : Number.NaN
    const bTime = b.timestamp ? Date.parse(b.timestamp) : Number.NaN

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
    if (Number.isNaN(aTime)) return 1
    if (Number.isNaN(bTime)) return -1

    return bTime - aTime
  })
}

/** Client-side sort — API results always stay in relevance order. */
export function sortMorelikeHits(
  hits: MorelikeSearchHit[],
  sortOrder: MorelikeSortOrder,
): MorelikeSearchHit[] {
  if (sortOrder === 'lastEdit') {
    return sortByNewestEditFirst(hits)
  }

  return hits
}

export interface FetchMorelikeOptions {
  limit: number
  mltPreset: MorelikeMltPreset
  mltCustom: MorelikeMltCustomSettings
  lang?: string
  signal?: AbortSignal
}

export async function fetchMorelikeResults(
  seedTitles: string[],
  options: FetchMorelikeOptions,
): Promise<MorelikeSearchHit[]> {
  if (options.signal?.aborted) {
    throw new MorelikeFetchError('Request aborted', 'aborted')
  }

  const lang = normalizeLang(options.lang ?? 'en')
  const wikiHost = wikiHostFromLang(lang)

  const requestUrl = buildMorelikeApiRequestUrl(
    seedTitles,
    options.limit,
    options.mltPreset,
    options.mltCustom,
    lang,
  )

  if (!requestUrl) {
    throw new MorelikeFetchError('Add at least one seed page title', 'empty')
  }

  const seedKeys = new Set(seedTitles.map(normalizeTitleKey))

  const pages = await fetchMorelikeHits(requestUrl, options.signal)

  return pages
    .filter((page) => !seedKeys.has(normalizeTitleKey(page.title)))
    .map((page) => mapPageToHit(wikiHost, page))
}

/** Fetch morelike results for a single seed title (serial multi-call mode). */
export async function fetchMorelikeForSingleSeed(
  seedTitle: string,
  options: FetchMorelikeOptions,
): Promise<MorelikeSearchHit[]> {
  return fetchMorelikeResults([seedTitle], options)
}
