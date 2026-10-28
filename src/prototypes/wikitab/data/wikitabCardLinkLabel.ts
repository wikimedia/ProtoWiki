import type { WikitabCardData } from '../sections'
import { resolveEditOpportunityCopy } from './editOpportunityCopy'
import {
  wikitabCardDescriptionHasHtmlMarkup,
  wikitabCardDescriptionText,
  type WikitabCardDescriptionSource,
} from './wikitabCardDescription'
import { articleTitleFromWikiUrl, primaryLinkTitle } from './wikitabHtml'
import { isWikitabSuggestedEditTaskNeed } from './wikitabSuggestedEditTaskNeed'

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

export function suggestedEditAccessibleLinkTitle(articleTitle: string, taskLabel: string): string {
  return `Edit ${articleTitle}: ${taskLabel}`
}

/** Plain article / hook subject for hide-menu and saved identity (not the full edit aria phrase). */
export function wikitabCardMenuArticleTitle(
  card: (Pick<WikitabCardData, 'title' | 'url'> & WikitabCardDescriptionSource) | undefined,
): string {
  if (!card) return ''
  const body = wikitabCardDescriptionText(card)
  if (body && wikitabCardDescriptionHasHtmlMarkup(body)) {
    return displayTitle(
      primaryLinkTitle(body) ?? articleTitleFromWikiUrl(card.url ?? '') ?? '',
    )
  }
  return displayTitle(card.title ?? '')
}

/** Accessible name for the card-wide overlay link. */
function suggestedEditTaskLabel(task: string): string {
  return isWikitabSuggestedEditTaskNeed(task)
    ? resolveEditOpportunityCopy(task).title
    : task
}

export function wikitabCardWideLinkAriaLabel(
  card: Pick<WikitabCardData, 'title' | 'url' | 'task' | 'supportingText'> &
    WikitabCardDescriptionSource,
): string {
  if (card.task && card.title?.trim()) {
    return suggestedEditAccessibleLinkTitle(card.title.trim(), suggestedEditTaskLabel(card.task))
  }
  const body = wikitabCardDescriptionText(card)
  if (body && wikitabCardDescriptionHasHtmlMarkup(body)) {
    return displayTitle(
      primaryLinkTitle(body) ??
        articleTitleFromWikiUrl(card.url ?? '') ??
        'Wikipedia article',
    )
  }
  if (card.title?.trim()) return card.title.trim()
  if (card.supportingText?.trim()) return card.supportingText.trim()
  return 'Wikipedia article'
}
