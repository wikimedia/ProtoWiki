import { normalizeWikiUsername, wikiHostFromLang } from '@/lib/config'

const API_USER_AGENT =
  'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) dashpage-suggestion-mode'

const CONTRIBS_PER_PAGE = 500
const MAX_CONTRIB_PAGES = 5
export const MAX_SEED_PAGES = 20

export class FetchUserEditedPageTitlesError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'missing_username'
      | 'user_not_found'
      | 'no_edits'
      | 'aborted'
      | 'http',
  ) {
    super(message)
    this.name = 'FetchUserEditedPageTitlesError'
  }
}

export interface FetchUserEditedPageTitlesOptions {
  signal?: AbortSignal
  /** Wikipedia language code (default `en`). */
  lang?: string
  /** Max unique article titles to return (caps at {@link MAX_SEED_PAGES}). */
  limit?: number
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchUserEditedPageTitlesError('Request aborted', 'aborted')
  }
}

function actionUrl(wikiHost: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

function wikiHostFromOptions(options: FetchUserEditedPageTitlesOptions): string {
  return wikiHostFromLang(options.lang ?? 'en')
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

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

/**
 * Unique article titles from a user's namespace-0 edit history (most recent first).
 */
export async function fetchUserEditedPageTitles(
  username: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<string[]> {
  const normalized = normalizeWikiUsername(username)
  if (!normalized.length) {
    throw new FetchUserEditedPageTitlesError('Enter a Wikipedia username in the user menu', 'missing_username')
  }

  const wikiHost = wikiHostFromOptions(options)
  const limit =
    options.limit !== undefined
      ? Math.max(1, Math.min(options.limit, MAX_SEED_PAGES))
      : undefined

  assertNotAborted(options.signal)

  const userData = (await fetchJson(
    actionUrl(wikiHost, {
      action: 'query',
      list: 'users',
      ususers: normalized,
    }),
    options.signal,
  )) as {
    query?: { users?: Array<{ name?: string; missing?: boolean }> }
  }

  const userInfo = userData.query?.users?.[0]
  if (!userInfo || userInfo.missing) {
    throw new FetchUserEditedPageTitlesError(`User "${normalized}" not found`, 'user_not_found')
  }

  const seen = new Set<string>()
  const titles: string[] = []
  let uccontinue: string | undefined

  for (let page = 0; page < MAX_CONTRIB_PAGES; page++) {
    assertNotAborted(options.signal)

    const params: Record<string, string> = {
      action: 'query',
      list: 'usercontribs',
      ucuser: normalized,
      ucnamespace: '0',
      uclimit: String(CONTRIBS_PER_PAGE),
    }
    if (uccontinue) params.uccontinue = uccontinue

    const data = (await fetchJson(actionUrl(wikiHost, params), options.signal)) as {
      query?: { usercontribs?: Array<{ title?: string }> }
      continue?: { uccontinue?: string }
    }

    for (const contrib of data.query?.usercontribs ?? []) {
      const title = typeof contrib.title === 'string' ? contrib.title.trim() : ''
      if (!title.length) continue

      const key = normalizeTitleKey(title)
      if (seen.has(key)) continue

      seen.add(key)
      titles.push(title)

      if (limit !== undefined && titles.length >= limit) {
        return titles
      }
    }

    uccontinue = data.continue?.uccontinue
    if (!uccontinue) break
  }

  if (!titles.length) {
    throw new FetchUserEditedPageTitlesError('No article edits found', 'no_edits')
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

function normalizePreviewLookupTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

function previewFromQueryPage(page: {
  title?: string
  missing?: string
  description?: string
  thumbnail?: { source?: string }
}): PagePreviewMetadata | null {
  if (page.missing) return null
  const title = typeof page.title === 'string' ? page.title.trim() : ''
  if (!title.length) return null
  return {
    thumbnailSrc: page.thumbnail?.source,
    shortDescription:
      typeof page.description === 'string' && page.description.trim().length
        ? page.description.trim()
        : undefined,
  }
}

/**
 * Lead-image thumbnail from REST summary. Used when Action API `pageimages` has none
 * (e.g. Gorillaz — infobox image exists but no page-level image is set).
 */
async function fetchRestSummaryThumbnail(
  pageTitle: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<string | undefined> {
  const trimmed = pageTitle.trim()
  if (!trimmed.length) return undefined

  const slug = encodeURIComponent(trimmed.replace(/ /g, '_'))
  const wikiHost = wikiHostFromOptions(options)

  try {
    assertNotAborted(options.signal)
    const response = await fetch(`https://${wikiHost}/api/rest_v1/page/summary/${slug}`, {
      signal: options.signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    })
    if (!response.ok) return undefined
    const json = (await response.json()) as { thumbnail?: { source?: string } }
    return json.thumbnail?.source
  } catch {
    return undefined
  }
}

/** One Action API query for up to 50 titles (thumbnail + short description). */
export async function fetchPagePreviewMetadataBatch(
  pageTitles: string[],
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<Record<string, PagePreviewMetadata>> {
  const titles = [...new Set(pageTitles.map((title) => title.trim()).filter(Boolean))]
  const out: Record<string, PagePreviewMetadata> = {}
  if (!titles.length) return out

  const wikiHost = wikiHostFromOptions(options)

  for (let offset = 0; offset < titles.length; offset += 50) {
    const chunk = titles.slice(offset, offset + 50)
    const requestedByNormalized = new Map(
      chunk.map((title) => [normalizePreviewLookupTitle(title).toLowerCase(), title]),
    )

    try {
      assertNotAborted(options.signal)
      const data = (await fetchJson(
        actionUrl(wikiHost, {
          action: 'query',
          prop: 'pageimages|description',
          piprop: 'thumbnail',
          pithumbsize: '320',
          titles: chunk.join('|'),
        }),
        options.signal,
      )) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string
              missing?: string
              description?: string
              thumbnail?: { source?: string }
            }
          >
        }
      }

      for (const page of Object.values(data.query?.pages ?? {})) {
        const preview = previewFromQueryPage(page)
        if (!preview || !page.title) continue

        out[page.title] = preview

        const requested =
          requestedByNormalized.get(normalizePreviewLookupTitle(page.title).toLowerCase())
        if (requested) {
          out[requested] = preview
        }
      }
    } catch {
      // Best-effort batch; callers fall back to empty previews per title.
    }
  }

  const needsThumbnail = titles.filter((title) => !(out[title]?.thumbnailSrc?.length))
  if (needsThumbnail.length) {
    await Promise.all(
      needsThumbnail.map(async (title) => {
        const thumbnailSrc = await fetchRestSummaryThumbnail(title, options)
        if (!thumbnailSrc) return
        out[title] = { ...out[title], thumbnailSrc }
      }),
    )
  }

  return out
}

export async function fetchPagePreviewMetadata(
  pageTitle: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<PagePreviewMetadata> {
  const trimmed = pageTitle.trim()
  if (!trimmed.length) return {}

  const batch = await fetchPagePreviewMetadataBatch([trimmed], options)
  return batch[trimmed] ?? Object.values(batch)[0] ?? {}
}
