import type { Icon } from '@wikimedia/codex-icons'

import {
  WIKITAB_SAVED_MODULE_SPEC,
  type WikitabCardData,
  type WikitabFeaturedSpotlight,
  type WikitabFeaturedSpotlightKind,
} from '../sections'
import { resolveEditOpportunityCopy } from './editOpportunityCopy'
import type { WikitabSearchActivityItem } from './fetchWikitabSearchActivity'
import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import type { WikitabSearchImage } from './fetchWikitabSearchImages'
import {
  savedArticleItemToCardPayload,
  savedArticlePayloadToCardData,
  savedChangeItemToCardPayload,
  savedDiscussionItemToCardPayload,
  savedDiscussionPayloadToCardData,
  savedImageItemToCardPayload,
  savedImagePayloadToCardData,
  featuredListPayloadToCardData,
  featuredListPayloadToSpotlight,
  featuredQuotePayloadToCardData,
  featuredQuotePayloadToSpotlight,
  featuredWordPayloadToCardData,
  featuredWordPayloadToSpotlight,
  savedListItemToFeaturedPayload,
  savedQuoteItemToFeaturedPayload,
  savedSnippetItemToCardPayload,
  savedSnippetPayloadToCardData,
  savedSuggestionItemToCardPayload,
  savedSuggestionPayloadToCardData,
  savedWordItemToFeaturedPayload,
  searchActivityCardPayloadToItem,
} from './wikitabCardPayloadMappers'
import {
  articleUrl,
  articleTitleKey,
  discussionThreadIdFromUrl,
  noticeboardPageFromDiscussionUrl,
} from './wikitabHtml'
import { wikitabCardDescriptionText } from './wikitabCardDescription'
import { wikitabCardMenuArticleTitle } from './wikitabCardLinkLabel'
import {
  listSavedId,
  quoteSavedId,
  savedIdForHookCard,
  savedIdForSpotlight,
  snippetSavedId,
  wordSavedId,
} from './savedItemIds'
import { resolveFeaturedSpotlightFile } from './resolveFeaturedSpotlightFile'
import {
  editOpportunityLabelToSavedIconId,
  iconToSavedId,
  resolveSavedIcon,
} from './wikitabSavedIcons'
import type {
  WikitabSavedArticleItem,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedImageItem,
  WikitabSavedItem,
  WikitabSavedListItem,
  WikitabSavedQuoteItem,
  WikitabSavedSnippetItem,
  WikitabSavedSnippetSource,
  WikitabSavedSuggestionItem,
  WikitabSavedWordItem,
} from './wikitabSavedItems'
import { savedItemSeedArticle } from './wikitabSavedItems'
import { seedArticle } from './wikitabSeedArticle'

export type {
  WikitabSavedArticleItem,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedImageItem,
  WikitabSavedItem,
  WikitabSavedListItem,
  WikitabSavedQuoteItem,
  WikitabSavedSnippetItem,
  WikitabSavedSnippetSource,
  WikitabSavedSuggestionItem,
  WikitabSavedWordItem,
} from './wikitabSavedItems'

export {
  listSavedId,
  quoteSavedId,
  savedIdForHookCard,
  savedIdForSpotlight,
  snippetSavedId,
  wordSavedId,
} from './savedItemIds'

export { cloneSavedItems } from './wikitabSavedItems'

export interface WikitabSavedArticleSeed {
  titleKey: string
  title: string
}

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

export function articleTitleFromCard(
  card: Pick<WikitabCardData, 'title' | 'description' | 'url'>,
): string {
  return wikitabCardMenuArticleTitle(card)
}

export function searchSavedCardId(title: string): string {
  const key = articleTitleKey(displayTitle(title))
  return key ? `search:${key}` : ''
}

export function suggestionSavedId(pageid: number, need: string): string {
  return `suggestion:${pageid}:${need}`
}

export function changeSavedId(revid: number): string {
  return `change:${revid}`
}

export function discussionSavedId(threadId: string): string {
  return `discussion:${threadId}`
}

export function discussionSavedIdFromUrl(url: string | undefined): string | null {
  const threadId = discussionThreadIdFromUrl(url)
  return threadId ? discussionSavedId(threadId) : null
}

export function imageSavedId(pageid: number): string {
  return `image:${pageid}`
}

export function buildSavedArticleFromCard(card: WikitabCardData): WikitabSavedArticleItem | null {
  const articleTitle = articleTitleFromCard(card)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue || !card.key) return null

  return {
    id: card.key,
    type: 'article',
    primitive: 'article',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    seedArticle: card.seedArticle ?? seedArticle(articleTitle, 'self'),
    title: displayTitle(card.title ?? articleTitle),
    url: card.url ?? articleUrl(articleTitle),
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
  }
}

/** DYK / In the news — save the hook itself; the bold link stays the identity and seed. */
export function buildSavedSnippetFromCard(
  card: WikitabCardData,
  source: WikitabSavedSnippetSource,
): WikitabSavedSnippetItem | null {
  const snippetHtml = wikitabCardDescriptionText(card)?.trim()
  const title = articleTitleFromCard(card)
  const key = articleTitleKey(title)
  const id = snippetHtml ? snippetSavedId(source, snippetHtml) : ''
  if (!snippetHtml || !key || !id || !card.url) return null

  return {
    id,
    type: 'snippet',
    primitive: 'snippet',
    savedAt: Date.now(),
    articleTitleKey: key,
    articleTitle: title,
    seedArticle: card.seedArticle ?? seedArticle(title, 'hook-link'),
    source,
    snippetHtml,
    url: card.url,
    thumbnailUrl: card.thumbnailUrl,
  }
}

/** On this day — save the linked article, not the hook snapshot. */
export function buildSavedArticleFromHookCard(card: WikitabCardData): WikitabSavedArticleItem | null {
  const title = articleTitleFromCard(card)
  const key = articleTitleKey(title)
  if (!key || !card.url) return null

  return {
    id: searchSavedCardId(title),
    type: 'article',
    primitive: 'article',
    savedAt: Date.now(),
    articleTitleKey: key,
    articleTitle: title,
    seedArticle: card.seedArticle ?? seedArticle(title, 'hook-link'),
    title,
    url: card.url,
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
  }
}

export function buildSavedWordFromSpotlight(
  spot: WikitabFeaturedSpotlight,
): WikitabSavedWordItem | null {
  const word = displayTitle(spot.title ?? '')
  const key = articleTitleKey(word)
  if (!key || !spot.url) return null

  return {
    id: wordSavedId(word),
    type: 'word',
    primitive: 'word',
    savedAt: Date.now(),
    articleTitleKey: key,
    articleTitle: word,
    seedArticle: spot.seedArticle,
    word,
    url: spot.url,
    description: wikitabCardDescriptionText(spot),
  }
}

export function buildSavedQuoteFromSpotlight(
  spot: WikitabFeaturedSpotlight,
): WikitabSavedQuoteItem | null {
  const quoteText = spot.title?.trim()
  const personName = spot.description?.trim() || undefined
  const key = articleTitleKey(personName ?? quoteText ?? 'quote')
  if (!key || !spot.url || !quoteText) return null

  return {
    id: quoteSavedId(personName ?? key),
    type: 'quote',
    primitive: 'quote',
    savedAt: Date.now(),
    articleTitleKey: key,
    articleTitle: personName ?? displayTitle(quoteText.slice(0, 80)),
    seedArticle: spot.seedArticle,
    url: spot.url,
    quoteText,
    personName,
  }
}

export function buildSavedListFromSpotlight(
  spot: WikitabFeaturedSpotlight,
): WikitabSavedListItem | null {
  const listTitle = displayTitle(spot.title ?? '')
  const key = articleTitleKey(listTitle)
  if (!key || !spot.url) return null

  return {
    id: listSavedId(listTitle),
    type: 'list',
    primitive: 'list',
    savedAt: Date.now(),
    articleTitleKey: key,
    articleTitle: listTitle,
    seedArticle: spot.seedArticle ?? seedArticle(listTitle, 'self'),
    listTitle,
    url: spot.url,
    description: spot.description,
    thumbnailUrl: spot.thumbnailUrl,
  }
}

export async function buildSavedImageFromFeaturedSpotlight(
  spot: WikitabFeaturedSpotlight,
  signal?: AbortSignal,
): Promise<WikitabSavedImageItem | null> {
  if (spot.kind !== 'tfp' && spot.kind !== 'potd') return null

  const resolved = await resolveFeaturedSpotlightFile(spot, signal)
  const fallbackThumb = spot.thumbnailUrl ?? ''
  const fallbackTitle = displayTitle(spot.title ?? spot.supportingText ?? 'Featured picture')

  const stableId = spot.kind === 'tfp' ? 'image:featured:tfp' : 'image:featured:potd'

  if (resolved && resolved.pageid > 0) {
    const title = displayTitle(resolved.title)
    const key = articleTitleKey(title)
    if (!key) return null
    return {
      id: stableId,
      type: 'image',
      primitive: 'image',
      savedAt: Date.now(),
      articleTitleKey: key,
      articleTitle: title,
      seedArticle: spot.seedArticle,
      pageid: resolved.pageid,
      title: resolved.title,
      description: resolved.description,
      thumbnailUrl: resolved.thumbnailUrl,
      filePageUrl: resolved.filePageUrl,
      licenseType: resolved.licenseType,
      artistHtml: resolved.artistHtml,
      captionHtml: resolved.html ?? wikitabCardDescriptionText(spot),
    }
  }

  if (!fallbackThumb && !wikitabCardDescriptionText(spot)) return null
  return {
    id: stableId,
    type: 'image',
    primitive: 'image',
    savedAt: Date.now(),
    articleTitleKey: stableId,
    articleTitle: fallbackTitle,
    seedArticle: spot.seedArticle,
    pageid: 0,
    title: fallbackTitle,
    description: spot.description ?? '',
    thumbnailUrl: fallbackThumb,
    filePageUrl: spot.url ?? '',
    licenseType: '',
    artistHtml: '',
    captionHtml: wikitabCardDescriptionText(spot),
  }
}

export function buildSavedArticleFromSearch(input: {
  title: string
  thumbnailUrl?: string
  description?: string
}): WikitabSavedArticleItem | null {
  const title = displayTitle(input.title)
  const articleTitleKeyValue = articleTitleKey(title)
  if (!articleTitleKeyValue) return null

  const id = `search:${articleTitleKeyValue}`

  return {
    id,
    type: 'article',
    primitive: 'article',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle: title,
    seedArticle: seedArticle(title, 'self'),
    title,
    url: articleUrl(title),
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
  }
}

export function buildSavedSuggestionFromCard(card: WikitabCardData): WikitabSavedSuggestionItem | null {
  if (card.pageid === undefined || !card.task || !card.url) {
    return null
  }

  const articleTitle = articleTitleFromCard(card)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue) return null

  return {
    id: suggestionSavedId(card.pageid, card.task),
    type: 'suggestion',
    primitive: 'suggestion',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    seedArticle: card.seedArticle ?? seedArticle(articleTitle, 'self'),
    pageid: card.pageid,
    task: card.task,
    suggestionLabel: resolveEditOpportunityCopy(card.task).title,
    body: card.suggestionBody ?? resolveEditOpportunityCopy(card.task).body,
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
    editUrl: card.url,
  }
}

export function buildSavedSuggestion(
  item: WikitabSearchContributeItem,
): WikitabSavedSuggestionItem | null {
  const articleTitle = displayTitle(item.articleTitle)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue) return null

  return {
    id: suggestionSavedId(item.pageid, item.task),
    type: 'suggestion',
    primitive: 'suggestion',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    seedArticle: seedArticle(articleTitle, 'self'),
    pageid: item.pageid,
    task: item.task,
    suggestionLabel: item.suggestionLabel,
    body: item.body,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    editUrl: item.editUrl,
  }
}

export function buildSavedImage(image: WikitabSearchImage): WikitabSavedImageItem | null {
  if (!Number.isInteger(image.pageid) || image.pageid <= 0) return null

  const title = displayTitle(image.title)
  const articleTitleKeyValue = articleTitleKey(title)
  if (!articleTitleKeyValue) return null

  return {
    id: imageSavedId(image.pageid),
    type: 'image',
    primitive: 'image',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle: title,
    seedArticle: image.seedArticle,
    pageid: image.pageid,
    title,
    description: image.caption,
    thumbnailUrl: image.thumbnailUrl,
    filePageUrl: image.filePageUrl,
    licenseType: image.license,
    artistHtml: image.credit,
  }
}

export function buildSavedChange(item: WikitabSearchActivityItem): WikitabSavedChangeItem | null {
  const articleTitle = displayTitle(item.articleTitle)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue) return null

  return {
    id: changeSavedId(item.revisionId),
    type: 'change',
    primitive: 'edit',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    seedArticle: seedArticle(articleTitle, 'edited-page'),
    revisionId: item.revisionId,
    pageid: item.pageid,
    editSummary: item.editSummary,
    diffUrl: item.diffUrl,
    delta: item.delta,
    editorName: item.editorName,
    editorKind: item.editorKind,
    editedRelative: item.editedRelative,
    editedTimestamp: item.editedTimestamp,
    highRevertRisk: item.highRevertRisk,
    isLatestRevision: item.isLatestRevision,
    reverted: item.reverted,
  }
}

export function buildSavedDiscussion(card: WikitabCardData): WikitabSavedDiscussionItem | null {
  const threadId = discussionThreadIdFromUrl(card.url)
  if (!threadId || !card.title) return null

  const noticeboardPage =
    (card.url ? noticeboardPageFromDiscussionUrl(card.url) : undefined) ?? ''
  const noticeboardLabel = card.description ?? noticeboardPage
  const noticeboardKey = articleTitleKey(noticeboardPage.replace(/ /g, '_')) ?? threadId

  return {
    id: discussionSavedId(threadId),
    type: 'discussion',
    primitive: 'discussion',
    savedAt: Date.now(),
    articleTitleKey: noticeboardKey,
    articleTitle: noticeboardPage || card.title,
    title: card.title,
    noticeboardPage,
    noticeboardLabel,
    commentCount: card.commentCount ?? parseCommentCountFromSupportingText(card.supportingText),
    latestReplyRelative: card.supportingTextEnd ?? '',
    url: card.url ?? '',
  }
}


function parseCommentCountFromSupportingText(supportingText: string | undefined): number {
  const text = supportingText ?? ''
  const match = text.match(/^(\d+)/)
  return match ? Number(match[1]) : 0
}

export function savedItemToActivityItem(item: WikitabSavedChangeItem): WikitabSearchActivityItem {
  const activity = searchActivityCardPayloadToItem(savedChangeItemToCardPayload(item))
  if (!item.editedTimestamp?.trim() && item.editedRelative) {
    return { ...activity, editedRelative: item.editedRelative, editedTimestamp: '' }
  }
  return activity
}

export function savedItemToContributeItem(item: WikitabSavedSuggestionItem): WikitabSearchContributeItem {
  return {
    pageid: item.pageid,
    articleTitle: item.articleTitle,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    suggestionLabel: item.suggestionLabel,
    body: item.body,
    task: item.task,
    editUrl: item.editUrl,
  }
}

export function savedItemToWikitabCard(item: WikitabSavedArticleItem): WikitabCardData {
  return {
    ...savedArticlePayloadToCardData(savedArticleItemToCardPayload(item)),
    supportingText: item.supportingText,
    supportingHtml: item.supportingHtml,
    supportingTextEnd: item.supportingTextEnd,
  }
}

export function savedSnippetToWikitabCard(item: WikitabSavedSnippetItem): WikitabCardData {
  return savedSnippetPayloadToCardData(savedSnippetItemToCardPayload(item))
}

export function savedSuggestionToWikitabCard(item: WikitabSavedSuggestionItem): WikitabCardData {
  return savedSuggestionPayloadToCardData(savedSuggestionItemToCardPayload(item))
}

export function savedWordToSpotlight(item: WikitabSavedWordItem): WikitabFeaturedSpotlight {
  return featuredWordPayloadToSpotlight(savedWordItemToFeaturedPayload(item))
}

export function savedWordToWikitabCard(item: WikitabSavedWordItem): WikitabCardData {
  return featuredWordPayloadToCardData(savedWordItemToFeaturedPayload(item), {
    showSpotlightLabel: false,
  })
}

export function savedQuoteToSpotlight(item: WikitabSavedQuoteItem): WikitabFeaturedSpotlight {
  return featuredQuotePayloadToSpotlight(savedQuoteItemToFeaturedPayload(item))
}

export function savedQuoteToWikitabCard(item: WikitabSavedQuoteItem): WikitabCardData {
  return featuredQuotePayloadToCardData(savedQuoteItemToFeaturedPayload(item), {
    showSpotlightLabel: false,
  })
}

export function savedListToSpotlight(item: WikitabSavedListItem): WikitabFeaturedSpotlight {
  return featuredListPayloadToSpotlight(savedListItemToFeaturedPayload(item))
}

export function savedListToWikitabCard(item: WikitabSavedListItem): WikitabCardData {
  return featuredListPayloadToCardData(savedListItemToFeaturedPayload(item), {
    showSpotlightLabel: false,
  })
}

export function savedImageToWikitabCard(item: WikitabSavedImageItem): WikitabCardData {
  return savedImagePayloadToCardData(savedImageItemToCardPayload(item))
}

export function savedDiscussionToWikitabCard(item: WikitabSavedDiscussionItem): WikitabCardData {
  return savedDiscussionPayloadToCardData(savedDiscussionItemToCardPayload(item))
}

export function uniqueArticleSeedsFromSavedItems(
  items: readonly WikitabSavedItem[],
): WikitabSavedArticleSeed[] {
  const byKey = new Map<string, WikitabSavedArticleSeed>()

  for (const saved of items) {
    const seed = savedItemSeedArticle(saved)
    if (seed && !byKey.has(seed.titleKey)) {
      byKey.set(seed.titleKey, { titleKey: seed.titleKey, title: seed.title })
    }
  }

  return [...byKey.values()]
}

export function savedItemRevealCard(item: WikitabSavedItem): WikitabCardData {
  return { key: item.id }
}

/** Save intent — always names the card {@link WikitabCardPrimitiveId}, not a feed module. */
export type SaveItemPayload =
  | { primitive: 'article'; card: WikitabCardData; hookArticle?: boolean }
  | { primitive: 'snippet'; card: WikitabCardData; source: WikitabSavedSnippetSource }
  | { primitive: 'word' | 'quote' | 'list' | 'image'; spotlight: WikitabFeaturedSpotlight }
  | { primitive: 'suggestion' | 'discussion'; card: WikitabCardData }

export function saveItemPayloadNeedsFeaturedImageFetch(payload: SaveItemPayload): boolean {
  return payload.primitive === 'image'
}

export function buildSavedItemFromPayload(payload: SaveItemPayload): WikitabSavedItem | null {
  switch (payload.primitive) {
    case 'article':
      return payload.hookArticle
        ? buildSavedArticleFromHookCard(payload.card)
        : buildSavedArticleFromCard(payload.card)
    case 'snippet':
      return buildSavedSnippetFromCard(payload.card, payload.source)
    case 'word':
      return buildSavedWordFromSpotlight(payload.spotlight)
    case 'quote':
      return buildSavedQuoteFromSpotlight(payload.spotlight)
    case 'list':
      return buildSavedListFromSpotlight(payload.spotlight)
    case 'suggestion':
      return buildSavedSuggestionFromCard(payload.card)
    case 'discussion':
      return buildSavedDiscussion(payload.card)
    default:
      return null
  }
}

export async function buildSavedItemFromPayloadAsync(
  payload: SaveItemPayload,
  signal?: AbortSignal,
): Promise<WikitabSavedItem | null> {
  if (saveItemPayloadNeedsFeaturedImageFetch(payload)) {
    return buildSavedImageFromFeaturedSpotlight(payload.spotlight, signal)
  }
  return buildSavedItemFromPayload(payload)
}

export function savedIdFromPayload(payload: SaveItemPayload): string | null {
  switch (payload.primitive) {
    case 'article': {
      const built = payload.hookArticle
        ? buildSavedArticleFromHookCard(payload.card)
        : buildSavedArticleFromCard(payload.card)
      return built?.id ?? null
    }
    case 'snippet':
      return buildSavedSnippetFromCard(payload.card, payload.source)?.id ?? null
    case 'word':
      return buildSavedWordFromSpotlight(payload.spotlight)?.id ?? null
    case 'quote':
      return buildSavedQuoteFromSpotlight(payload.spotlight)?.id ?? null
    case 'list':
      return buildSavedListFromSpotlight(payload.spotlight)?.id ?? null
    case 'image':
      return savedIdForSpotlight(payload.spotlight)
    case 'suggestion':
      return buildSavedSuggestionFromCard(payload.card)?.id ?? null
    case 'discussion':
      return buildSavedDiscussion(payload.card)?.id ?? null
    default:
      return null
  }
}
