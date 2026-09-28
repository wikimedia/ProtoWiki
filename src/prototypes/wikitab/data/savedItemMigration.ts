import type { WikitabModuleId } from '../sections'
import type {
  WikitabSavedCard,
  WikitabSavedCardData,
  WikitabSavedCardPresentation,
} from './wikitabConfig'
import type {
  WikitabSavedArticleItem,
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedItem,
  WikitabSavedSnippetItem,
  WikitabSavedSuggestionItem,
  WikitabSnippetSource,
} from './wikitabSavedItems'
import { articleTitleKey, articleUrl } from './wikitabHtml'

const SNIPPET_SOURCES = new Set<WikitabSnippetSource>(['dyk', 'otd', 'news'])

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

function parseThreadIdFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return undefined
  const fragment = href.slice(hashIndex + 1).trim()
  return fragment || undefined
}

function parseNoticeboardFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  try {
    const url = new URL(href)
    const path = url.pathname.replace(/^\/wiki\//, '')
    const hashIndex = path.indexOf('#')
    return (hashIndex === -1 ? path : path.slice(0, hashIndex)).replace(/_/g, ' ') || undefined
  } catch {
    return undefined
  }
}

function parseCommentCount(signals: WikitabSavedCardData['supportingSignals']): number {
  const text = signals?.[0]?.text ?? ''
  const match = text.match(/^(\d+)/)
  return match ? Number(match[1]) : 0
}

function migrateToSnippet(card: WikitabSavedCard): WikitabSavedSnippetItem | null {
  const source = card.presentation.source
  if (source === 'search' || !SNIPPET_SOURCES.has(source as WikitabSnippetSource)) {
    return null
  }

  return {
    id: card.id,
    type: 'snippet',
    savedAt: card.savedAt,
    articleTitleKey: card.articleTitleKey,
    articleTitle: card.articleTitle,
    source: source as WikitabSnippetSource,
    presentation: {
      variant: 'text',
      cardHeight: card.presentation.cardHeight,
      thumbnailSize: card.presentation.thumbnailSize,
      fullHook: true,
      supportingIcon: card.presentation.supportingIcon,
    },
    card: { ...card.card, key: card.card.key || card.id },
  }
}

function migrateToDiscussion(card: WikitabSavedCard): WikitabSavedDiscussionItem | null {
  const threadId =
    parseThreadIdFromHref(card.card.href) ?? card.card.key
  const noticeboardPage =
    parseNoticeboardFromHref(card.card.href) ?? card.card.description ?? ''
  const noticeboardLabel = card.card.description ?? noticeboardPage

  if (!threadId || !card.card.title) return null

  return {
    id: card.id.startsWith('discussion:') ? card.id : `discussion:${threadId}`,
    type: 'discussion',
    savedAt: card.savedAt,
    articleTitleKey: card.articleTitleKey,
    articleTitle: card.articleTitle,
    threadId,
    title: card.card.title,
    noticeboardPage,
    noticeboardLabel,
    commentCount: parseCommentCount(card.card.supportingSignals),
    latestReplyRelative: card.card.supportingTextEnd ?? '',
    href: card.card.href ?? '',
  }
}

function migrateToSuggestion(card: WikitabSavedCard): WikitabSavedSuggestionItem | null {
  const pageidMatch = card.card.key.match(/^suggested-edits:(\d+)$/)
  const pageid = pageidMatch ? Number(pageidMatch[1]) : NaN
  const taskSignal = card.card.supportingSignals?.find((signal) => signal.icon === 'lightbulb')
  const suggestionLabel = taskSignal?.text ?? 'Suggested edit'
  const need = suggestionLabel.toLowerCase().replace(/\s+/g, '_')

  if (!Number.isFinite(pageid)) return null

  return {
    id: `suggestion:${pageid}:${need}`,
    type: 'suggestion',
    savedAt: card.savedAt,
    articleTitleKey: card.articleTitleKey,
    articleTitle: displayTitle(card.card.title ?? card.articleTitle),
    pageid,
    need,
    suggestionLabel,
    body: card.card.suggestionBody ?? card.card.description ?? '',
    description: card.card.description,
    thumbnailUrl: card.card.thumbnailUrl,
    editHref: card.card.href ?? '',
  }
}

function migrateToArticle(card: WikitabSavedCard): WikitabSavedArticleItem {
  const title = card.card.title ?? card.card.linkTitle ?? card.articleTitle
  return {
    id: card.id,
    type: 'article',
    savedAt: card.savedAt,
    articleTitleKey: card.articleTitleKey,
    articleTitle: card.articleTitle,
    title,
    href: card.card.href ?? '',
    description: card.card.description,
    thumbnailUrl: card.card.thumbnailUrl,
    supportingSignals: card.card.supportingSignals,
    supportingTextEnd: card.card.supportingTextEnd,
  }
}

function inferTypeFromLegacyCard(
  card: WikitabSavedCard,
): 'snippet' | 'discussion' | 'suggestion' | 'article' {
  const source = card.presentation.source

  if (source === 'suggested-edits' || card.card.key.startsWith('suggested-edits:')) {
    return 'suggestion'
  }
  if (source === 'discussions') {
    return 'discussion'
  }
  if (source !== 'search' && SNIPPET_SOURCES.has(source as WikitabSnippetSource)) {
    return 'snippet'
  }
  if (card.card.html && card.presentation.variant === 'text') {
    const sourceId = source as WikitabModuleId
    if (SNIPPET_SOURCES.has(sourceId as WikitabSnippetSource)) return 'snippet'
  }
  return 'article'
}

export function migrateV2SavedCardToItem(card: WikitabSavedCard): WikitabSavedItem | null {
  switch (inferTypeFromLegacyCard(card)) {
    case 'snippet':
      return migrateToSnippet(card) ?? migrateToArticle(card)
    case 'discussion':
      return migrateToDiscussion(card)
    case 'suggestion':
      return migrateToSuggestion(card)
    case 'article':
      return migrateToArticle(card)
    default:
      return migrateToArticle(card)
  }
}

export function migrateV2SavedCardsToItems(cards: readonly WikitabSavedCard[]): WikitabSavedItem[] {
  const byId = new Map<string, WikitabSavedItem>()

  for (const card of cards) {
    const item = migrateV2SavedCardToItem(card)
    if (!item) continue

    const existing = byId.get(item.id)
    if (existing && existing.savedAt >= item.savedAt) continue
    byId.set(item.id, item)
  }

  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt)
}

/** Legacy v1 articles → article items. */
export function migrateLegacyArticleToItem(input: {
  titleKey: string
  title: string
  thumbnailUrl?: string
  description?: string
  savedAt: number
}): WikitabSavedArticleItem {
  const id = `search:${input.titleKey}`
  return {
    id,
    type: 'article',
    savedAt: input.savedAt,
    articleTitleKey: input.titleKey,
    articleTitle: input.title,
    title: input.title,
    href: articleUrl(input.title),
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
  }
}

export function articleTitleKeyFromLegacyCard(card: WikitabSavedCard): string {
  return (
    card.articleTitleKey ||
    articleTitleKey(card.articleTitle) ||
    articleTitleKey(card.card.linkTitle ?? card.card.title ?? '')
  )
}

export type { WikitabSavedCardPresentation }
