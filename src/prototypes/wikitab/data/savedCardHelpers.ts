import type { Icon } from '@wikimedia/codex-icons'

import {
  WIKITAB_SAVED_MODULE_SPEC,
  type WikitabCardData,
  type WikitabCardVariant,
  type WikitabModuleId,
  type WikitabSectionSpec,
} from '../sections'
import type { WikitabSearchActivityItem } from './fetchWikitabSearchActivity'
import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import {
  formatImageAttribution,
  imageDisplayTitle,
  type WikitabSearchImage,
} from './fetchWikitabSearchImages'
import { articleUrl, articleTitleKey, expandDykHookHtml } from './wikitabHtml'
import {
  editOpportunityLabelToSavedIconId,
  iconToSavedId,
  resolveSavedIcon,
} from './wikitabSavedIcons'
import type {
  WikitabSavedArticleItem,
  WikitabSavedCardData,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedImageItem,
  WikitabSavedItem,
  WikitabSavedSnippetItem,
  WikitabSavedSnippetPresentation,
  WikitabSavedSuggestionItem,
} from './wikitabSavedItems'

export type {
  WikitabSavedArticleItem,
  WikitabSavedCardData,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedImageItem,
  WikitabSavedItem,
  WikitabSavedSnippetItem,
  WikitabSavedSuggestionItem,
} from './wikitabSavedItems'

export { cloneSavedItems } from './wikitabSavedItems'

export interface WikitabSavedArticleSeed {
  titleKey: string
  title: string
}

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

export function articleTitleFromCard(card: Pick<WikitabCardData, 'linkTitle' | 'title'>): string {
  return displayTitle(card.title ?? card.linkTitle ?? '')
}

function serializeSupportingSignals(
  signals: WikitabCardData['supportingSignals'],
): WikitabSavedCardData['supportingSignals'] {
  if (!signals?.length) return undefined
  return signals
    .map((signal) => {
      const iconId = iconToSavedId(signal.icon) ?? editOpportunityLabelToSavedIconId(signal.text)
      return { icon: iconId, text: signal.text }
    })
    .filter((signal): signal is { icon: import('./wikitabSavedIcons').WikitabSavedIconId; text: string } =>
      Boolean(signal.icon && signal.text),
    )
}

function serializeCardData(card: WikitabCardData): WikitabSavedCardData {
  return {
    key: card.key,
    href: card.href,
    linkTitle: card.linkTitle,
    title: card.title,
    description: card.description,
    html: card.html,
    thumbnailUrl: card.thumbnailUrl,
    thumbnailTitle: card.thumbnailTitle,
    supportingText: card.supportingText,
    supportingSignals: serializeSupportingSignals(card.supportingSignals),
    supportingTextEnd: card.supportingTextEnd,
  }
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
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    title: displayTitle(card.title ?? card.linkTitle ?? articleTitle),
    href: card.href ?? articleUrl(articleTitle),
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
  }
}

export function buildSavedSnippet(
  card: WikitabCardData,
  spec: Pick<WikitabSectionSpec, 'id' | 'cardHeight' | 'thumbnailSize' | 'supportingIcon'>,
): WikitabSavedSnippetItem | null {
  if (spec.id !== 'dyk' && spec.id !== 'otd' && spec.id !== 'news') return null

  const articleTitle = articleTitleFromCard(card)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue || !card.key) return null

  const presentation: WikitabSavedSnippetPresentation = {
    variant: 'text',
    cardHeight: spec.cardHeight,
    thumbnailSize: spec.thumbnailSize,
    fullHook: true,
    supportingIcon: spec.supportingIcon ? iconToSavedId(spec.supportingIcon) : undefined,
  }

  return {
    id: card.key,
    type: 'snippet',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    source: spec.id,
    presentation,
    card: serializeCardData(card),
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
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle: title,
    title,
    href: articleUrl(title),
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
  }
}

export function buildSavedSuggestionFromCard(card: WikitabCardData): WikitabSavedSuggestionItem | null {
  if (card.pageid === undefined || !card.suggestionNeed || !card.suggestionLabel || !card.editHref) {
    return null
  }

  const articleTitle = articleTitleFromCard(card)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue) return null

  return {
    id: suggestionSavedId(card.pageid, card.suggestionNeed),
    type: 'suggestion',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    pageid: card.pageid,
    need: card.suggestionNeed,
    suggestionLabel: card.suggestionLabel,
    body: card.suggestionBody ?? card.description ?? '',
    description: card.description,
    thumbnailUrl: card.thumbnailUrl,
    editHref: card.editHref,
  }
}

export function buildSavedSuggestion(
  item: WikitabSearchContributeItem,
): WikitabSavedSuggestionItem | null {
  const articleTitle = displayTitle(item.title)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue) return null

  return {
    id: suggestionSavedId(item.pageid, item.need),
    type: 'suggestion',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    pageid: item.pageid,
    need: item.need,
    suggestionLabel: item.suggestionLabel,
    body: item.body,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    editHref: item.editHref,
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
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle: title,
    pageid: image.pageid,
    title,
    description: image.description,
    thumbnailUrl: image.thumbnailUrl,
    filePageUrl: image.filePageUrl,
    licenseType: image.licenseType,
    artistHtml: image.artistHtml,
  }
}

export function buildSavedChange(item: WikitabSearchActivityItem): WikitabSavedChangeItem | null {
  const articleTitle = displayTitle(item.title)
  const articleTitleKeyValue = articleTitleKey(articleTitle)
  if (!articleTitleKeyValue) return null

  return {
    id: changeSavedId(item.revid),
    type: 'change',
    savedAt: Date.now(),
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    revid: item.revid,
    pageid: item.pageid,
    editSummary: item.editSummary,
    diffUrl: item.diffUrl,
    thumbnailUrl: item.thumbnailUrl,
    charsAdded: item.charsAdded,
    charsRemoved: item.charsRemoved,
    editorName: item.editorName,
    editorKind: item.editorKind,
    editedRelative: item.editedRelative,
    highRevertRisk: item.highRevertRisk,
    isLatest: item.isLatest,
    reverted: item.reverted,
  }
}

export function buildSavedDiscussion(card: WikitabCardData): WikitabSavedDiscussionItem | null {
  const threadId = card.threadId ?? parseThreadIdFromHref(card.href)
  if (!threadId || !card.title) return null

  const noticeboardPage = card.noticeboardPage ?? parseNoticeboardPageFromHref(card.href) ?? ''
  const noticeboardLabel = card.description ?? noticeboardPage
  const noticeboardKey = articleTitleKey(noticeboardPage.replace(/ /g, '_')) ?? threadId

  return {
    id: discussionSavedId(threadId),
    type: 'discussion',
    savedAt: Date.now(),
    articleTitleKey: noticeboardKey,
    articleTitle: noticeboardPage || card.title,
    threadId,
    title: card.title,
    noticeboardPage,
    noticeboardLabel,
    commentCount: card.commentCount ?? parseCommentCountFromSignals(card.supportingSignals),
    latestReplyRelative: card.supportingTextEnd ?? '',
    href: card.href ?? '',
  }
}

function parseThreadIdFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return undefined
  return href.slice(hashIndex + 1).trim() || undefined
}

function parseNoticeboardPageFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  try {
    const url = new URL(href)
    const path = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ''))
    const hashIndex = path.indexOf('#')
    return (hashIndex === -1 ? path : path.slice(0, hashIndex)).replace(/_/g, ' ') || undefined
  } catch {
    return undefined
  }
}

function parseCommentCountFromSignals(signals: WikitabCardData['supportingSignals']): number {
  const text = signals?.[0]?.text ?? ''
  const match = text.match(/^(\d+)/)
  return match ? Number(match[1]) : 0
}

export function savedItemToActivityItem(item: WikitabSavedChangeItem): WikitabSearchActivityItem {
  return {
    pageid: item.pageid,
    title: item.articleTitle,
    editSummary: item.editSummary,
    thumbnailUrl: item.thumbnailUrl,
    charsAdded: item.charsAdded,
    charsRemoved: item.charsRemoved,
    articleHref: articleUrl(item.articleTitle),
    diffUrl: item.diffUrl,
    thankUrl: `https://en.wikipedia.org/wiki/Special:Thanks/${item.revid}`,
    revid: item.revid,
    reverted: item.reverted ?? false,
    highRevertRisk: item.highRevertRisk,
    isLatest: item.isLatest ?? false,
    editorName: item.editorName,
    editorHref: `https://en.wikipedia.org/wiki/User:${encodeURIComponent(item.editorName.replace(/ /g, '_'))}`,
    editedRelative: item.editedRelative,
    editedTimestamp: '',
    editorKind: item.editorKind,
  }
}

export function savedItemToContributeItem(item: WikitabSavedSuggestionItem): WikitabSearchContributeItem {
  return {
    pageid: item.pageid,
    title: item.articleTitle,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    suggestionLabel: item.suggestionLabel,
    body: item.body,
    need: item.need,
    editHref: item.editHref,
  }
}

export function savedItemToWikitabCard(item: WikitabSavedArticleItem): WikitabCardData {
  return {
    key: item.id,
    href: item.href,
    linkTitle: item.title,
    title: item.title,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
  }
}

/** Plain article title — legacy saves stored linkTitle ("Edit Foo: …") as articleTitle. */
function suggestionArticleTitle(item: WikitabSavedSuggestionItem): string {
  const raw = item.articleTitle.trim()
  const legacy = raw.match(/^Edit\s+(.+?):\s+/i)
  if (legacy) return displayTitle(legacy[1])
  return displayTitle(raw)
}

/** Saved-module layout — mirrors {@link contributeItemToCard} / home Suggested edits. */
export function savedSuggestionToWikitabCard(item: WikitabSavedSuggestionItem): WikitabCardData {
  const title = suggestionArticleTitle(item)
  return {
    key: item.id,
    href: item.editHref,
    linkTitle: `Edit ${title}: ${item.suggestionLabel}`,
    title,
    description: item.description || undefined,
    thumbnailUrl: item.thumbnailUrl,
    supportingSignals: [
      {
        icon: resolveSavedIcon('lightbulb') ?? resolveSavedIcon('edit')!,
        text: item.suggestionLabel,
      },
    ],
  }
}

export function savedSnippetToWikitabCard(item: WikitabSavedSnippetItem): WikitabCardData {
  const card = item.card
  const html =
    item.source === 'dyk' && card.html ? expandDykHookHtml(card.html) : card.html
  return {
    key: card.key,
    href: card.href,
    linkTitle: card.linkTitle,
    title: card.title,
    description: card.description,
    html,
    thumbnailUrl: card.thumbnailUrl,
    thumbnailTitle: card.thumbnailTitle,
    supportingText: card.supportingText,
    supportingSignals: card.supportingSignals?.map((signal) => ({
      icon: resolveSavedIcon(signal.icon) ?? resolveSavedIcon('edit')!,
      text: signal.text,
    })),
    supportingTextEnd: card.supportingTextEnd,
  }
}

export function savedImageToWikitabCard(item: WikitabSavedImageItem): WikitabCardData {
  const fileName = imageDisplayTitle(item.title)
  const caption = item.description.trim()
  const description = caption || fileName
  const attribution = formatImageAttribution(item)

  return {
    key: item.id,
    href: item.filePageUrl,
    linkTitle: description,
    description,
    thumbnailUrl: item.thumbnailUrl,
    supportingSignals: attribution
      ? [
          {
            icon: resolveSavedIcon('image') ?? resolveSavedIcon('edit')!,
            text: attribution,
          },
        ]
      : undefined,
  }
}

export function savedDiscussionToWikitabCard(item: WikitabSavedDiscussionItem): WikitabCardData {
  return {
    key: item.id,
    href: item.href,
    linkTitle: item.title,
    title: item.title,
    description: item.noticeboardLabel,
    supportingSignals: [
      {
        icon: resolveSavedIcon('speechBubbles')!,
        text: `${item.commentCount} ${item.commentCount === 1 ? 'comment' : 'comments'}`,
      },
    ],
    supportingTextEnd: item.latestReplyRelative,
  }
}

/** Unique article seeds — Article, Snippet, and Suggestion types only. */
export function uniqueArticleSeedsFromSavedItems(
  items: readonly WikitabSavedItem[],
): WikitabSavedArticleSeed[] {
  const byKey = new Map<string, WikitabSavedArticleSeed>()

  for (const saved of items) {
    if (
      saved.type === 'discussion' ||
      saved.type === 'change' ||
      saved.type === 'image'
    ) {
      continue
    }
    if (!saved.articleTitleKey) continue
    if (!byKey.has(saved.articleTitleKey)) {
      byKey.set(saved.articleTitleKey, {
        titleKey: saved.articleTitleKey,
        title: saved.articleTitle,
      })
    }
  }

  return [...byKey.values()]
}

export function savedItemRevealCard(item: WikitabSavedItem): WikitabCardData {
  return { key: item.id }
}

/** @deprecated Use uniqueArticleSeedsFromSavedItems */
export function uniqueArticleSeedsFromSavedCards(
  items: readonly WikitabSavedItem[],
): WikitabSavedArticleSeed[] {
  return uniqueArticleSeedsFromSavedItems(items)
}

export type SaveItemPayload =
  | { kind: 'article'; card: WikitabCardData }
  | { kind: 'snippet'; card: WikitabCardData; spec: Pick<WikitabSectionSpec, 'id' | 'cardHeight' | 'thumbnailSize' | 'supportingIcon'> }
  | { kind: 'suggestion'; card: WikitabCardData }
  | { kind: 'discussion'; card: WikitabCardData }

export function buildSavedItemFromPayload(payload: SaveItemPayload): WikitabSavedItem | null {
  switch (payload.kind) {
    case 'article':
      return buildSavedArticleFromCard(payload.card)
    case 'snippet':
      return buildSavedSnippet(payload.card, payload.spec)
    case 'suggestion':
      return buildSavedSuggestionFromCard(payload.card)
    case 'discussion':
      return buildSavedDiscussion(payload.card)
    default:
      return null
  }
}
