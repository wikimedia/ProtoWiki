import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { EN_WIKI_HOST } from './wikitabHtml'

/** Action API batch size for pageprops lookups. */
const PAGEIDS_PER_FETCH = 50

type PagePropsRow = {
  pageid?: number
  pageprops?: { disambiguation?: string }
}

/**
 * Returns pageids that are disambiguation pages (Action API pageprops).
 * On API failure, returns an empty set so callers keep all input (fail open).
 */
export async function filterDisambiguationPageIds(
  pageIds: number[],
  options: { signal?: AbortSignal } = {},
): Promise<Set<number>> {
  const unique = [...new Set(pageIds.filter((id) => id > 0))]
  const disambiguationIds = new Set<number>()
  if (!unique.length) return disambiguationIds

  for (let index = 0; index < unique.length; index += PAGEIDS_PER_FETCH) {
    const batch = unique.slice(index, index + PAGEIDS_PER_FETCH)
    const params = new URLSearchParams({
      action: 'query',
      prop: 'pageprops',
      ppprop: 'disambiguation',
      pageids: batch.join('|'),
      format: 'json',
      formatversion: '2',
      origin: '*',
    })

    const response = await fetchWikimedia(
      `https://${EN_WIKI_HOST}/w/api.php?${params.toString()}`,
      {
        signal: options.signal,
        headers: wikimediaApiFetchHeaders('wikitab-search'),
      },
    )

    if (!response.ok) return new Set()

    const data = (await response.json()) as {
      query?: { pages?: PagePropsRow[] }
    }

    for (const page of data.query?.pages ?? []) {
      if (
        typeof page.pageid === 'number' &&
        page.pageprops?.disambiguation !== undefined
      ) {
        disambiguationIds.add(page.pageid)
      }
    }
  }

  return disambiguationIds
}
