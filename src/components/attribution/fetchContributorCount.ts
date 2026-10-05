import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

import { AttributionApiError, type FetchContributorCountOptions } from './types'

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AttributionApiError('Request aborted', 'aborted')
  }
}

function editorsCountUrl(host: string, title: string): string {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'))
  return `https://${host}/w/rest.php/v1/page/${encodedTitle}/history/counts/editors`
}

/**
 * Distinct editor count for a page. Backfills `trust_and_relevance.contributor_counts`
 * while the Attribution API beta returns null for that field.
 */
export async function fetchContributorCount(
  title: string,
  options: FetchContributorCountOptions = {},
): Promise<number | null> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return null

  const { signal, apiContact } = options
  assertNotAborted(signal)

  const host = options.host ?? wikiHostFromLang('en')
  const url = editorsCountUrl(host, trimmedTitle)

  const response = await fetch(url, {
    signal,
    headers: wikimediaApiFetchHeaders('attribution-editors', apiContact),
  })

  assertNotAborted(signal)

  if (!response.ok) {
    return null
  }

  const raw: unknown = await response.json()
  if (typeof raw !== 'object' || raw === null) return null

  const count = (raw as Record<string, unknown>).count
  return typeof count === 'number' ? count : null
}
