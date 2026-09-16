import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import type { WikitabCardData } from '../sections'
import { EN_WIKI_HOST } from './wikitabHtml'

const CONCURRENCY = 3

/** `null` records "asked, and there is no thumbnail", so it is never re-asked. */
const thumbnailByTitle = new Map<string, string | null>()

async function fetchThumbnail(title: string, signal?: AbortSignal): Promise<string | null> {
  const url = `https://${EN_WIKI_HOST}/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, '_'),
  )}?redirect=true`

  try {
    const response = await fetchWikimedia(url, {
      headers: wikimediaApiFetchHeaders('wikitab-dyk-thumbnail'),
      signal,
    })
    if (!response.ok) return null
    const summary = (await response.json()) as { thumbnail?: { source?: string } }
    return summary.thumbnail?.source ?? null
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    return null
  }
}

/**
 * DYK hooks carry no thumbnail, so each one's subject page has to be fetched.
 * Called per revealed page rather than for all nine hooks up front.
 */
export async function resolveDykThumbnails(
  cards: WikitabCardData[],
  signal?: AbortSignal,
): Promise<void> {
  const pending = cards.filter(
    (card) =>
      card.thumbnailTitle &&
      !card.thumbnailUrl &&
      !thumbnailByTitle.has(card.thumbnailTitle),
  )

  const titles = [...new Set(pending.map((card) => card.thumbnailTitle as string))]
  if (titles.length) {
    const sources = await mapWithConcurrency(
      titles,
      CONCURRENCY,
      (title) => fetchThumbnail(title, signal),
      signal,
    )
    titles.forEach((title, index) => thumbnailByTitle.set(title, sources[index]))
  }

  for (const card of cards) {
    if (!card.thumbnailTitle || card.thumbnailUrl) continue
    card.thumbnailUrl = thumbnailByTitle.get(card.thumbnailTitle) ?? undefined
  }
}
