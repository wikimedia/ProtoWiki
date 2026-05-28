import { wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT = 'ProtoWiki/0.1 (https://github.com/wikimedia/protowiki) morelike-search'

const THUMB_SIZE = 96
const MAX_TITLES_PER_REQUEST = 50

export class FetchPageThumbnailsBatchError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchPageThumbnailsBatchError'
  }
}

export interface FetchPageThumbnailsBatchOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchPageThumbnailsBatchError('Request aborted', 'aborted')
  }
}

function actionUrl(wikiHost: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

async function fetchThumbnailBatch(
  wikiHost: string,
  titles: string[],
  signal?: AbortSignal,
): Promise<Record<string, string | undefined>> {
  assertNotAborted(signal)

  const response = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      prop: 'pageimages',
      pithumbsize: String(THUMB_SIZE),
      redirects: '1',
      titles: titles.join('|'),
    }),
    {
      signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    },
  )

  if (!response.ok) {
    throw new FetchPageThumbnailsBatchError(`HTTP ${response.status}`, 'http')
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string
        thumbnail?: { source?: string }
      }>
    }
  }

  const out: Record<string, string | undefined> = {}
  for (const page of data.query?.pages ?? []) {
    const title = typeof page.title === 'string' ? page.title : ''
    if (!title.length) continue
    out[title] = page.thumbnail?.source
  }

  return out
}

/**
 * Batch-fetch lead-image thumbnails for article titles.
 */
export async function fetchPageThumbnailsBatch(
  titles: string[],
  options: FetchPageThumbnailsBatchOptions = {},
): Promise<Record<string, string | undefined>> {
  const unique = [...new Set(titles.map((title) => title.trim()).filter(Boolean))]
  if (!unique.length) return {}

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const merged: Record<string, string | undefined> = {}

  for (let i = 0; i < unique.length; i += MAX_TITLES_PER_REQUEST) {
    const chunk = unique.slice(i, i + MAX_TITLES_PER_REQUEST)
    const batch = await fetchThumbnailBatch(wikiHost, chunk, options.signal)
    Object.assign(merged, batch)
  }

  return merged
}
