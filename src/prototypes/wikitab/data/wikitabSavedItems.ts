import type { EditorKind } from './fetchWikitabSearchActivity'
import {
  isWikitabSavedIconId,
  type WikitabSavedIconId,
} from './wikitabSavedIcons'
import { articleTitleKey } from './wikitabHtml'

export type WikitabSavedItemType =
  | 'article'
  | 'snippet'
  | 'suggestion'
  | 'change'
  | 'discussion'
  | 'image'

export type WikitabSnippetSource = 'dyk' | 'otd' | 'news'

export interface WikitabSavedCardData {
  key: string
  href?: string
  linkTitle?: string
  title?: string
  description?: string
  html?: string
  thumbnailUrl?: string
  thumbnailTitle?: string
  supportingText?: string
  supportingSignals?: { icon: WikitabSavedIconId; text: string }[]
  supportingTextEnd?: string
}

export interface WikitabSavedSnippetPresentation {
  variant: 'text'
  cardHeight: number
  thumbnailSize: number
  fullHook: true
  supportingIcon?: WikitabSavedIconId
}

export interface WikitabSavedItemBase {
  id: string
  type: WikitabSavedItemType
  savedAt: number
  articleTitleKey: string
  articleTitle: string
}

export interface WikitabSavedArticleItem extends WikitabSavedItemBase {
  type: 'article'
  title: string
  href: string
  description?: string
  thumbnailUrl?: string
  supportingSignals?: WikitabSavedCardData['supportingSignals']
  supportingTextEnd?: string
}

export interface WikitabSavedSnippetItem extends WikitabSavedItemBase {
  type: 'snippet'
  source: WikitabSnippetSource
  presentation: WikitabSavedSnippetPresentation
  card: WikitabSavedCardData
}

export interface WikitabSavedSuggestionItem extends WikitabSavedItemBase {
  type: 'suggestion'
  pageid: number
  need: string
  suggestionLabel: string
  body: string
  description?: string
  thumbnailUrl?: string
  editHref: string
}

export interface WikitabSavedChangeItem extends WikitabSavedItemBase {
  type: 'change'
  revid: number
  pageid: number
  editSummary: string
  diffUrl: string
  thumbnailUrl?: string
  charsAdded?: number
  charsRemoved?: number
  editorName: string
  editorKind: EditorKind
  editedRelative: string
  highRevertRisk?: boolean
  isLatest?: boolean
  reverted?: boolean
}

export interface WikitabSavedDiscussionItem extends WikitabSavedItemBase {
  type: 'discussion'
  threadId: string
  title: string
  noticeboardPage: string
  noticeboardLabel: string
  commentCount: number
  latestReplyRelative: string
  href: string
}

export interface WikitabSavedImageItem extends WikitabSavedItemBase {
  type: 'image'
  pageid: number
  /** Commons file page title, e.g. `File:Foo.jpg`. */
  title: string
  /** Plain-text caption from ImageDescription / ObjectName. */
  description: string
  thumbnailUrl: string
  filePageUrl: string
  licenseType: string
  artistHtml: string
}

export type WikitabSavedItem =
  | WikitabSavedArticleItem
  | WikitabSavedSnippetItem
  | WikitabSavedSuggestionItem
  | WikitabSavedChangeItem
  | WikitabSavedDiscussionItem
  | WikitabSavedImageItem

const SNIPPET_SOURCES = new Set<WikitabSnippetSource>(['dyk', 'otd', 'news'])

const EDITOR_KINDS = new Set<EditorKind>(['bot', 'temporary', 'user', 'anonymous'])

function str(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

export function normalizeSavedCardData(raw: unknown): WikitabSavedCardData | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const key = str(record, 'key')
  if (!key) return null

  let supportingSignals: WikitabSavedCardData['supportingSignals']
  if (Array.isArray(record.supportingSignals)) {
    supportingSignals = []
    for (const item of record.supportingSignals) {
      if (typeof item !== 'object' || item === null) continue
      const signal = item as Record<string, unknown>
      const text = typeof signal.text === 'string' ? signal.text.trim() : ''
      const iconRaw = typeof signal.icon === 'string' ? signal.icon.trim() : ''
      if (!text || !isWikitabSavedIconId(iconRaw)) continue
      supportingSignals.push({ icon: iconRaw, text })
    }
    if (!supportingSignals.length) supportingSignals = undefined
  }

  return {
    key,
    href: str(record, 'href'),
    linkTitle: str(record, 'linkTitle'),
    title: str(record, 'title'),
    description: str(record, 'description'),
    html: str(record, 'html'),
    thumbnailUrl: str(record, 'thumbnailUrl'),
    thumbnailTitle: str(record, 'thumbnailTitle'),
    supportingText: str(record, 'supportingText'),
    supportingSignals,
    supportingTextEnd: str(record, 'supportingTextEnd'),
  }
}

function normalizeSnippetPresentation(raw: unknown): WikitabSavedSnippetPresentation | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const cardHeight = num(record, 'cardHeight')
  const thumbnailSize = num(record, 'thumbnailSize')
  if (cardHeight === undefined || thumbnailSize === undefined) return null

  const supportingIconRaw = str(record, 'supportingIcon')
  const supportingIcon =
    supportingIconRaw && isWikitabSavedIconId(supportingIconRaw) ? supportingIconRaw : undefined

  return {
    variant: 'text',
    cardHeight,
    thumbnailSize,
    fullHook: true,
    supportingIcon,
  }
}

function normalizeSavedItemBase(record: Record<string, unknown>): WikitabSavedItemBase | null {
  const id = str(record, 'id')
  const articleTitle = str(record, 'articleTitle')?.replace(/_/g, ' ') ?? ''
  const articleTitleKeyValue = articleTitleKey(
    str(record, 'articleTitleKey') ?? articleTitle,
  )
  const savedAt = num(record, 'savedAt') ?? Date.now()
  const typeRaw = str(record, 'type')

  if (!id || !articleTitleKeyValue || !articleTitle || !typeRaw) return null

  return {
    id,
    type: typeRaw as WikitabSavedItemType,
    savedAt,
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
  }
}

function normalizeArticleItem(record: Record<string, unknown>): WikitabSavedArticleItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'article') return null

  const title = str(record, 'title') ?? base.articleTitle
  const href = str(record, 'href')
  if (!href) return null

  return {
    ...base,
    type: 'article',
    title,
    href,
    description: str(record, 'description'),
    thumbnailUrl: str(record, 'thumbnailUrl'),
    supportingSignals: normalizeSavedCardData({ supportingSignals: record.supportingSignals })
      ?.supportingSignals,
    supportingTextEnd: str(record, 'supportingTextEnd'),
  }
}

function normalizeSnippetItem(record: Record<string, unknown>): WikitabSavedSnippetItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'snippet') return null

  const source = str(record, 'source') as WikitabSnippetSource | undefined
  if (!source || !SNIPPET_SOURCES.has(source)) return null

  const presentation = normalizeSnippetPresentation(record.presentation)
  const card = normalizeSavedCardData(record.card)
  if (!presentation || !card) return null

  return {
    ...base,
    type: 'snippet',
    source,
    presentation,
    card: { ...card, key: card.key || base.id },
  }
}

function normalizeSuggestionItem(record: Record<string, unknown>): WikitabSavedSuggestionItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'suggestion') return null

  const pageid = num(record, 'pageid')
  const need = str(record, 'need')
  const suggestionLabel = str(record, 'suggestionLabel')
  const body = str(record, 'body') ?? ''
  const editHref = str(record, 'editHref')
  if (pageid === undefined || !need || !suggestionLabel || !editHref) return null

  return {
    ...base,
    type: 'suggestion',
    pageid,
    need,
    suggestionLabel,
    body,
    description: str(record, 'description'),
    thumbnailUrl: str(record, 'thumbnailUrl'),
    editHref,
  }
}

function normalizeChangeItem(record: Record<string, unknown>): WikitabSavedChangeItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'change') return null

  const revid = num(record, 'revid')
  const pageid = num(record, 'pageid')
  const editSummary = str(record, 'editSummary') ?? ''
  const diffUrl = str(record, 'diffUrl')
  const editorName = str(record, 'editorName')
  const editorKindRaw = str(record, 'editorKind')
  const editedRelative = str(record, 'editedRelative') ?? ''
  if (
    revid === undefined ||
    pageid === undefined ||
    !diffUrl ||
    !editorName ||
    !editorKindRaw ||
    !EDITOR_KINDS.has(editorKindRaw as EditorKind)
  ) {
    return null
  }

  return {
    ...base,
    type: 'change',
    revid,
    pageid,
    editSummary,
    diffUrl,
    thumbnailUrl: str(record, 'thumbnailUrl'),
    charsAdded: num(record, 'charsAdded'),
    charsRemoved: num(record, 'charsRemoved'),
    editorName,
    editorKind: editorKindRaw as EditorKind,
    editedRelative,
    highRevertRisk: record.highRevertRisk === true ? true : undefined,
    isLatest: record.isLatest === true ? true : undefined,
    reverted: record.reverted === true ? true : undefined,
  }
}

function normalizeImageItem(record: Record<string, unknown>): WikitabSavedImageItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'image') return null

  const pageid = num(record, 'pageid')
  const title = str(record, 'title')
  const thumbnailUrl = str(record, 'thumbnailUrl')
  const filePageUrl = str(record, 'filePageUrl')
  if (pageid === undefined || !title || !thumbnailUrl || !filePageUrl) return null

  return {
    ...base,
    type: 'image',
    pageid,
    title,
    thumbnailUrl,
    filePageUrl,
    description: str(record, 'description') ?? '',
    licenseType: str(record, 'licenseType') ?? '',
    artistHtml: str(record, 'artistHtml') ?? '',
  }
}

function normalizeDiscussionItem(record: Record<string, unknown>): WikitabSavedDiscussionItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'discussion') return null

  const threadId = str(record, 'threadId')
  const title = str(record, 'title')
  const noticeboardPage = str(record, 'noticeboardPage')
  const noticeboardLabel = str(record, 'noticeboardLabel')
  const commentCount = num(record, 'commentCount')
  const latestReplyRelative = str(record, 'latestReplyRelative') ?? ''
  const href = str(record, 'href')
  if (
    !threadId ||
    !title ||
    !noticeboardPage ||
    !noticeboardLabel ||
    commentCount === undefined ||
    !href
  ) {
    return null
  }

  return {
    ...base,
    type: 'discussion',
    threadId,
    title,
    noticeboardPage,
    noticeboardLabel,
    commentCount,
    latestReplyRelative,
    href,
  }
}

function normalizeSingleSavedItem(raw: unknown): WikitabSavedItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const type = str(record, 'type')

  switch (type) {
    case 'article':
      return normalizeArticleItem(record)
    case 'snippet':
      return normalizeSnippetItem(record)
    case 'suggestion':
      return normalizeSuggestionItem(record)
    case 'change':
      return normalizeChangeItem(record)
    case 'discussion':
      return normalizeDiscussionItem(record)
    case 'image':
      return normalizeImageItem(record)
    default:
      return null
  }
}

/** Unknown and duplicate entries are dropped; most recent `savedAt` wins per id. */
export function normalizeSavedItems(raw: unknown): WikitabSavedItem[] {
  if (!Array.isArray(raw)) return []

  const byId = new Map<string, WikitabSavedItem>()

  for (const item of raw) {
    const normalized = normalizeSingleSavedItem(item)
    if (!normalized) continue

    const existing = byId.get(normalized.id)
    if (existing && existing.savedAt >= normalized.savedAt) continue

    byId.set(normalized.id, normalized)
  }

  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt)
}

export function cloneSavedItem(item: WikitabSavedItem): WikitabSavedItem {
  switch (item.type) {
    case 'article':
      return {
        ...item,
        supportingSignals: item.supportingSignals?.map((signal) => ({ ...signal })),
      }
    case 'snippet':
      return {
        ...item,
        presentation: { ...item.presentation },
        card: {
          ...item.card,
          supportingSignals: item.card.supportingSignals?.map((signal) => ({ ...signal })),
        },
      }
    case 'suggestion':
    case 'change':
    case 'discussion':
    case 'image':
      return { ...item }
    default:
      return item
  }
}

export function cloneSavedItems(items: readonly WikitabSavedItem[]): WikitabSavedItem[] {
  return items.map(cloneSavedItem)
}

export function savedItemThumbnailUrl(item: WikitabSavedItem): string | undefined {
  if (item.type === 'article') return item.thumbnailUrl
  if (item.type === 'suggestion') return item.thumbnailUrl
  if (item.type === 'snippet') return item.card.thumbnailUrl
  if (item.type === 'change') return item.thumbnailUrl
  if (item.type === 'image') return item.thumbnailUrl
  return undefined
}

export function savedItemContributesArticleSeed(item: WikitabSavedItem): boolean {
  return item.type === 'article' || item.type === 'snippet' || item.type === 'suggestion'
}
