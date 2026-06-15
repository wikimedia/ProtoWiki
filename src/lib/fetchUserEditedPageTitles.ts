import { normalizeWikiUsername, wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'

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
  /** Max unique article titles to return (default 20). */
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
    formatversion: '2',
    origin: '*',
  })
  return `https://${wikiHost}/w/api.php?${search.toString()}`
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

/**
 * Unique article titles from a user's namespace-0 edit history (most recent first).
 */
export async function fetchUserEditedPageTitles(
  rawUsername: string,
  options: FetchUserEditedPageTitlesOptions = {},
): Promise<string[]> {
  const username = normalizeWikiUsername(rawUsername)
  if (!username.length) {
    throw new FetchUserEditedPageTitlesError('Enter a Wikipedia username', 'missing_username')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const limit = Math.max(1, Math.min(options.limit ?? MAX_SEED_PAGES, MAX_SEED_PAGES))
  const headers = wikimediaApiFetchHeaders('morelike-search')

  assertNotAborted(options.signal)

  const userResponse = await fetch(
    actionUrl(wikiHost, {
      action: 'query',
      list: 'users',
      ususers: username,
    }),
    {
      signal: options.signal,
      headers,
    },
  )

  if (!userResponse.ok) {
    throw new FetchUserEditedPageTitlesError(`HTTP ${userResponse.status}`, 'http')
  }

  const userData = (await userResponse.json()) as {
    query?: { users?: Array<{ name?: string; missing?: boolean }> }
  }

  const userInfo = userData.query?.users?.[0]
  if (!userInfo || userInfo.missing) {
    throw new FetchUserEditedPageTitlesError(`User "${username}" not found`, 'user_not_found')
  }

  const seen = new Set<string>()
  const titles: string[] = []
  let uccontinue: string | undefined

  for (let page = 0; page < MAX_CONTRIB_PAGES; page++) {
    assertNotAborted(options.signal)

    const params: Record<string, string> = {
      action: 'query',
      list: 'usercontribs',
      ucuser: username,
      ucnamespace: '0',
      uclimit: String(CONTRIBS_PER_PAGE),
    }
    if (uccontinue) params.uccontinue = uccontinue

    const response = await fetch(actionUrl(wikiHost, params), {
      signal: options.signal,
      headers,
    })

    if (!response.ok) {
      throw new FetchUserEditedPageTitlesError(`HTTP ${response.status}`, 'http')
    }

    const data = (await response.json()) as {
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

      if (titles.length >= limit) {
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
