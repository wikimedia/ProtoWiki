import { normalizeWikiUsername, wikimediaApiFetchHeaders } from '@/config'
import { t } from '@/i18n'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { wikiActionUrl } from '../../musical-group/data/enwikiTitle'

export const MAX_FETCHED_EDITED_PAGES = 10
const CONTRIB_FETCH_LIMIT = 50

export class FetchUserEditedPagesError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing_username' | 'user_not_found' | 'no_edits' | 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'FetchUserEditedPagesError'
  }
}

interface UserContrib {
  title: string
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FetchUserEditedPagesError('Request aborted', 'aborted')
  }
}

/** Recent unique main-namespace article titles edited by an English Wikipedia user. */
export async function fetchUserEditedPages(
  rawUsername: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const username = normalizeWikiUsername(rawUsername)
  if (!username) {
    throw new FetchUserEditedPagesError(t('data.editedPagesMissingUsername'), 'missing_username')
  }

  assertNotAborted(signal)

  const usersResponse = await fetchWikimedia(
    wikiActionUrl({
      action: 'query',
      list: 'users',
      ususers: username,
    }),
    { signal, headers: wikimediaApiFetchHeaders('wikita-lite-edited-pages') },
  )
  if (!usersResponse.ok) {
    throw new FetchUserEditedPagesError(`HTTP ${usersResponse.status}`, 'http')
  }

  const usersJson = (await usersResponse.json()) as {
    query?: { users?: Array<{ missing?: boolean }> }
  }
  const userInfo = usersJson.query?.users?.[0]
  if (!userInfo || userInfo.missing) {
    throw new FetchUserEditedPagesError(t('data.editedPagesUserNotFound', username), 'user_not_found')
  }

  assertNotAborted(signal)

  const contribsResponse = await fetchWikimedia(
    wikiActionUrl({
      action: 'query',
      list: 'usercontribs',
      ucuser: username,
      ucnamespace: '0',
      uclimit: String(CONTRIB_FETCH_LIMIT),
    }),
    { signal, headers: wikimediaApiFetchHeaders('wikita-lite-edited-pages') },
  )
  if (!contribsResponse.ok) {
    throw new FetchUserEditedPagesError(`HTTP ${contribsResponse.status}`, 'http')
  }

  const contribsJson = (await contribsResponse.json()) as {
    query?: { usercontribs?: UserContrib[] }
  }
  const contribs = contribsJson.query?.usercontribs ?? []

  const seen = new Set<string>()
  const titles: string[] = []
  for (const contrib of contribs) {
    const key = contrib.title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    titles.push(contrib.title)
    if (titles.length >= MAX_FETCHED_EDITED_PAGES) break
  }

  if (!titles.length) {
    throw new FetchUserEditedPagesError(
      t('data.editedPagesNoEdits', username),
      'no_edits',
    )
  }

  return titles
}
