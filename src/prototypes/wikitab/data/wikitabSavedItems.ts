import type { EditorKind } from './fetchWikitabSearchActivity'
import type { WikitabCardPrimitiveId } from './wikitabCardTypeLinks'
import { articleTitleKey, discussionThreadIdFromUrl } from './wikitabHtml'
import { parseSeedArticle, type WikitabSeedArticle } from './wikitabSeedArticle'

export type WikitabSavedItemType =
  | 'article'
  | 'snippet'
  | 'word'
  | 'quote'
  | 'list'
  | 'suggestion'
  | 'change'
  | 'discussion'
  | 'image'

const WIKITAB_CARD_PRIMITIVE_IDS = new Set<WikitabCardPrimitiveId>([
  'article',
  'snippet',
  'discussion',
  'suggestion',
  'image',
  'word',
  'quote',
  'list',
  'edit',
])

/** Maps persisted `type` to the card primitive used for presentation. */
export function wikitabSavedItemTypeToPrimitive(type: WikitabSavedItemType): WikitabCardPrimitiveId {
  if (type === 'change') return 'edit'
  return type
}

export function wikitabSavedItemPrimitive(
  item: Pick<WikitabSavedItem, 'primitive'>,
): WikitabCardPrimitiveId {
  return item.primitive
}

export function isWikitabSavedItemPrimitive(raw: unknown): raw is WikitabCardPrimitiveId {
  return typeof raw === 'string' && WIKITAB_CARD_PRIMITIVE_IDS.has(raw as WikitabCardPrimitiveId)
}

export interface WikitabSavedItemBase {
  id: string
  type: WikitabSavedItemType
  /** Card primitive — drives `primitive-*` presentation when re-rendered in Saved. */
  primitive: WikitabCardPrimitiveId
  savedAt: number
  /** Identity for dedupe / hide — not necessarily an article. See {@link seedArticle}. */
  articleTitleKey: string
  articleTitle: string
  /** The enwiki article this save contributes to saved-driven modules, if any. */
  seedArticle?: WikitabSeedArticle
}

export interface WikitabSavedArticleItem extends WikitabSavedItemBase {
  type: 'article'
  title: string
  url: string
  description?: string
  thumbnailUrl?: string
  supportingText?: string
  supportingHtml?: string
  supportingTextEnd?: string
}

export type WikitabSavedSnippetSource = 'dyk' | 'news'

/** A DYK hook or In the news story, saved as the snippet itself. */
export interface WikitabSavedSnippetItem extends WikitabSavedItemBase {
  type: 'snippet'
  source: WikitabSavedSnippetSource
  /** Hook / story HTML with inline links. */
  snippetHtml: string
  url: string
  thumbnailUrl?: string
}

export interface WikitabSavedWordItem extends WikitabSavedItemBase {
  type: 'word'
  word: string
  url: string
  /** Wiktionary gloss — usually HTML with inline links. */
  description?: string
}

export interface WikitabSavedQuoteItem extends WikitabSavedItemBase {
  type: 'quote'
  url: string
  quoteText: string
  personName?: string
}

export interface WikitabSavedListItem extends WikitabSavedItemBase {
  type: 'list'
  listTitle: string
  url: string
  description?: string
  thumbnailUrl?: string
}

export interface WikitabSavedSuggestionItem extends WikitabSavedItemBase {
  type: 'suggestion'
  pageid: number
  task: string
  suggestionLabel: string
  body: string
  description?: string
  thumbnailUrl?: string
  editUrl: string
}

export interface WikitabSavedChangeItem extends WikitabSavedItemBase {
  type: 'change'
  revisionId: number
  pageid: number
  editSummary: string
  diffUrl: string
  delta?: number
  editorName: string
  editorKind: EditorKind
  editedRelative: string
  /** Revision time when saved from search activity. */
  editedTimestamp?: string
  highRevertRisk?: boolean
  isLatestRevision?: boolean
  reverted?: boolean
}

export interface WikitabSavedDiscussionItem extends WikitabSavedItemBase {
  type: 'discussion'
  title: string
  noticeboardPage: string
  noticeboardLabel: string
  commentCount: number
  latestReplyRelative: string
  url: string
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
  /** Featured TFP/POTD hook HTML when saved from spotlight. */
  captionHtml?: string
}

export type WikitabSavedItem =
  | WikitabSavedArticleItem
  | WikitabSavedSnippetItem
  | WikitabSavedWordItem
  | WikitabSavedQuoteItem
  | WikitabSavedListItem
  | WikitabSavedSuggestionItem
  | WikitabSavedChangeItem
  | WikitabSavedDiscussionItem
  | WikitabSavedImageItem

const VALID_SAVED_ITEM_TYPES = new Set<string>([
  'article',
  'snippet',
  'word',
  'quote',
  'list',
  'suggestion',
  'change',
  'discussion',
  'image',
])

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

function normalizeSavedItemBase(record: Record<string, unknown>): WikitabSavedItemBase | null {
  const id = str(record, 'id')
  const articleTitle = str(record, 'articleTitle')
  const articleTitleKeyValue = articleTitleKey(str(record, 'articleTitleKey') ?? '')
  const savedAt = num(record, 'savedAt')
  const typeRaw = str(record, 'type')
  const primitive = record.primitive

  if (!id || !articleTitleKeyValue || !articleTitle || savedAt === undefined) return null
  if (!typeRaw || !VALID_SAVED_ITEM_TYPES.has(typeRaw)) return null
  if (!isWikitabSavedItemPrimitive(primitive)) return null

  return {
    id,
    type: typeRaw as WikitabSavedItemType,
    primitive,
    savedAt,
    articleTitleKey: articleTitleKeyValue,
    articleTitle,
    seedArticle: parseSeedArticle(record.seedArticle),
  }
}

function normalizeWordItem(record: Record<string, unknown>): WikitabSavedWordItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'word') return null
  const word = str(record, 'word')
  const url = str(record, 'url')
  if (!word || !url) return null
  return {
    ...base,
    type: 'word',
    word,
    url,
    description: str(record, 'description'),
  }
}

function normalizeQuoteItem(record: Record<string, unknown>): WikitabSavedQuoteItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'quote') return null
  const url = str(record, 'url')
  const quoteText = str(record, 'quoteText')
  if (!url || !quoteText) return null
  return {
    ...base,
    type: 'quote',
    url,
    quoteText,
    personName: str(record, 'personName'),
  }
}

function normalizeListItem(record: Record<string, unknown>): WikitabSavedListItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'list') return null
  const listTitle = str(record, 'listTitle')
  const url = str(record, 'url')
  if (!listTitle || !url) return null
  return {
    ...base,
    type: 'list',
    listTitle,
    url,
    description: str(record, 'description'),
    thumbnailUrl: str(record, 'thumbnailUrl'),
  }
}

function normalizeArticleItem(record: Record<string, unknown>): WikitabSavedArticleItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'article') return null

  const title = str(record, 'title')
  const url = str(record, 'url')
  if (!title || !url) return null

  return {
    ...base,
    type: 'article',
    title,
    url,
    description: str(record, 'description'),
    thumbnailUrl: str(record, 'thumbnailUrl'),
    supportingText: str(record, 'supportingText'),
    supportingHtml: str(record, 'supportingHtml'),
    supportingTextEnd: str(record, 'supportingTextEnd'),
  }
}

const SNIPPET_SOURCES = new Set<WikitabSavedSnippetSource>(['dyk', 'news'])

function normalizeSnippetItem(record: Record<string, unknown>): WikitabSavedSnippetItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'snippet') return null

  const source = str(record, 'source') as WikitabSavedSnippetSource | undefined
  const snippetHtml = str(record, 'snippetHtml')
  const url = str(record, 'url')
  if (!source || !SNIPPET_SOURCES.has(source) || !snippetHtml || !url) return null

  return {
    ...base,
    type: 'snippet',
    source,
    snippetHtml,
    url,
    thumbnailUrl: str(record, 'thumbnailUrl'),
  }
}

function normalizeSuggestionItem(record: Record<string, unknown>): WikitabSavedSuggestionItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'suggestion') return null

  const pageid = num(record, 'pageid')
  const task = str(record, 'task')
  const suggestionLabel = str(record, 'suggestionLabel')
  const body = str(record, 'body') ?? ''
  const editUrl = str(record, 'editUrl')
  if (pageid === undefined || !task || !suggestionLabel || !editUrl) return null

  return {
    ...base,
    type: 'suggestion',
    pageid,
    task,
    suggestionLabel,
    body,
    description: str(record, 'description'),
    thumbnailUrl: str(record, 'thumbnailUrl'),
    editUrl,
  }
}

function normalizeChangeItem(record: Record<string, unknown>): WikitabSavedChangeItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'change') return null

  const revisionId = num(record, 'revisionId')
  const pageid = num(record, 'pageid')
  const editSummary = str(record, 'editSummary') ?? ''
  const diffUrl = str(record, 'diffUrl')
  const editorName = str(record, 'editorName')
  const editorKindRaw = str(record, 'editorKind')
  const editedRelative = str(record, 'editedRelative') ?? ''
  if (
    revisionId === undefined ||
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
    revisionId,
    pageid,
    editSummary,
    diffUrl,
    delta: num(record, 'delta'),
    editorName,
    editorKind: editorKindRaw as EditorKind,
    editedRelative,
    editedTimestamp: str(record, 'editedTimestamp'),
    highRevertRisk: record.highRevertRisk === true ? true : undefined,
    isLatestRevision: record.isLatestRevision === true ? true : undefined,
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
  const isSpotlightFallback =
    base.id.startsWith('image:spotlight:') || base.id.startsWith('image:featured:')
  if (pageid === undefined || !title || !thumbnailUrl) return null
  if (!filePageUrl && !isSpotlightFallback) return null
  if (pageid <= 0 && !isSpotlightFallback) return null

  return {
    ...base,
    type: 'image',
    pageid,
    title,
    thumbnailUrl,
    filePageUrl: filePageUrl ?? '',
    description: str(record, 'description') ?? '',
    licenseType: str(record, 'licenseType') ?? '',
    artistHtml: str(record, 'artistHtml') ?? '',
    captionHtml: str(record, 'captionHtml'),
  }
}

function normalizeDiscussionItem(record: Record<string, unknown>): WikitabSavedDiscussionItem | null {
  const base = normalizeSavedItemBase(record)
  if (!base || base.type !== 'discussion') return null

  const title = str(record, 'title')
  const noticeboardPage = str(record, 'noticeboardPage')
  const noticeboardLabel = str(record, 'noticeboardLabel')
  const commentCount = num(record, 'commentCount')
  const latestReplyRelative = str(record, 'latestReplyRelative') ?? ''
  const url = str(record, 'url')
  if (
    !discussionThreadIdFromUrl(url) ||
    !title ||
    !noticeboardPage ||
    !noticeboardLabel ||
    commentCount === undefined ||
    !url
  ) {
    return null
  }

  return {
    ...base,
    type: 'discussion',
    title,
    noticeboardPage,
    noticeboardLabel,
    commentCount,
    latestReplyRelative,
    url,
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
    case 'word':
      return normalizeWordItem(record)
    case 'quote':
      return normalizeQuoteItem(record)
    case 'list':
      return normalizeListItem(record)
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
  let dropped = 0

  for (const item of raw) {
    const normalized = normalizeSingleSavedItem(item)
    if (!normalized) {
      dropped += 1
      continue
    }

    const existing = byId.get(normalized.id)
    if (existing && existing.savedAt >= normalized.savedAt) continue

    byId.set(normalized.id, normalized)
  }

  if (import.meta.env.DEV && dropped > 0) {
    console.warn(`[wikitab] ${dropped} saved item(s) could not be normalized`)
  }

  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt)
}

/** Merge lists; duplicate ids keep the entry with the latest `savedAt`. */
export function mergeSavedItemsById(
  ...lists: readonly (readonly WikitabSavedItem[])[]
): WikitabSavedItem[] {
  const byId = new Map<string, WikitabSavedItem>()

  for (const list of lists) {
    for (const item of list) {
      const existing = byId.get(item.id)
      if (!existing || existing.savedAt < item.savedAt) {
        byId.set(item.id, item)
      }
    }
  }

  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt)
}

export function cloneSavedItem(item: WikitabSavedItem): WikitabSavedItem {
  switch (item.type) {
    case 'article':
      return { ...item }
    case 'snippet':
    case 'word':
    case 'quote':
    case 'list':
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
  if (item.type === 'snippet') return item.thumbnailUrl
  if (item.type === 'suggestion') return item.thumbnailUrl
  if (item.type === 'list') return item.thumbnailUrl
  if (item.type === 'image') return item.thumbnailUrl
  return undefined
}

/** The article this save feeds into saved-driven modules. */
export function savedItemSeedArticle(item: WikitabSavedItem): WikitabSeedArticle | undefined {
  return item.seedArticle
}
