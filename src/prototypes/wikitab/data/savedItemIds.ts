import type { WikitabCardData, WikitabFeaturedSpotlight } from '../sections'
import { articleTitleKey } from './wikitabHtml'
import { wikitabCardDescriptionText } from './wikitabCardDescription'
import { wikitabCardMenuArticleTitle } from './wikitabCardLinkLabel'

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

export function wordSavedId(word: string): string {
  const key = articleTitleKey(displayTitle(word))
  return key ? `word:${key}` : ''
}

export function quoteSavedId(personOrKey: string): string {
  const key = articleTitleKey(displayTitle(personOrKey))
  return key ? `quote:${key}` : ''
}

export function listSavedId(listTitle: string): string {
  const key = articleTitleKey(displayTitle(listTitle))
  return key ? `list:${key}` : ''
}

export function savedIdForSpotlight(spot: WikitabFeaturedSpotlight): string {
  switch (spot.kind) {
    case 'tfa':
      return spot.key
    case 'tfl':
      return listSavedId(spot.title ?? '')
    case 'wotd':
      return wordSavedId(spot.title ?? '')
    case 'qotd':
      return quoteSavedId(
        spot.supportingText ??
          spot.title ??
          wikitabCardDescriptionText(spot)?.slice(0, 40) ??
          'quote',
      )
    case 'tfp':
      return 'image:featured:tfp'
    case 'potd':
      return 'image:featured:potd'
    default:
      return spot.key
  }
}

function hashString(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

/** Keyed on the hook's text, so the same hook keeps its id across days and HTML tweaks. */
export function snippetSavedId(source: 'dyk' | 'news', snippetHtml: string): string {
  const text = snippetHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text ? `snippet:${source}:${hashString(text)}` : ''
}

export function savedIdForHookCard(
  card: Pick<WikitabCardData, 'title' | 'description' | 'url'>,
): string {
  const title = wikitabCardMenuArticleTitle(card)
  const key = articleTitleKey(title)
  return key ? `search:${key}` : ''
}
