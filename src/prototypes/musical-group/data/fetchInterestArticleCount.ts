import { wikimediaApiFetchHeaders } from '@/config'

import { wikiActionUrl } from './enwikiTitle'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

/** Approximate article count matching selected interest titles (OR search). */
export async function fetchInterestArticleCount(
  interests: string[],
  signal?: AbortSignal,
): Promise<number | null> {
  if (!interests.length) return null

  const query =
    interests.length === 1
      ? interests[0]
      : interests.map((title) => `"${title.replace(/"/g, '')}"`).join(' OR ')

  const url = wikiActionUrl({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '0',
    srlimit: '1',
    srinfo: 'totalhits',
  })

  const response = await fetchWikimedia(url, {
    signal,
    headers: wikimediaApiFetchHeaders('wikita-lite-interest-count'),
  })
  if (!response.ok) return null

  const json = (await response.json()) as {
    query?: { searchinfo?: { totalhits?: number } }
  }
  const total = json.query?.searchinfo?.totalhits
  return typeof total === 'number' ? total : null
}
