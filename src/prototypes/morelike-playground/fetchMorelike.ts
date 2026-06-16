import { wikimediaApiFetchHeaders } from '@/config'

import {
  resolveMltParams,
  type MorelikeMltCustomSettings,
  type MorelikeMltPreset,
  type MorelikeSortOrder,
} from './morelikeMlt'

const WIKI_HOST = 'en.wikipedia.org'
const API_URL = `https://${WIKI_HOST}/w/api.php`

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

export function buildSrsearch(seedText: string): string | null {
  const seeds = parseSeedTitles(seedText)
  if (!seeds.length) return null

  return `morelike:${seeds.join('|')}`
}

function articleUrl(title: string): string {
  return `https://${WIKI_HOST}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

function buildMorelikeSearchParams(
  gsrsearch: string,
  limit: number,
  mltParams: Record<string, string>,
  classicNoboostlinks: boolean,
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

  if (classicNoboostlinks) {
    params.set('gsrqiprofile', 'classic_noboostlinks')
  }

  for (const [key, value] of Object.entries(mltParams)) {
    params.set(key, value)
  }

  return params
}

/** Exact URL sent to the Action API (shared by fetch + UI). */
export function buildMorelikeApiRequestUrl(
  seedText: string,
  limit: number,
  mltPreset: MorelikeMltPreset,
  mltCustom: MorelikeMltCustomSettings,
  classicNoboostlinks = true,
): string | null {
  const gsrsearch = buildSrsearch(seedText)
  if (!gsrsearch) return null

  const params = buildMorelikeSearchParams(
    gsrsearch,
    limit,
    resolveMltParams(mltPreset, mltCustom),
    classicNoboostlinks,
  )
  return `${API_URL}?${params.toString()}`
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

function mapPageToHit(page: GeneratorPage): MorelikeSearchHit {
  const latest = mapRevisionFields(page.revisions?.[0])

  return {
    title: page.title,
    description: page.description?.trim() ?? '',
    timestamp: latest.timestamp,
    pageUrl: articleUrl(page.title),
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

export async function fetchMorelikeResults(
  seedText: string,
  options: {
    limit: number
    mltPreset: MorelikeMltPreset
    mltCustom: MorelikeMltCustomSettings
    classicNoboostlinks?: boolean
    signal?: AbortSignal
  },
): Promise<MorelikeSearchHit[]> {
  if (options.signal?.aborted) {
    throw new MorelikeFetchError('Request aborted', 'aborted')
  }

  const requestUrl = buildMorelikeApiRequestUrl(
    seedText,
    options.limit,
    options.mltPreset,
    options.mltCustom,
    options.classicNoboostlinks ?? true,
  )

  if (!requestUrl) {
    throw new MorelikeFetchError('Add at least one seed page title', 'empty')
  }

  const seedTitles = new Set(parseSeedTitles(seedText))

  const pages = await fetchMorelikeHits(requestUrl, options.signal)

  return pages
    .filter((page) => !seedTitles.has(page.title))
    .map(mapPageToHit)
}
