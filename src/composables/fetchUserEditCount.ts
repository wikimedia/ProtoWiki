import { normalizeWikiUsername, wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

/**
 * Lifetime edit count for a wiki user (`list=users`, `usprop=editcount`).
 */
export async function fetchUserEditCount(
  lang: string,
  rawUsername: string,
  signal?: AbortSignal,
): Promise<number> {
  const username = normalizeWikiUsername(rawUsername)
  if (!username.length) return 0

  const host = wikiHostFromLang(lang)
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    list: 'users',
    ususers: username,
    usprop: 'editcount',
  })
  const response = await fetch(`https://${host}/w/api.php?${params}`, {
    signal,
    headers: wikimediaApiFetchHeaders('user-editcount'),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  const userInfo = data?.query?.users?.[0]
  if (!userInfo || userInfo.missing) return 0
  return typeof userInfo.editcount === 'number' ? userInfo.editcount : 0
}
