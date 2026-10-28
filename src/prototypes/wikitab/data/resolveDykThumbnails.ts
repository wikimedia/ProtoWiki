import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import type { WikitabCardData } from '../sections'
import { wikitabCardDescriptionHasHtmlMarkup, wikitabCardDescriptionText } from './wikitabCardDescription'
import { wikitabCardMenuArticleTitle } from './wikitabCardLinkLabel'
import { WIKITAB_FEED_CARD_THUMB_WIDTH, wikimediaThumbnailAtLeast } from './wikimediaThumbnailUrl'
import { EN_WIKI_HOST, isEnWikiMainNamespaceArticleTitle } from './wikitabHtml'

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

function hookThumbnailSubject(card: WikitabCardData): string | null {
  if (card.thumbnailUrl) return null
  const body = wikitabCardDescriptionText(card)
  if (!body || !wikitabCardDescriptionHasHtmlMarkup(body)) return null
  const subject = wikitabCardMenuArticleTitle(card).trim()
  if (!subject || !isEnWikiMainNamespaceArticleTitle(subject)) return null
  return subject
}

/** True when the card has no thumbnail yet but its subject page might supply one. */
export function cardNeedsThumbnailLookup(card: WikitabCardData): boolean {
  return hookThumbnailSubject(card) !== null
}

/**
 * DYK hooks carry no thumbnail, so each one's subject page has to be fetched.
 * Called per revealed page rather than for all nine hooks up front. `onResolved`
 * fires per card as soon as its own lookup settles — synchronously for cached
 * subjects — with the thumbnail URL, or `null` when the subject has none.
 */
export async function resolveDykThumbnails(
  cards: WikitabCardData[],
  signal?: AbortSignal,
  onResolved?: (card: WikitabCardData, thumbnailUrl: string | null) => void,
): Promise<void> {
  const cardsBySubject = new Map<string, WikitabCardData[]>()
  for (const card of cards) {
    const subject = hookThumbnailSubject(card)
    if (!subject) continue
    const group = cardsBySubject.get(subject)
    if (group) group.push(card)
    else cardsBySubject.set(subject, [card])
  }

  function apply(subject: string): void {
    const source = thumbnailByTitle.get(subject) ?? null
    const thumbnailUrl = source
      ? wikimediaThumbnailAtLeast(source, WIKITAB_FEED_CARD_THUMB_WIDTH)
      : null
    for (const card of cardsBySubject.get(subject) ?? []) {
      if (thumbnailUrl) card.thumbnailUrl = thumbnailUrl
      onResolved?.(card, thumbnailUrl)
    }
  }

  const uncached: string[] = []
  for (const subject of cardsBySubject.keys()) {
    if (thumbnailByTitle.has(subject)) apply(subject)
    else uncached.push(subject)
  }
  if (!uncached.length) return

  await mapWithConcurrency(
    uncached,
    CONCURRENCY,
    async (subject) => {
      const source = await fetchThumbnail(subject, signal)
      thumbnailByTitle.set(subject, source)
      if (!signal?.aborted) apply(subject)
      return source
    },
    signal,
  )
}
