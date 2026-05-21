import { normalizeWikiUsername } from '@/lib/config'

const WIKI_HOST = 'en.wikipedia.org'
const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) dashpage-suggestion-mode'

export class FetchUserEditedPageTitlesError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing_username' | 'user_not_found' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchUserEditedPageTitlesError'
  }
}

export interface FetchUserEditedPageTitlesOptions {
  signal?: AbortSignal
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchUserEditedPageTitlesError('Request aborted', 'aborted')
  }
}

function actionUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${WIKI_HOST}/w/api.php?${search.toString()}`
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  assertNotAborted(signal)
  const response = await fetch(url, {
    signal,
    headers: { 'Api-User-Agent': API_USER_AGENT },
  })
  if (!response.ok) {
    throw new FetchUserEditedPageTitlesError(`HTTP ${response.status}`, 'http')
  }
  return response.json()
}

export async function fetchUserEditedPageTitles(
  username: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<string[]> {
  const normalized = normalizeWikiUsername(username)
  if (!normalized.length) {
    throw new FetchUserEditedPageTitlesError('Enter a Wikipedia username in the user menu', 'missing_username')
  }

  const data = (await fetchJson(
    actionUrl({
      action: 'query',
      list: 'usercontribs',
      ucuser: normalized,
      ucnamespace: '0',
      uclimit: '500',
    }),
    options.signal,
  )) as {
    query?: {
      usercontribs?: Array<{ title?: string }>
    }
    error?: { code?: string; info?: string }
  }

  if (data.error?.code === 'missingtitle' || data.error?.code === 'nosuchuser') {
    throw new FetchUserEditedPageTitlesError('User not found', 'user_not_found')
  }

  const seen = new Set<string>()
  const titles: string[] = []

  for (const contrib of data.query?.usercontribs ?? []) {
    const title = typeof contrib.title === 'string' ? contrib.title.trim() : ''
    if (!title.length || seen.has(title)) continue
    seen.add(title)
    titles.push(title)
  }

  return titles
}

export async function fetchPageThumbnail(
  pageTitle: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<string | undefined> {
  const metadata = await fetchPagePreviewMetadata(pageTitle, options)
  return metadata.thumbnailSrc
}

export interface PagePreviewMetadata {
  thumbnailSrc?: string
  shortDescription?: string
}

export async function fetchPagePreviewMetadata(
  pageTitle: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<PagePreviewMetadata> {
  const trimmed = pageTitle.trim()
  if (!trimmed.length) return {}

  const slug = encodeURIComponent(trimmed.replace(/ /g, '_'))

  try {
    assertNotAborted(options.signal)
    const response = await fetch(`https://${WIKI_HOST}/api/rest_v1/page/summary/${slug}`, {
      signal: options.signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    })
    if (!response.ok) return {}
    const json = (await response.json()) as {
      description?: string
      thumbnail?: { source?: string }
    }
    return {
      thumbnailSrc: json.thumbnail?.source,
      shortDescription:
        typeof json.description === 'string' && json.description.trim().length
          ? json.description.trim()
          : undefined,
    }
  } catch {
    return {}
  }
}
