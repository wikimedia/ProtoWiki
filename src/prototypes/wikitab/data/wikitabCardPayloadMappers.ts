import type { WikitabCardData, WikitabFeaturedSpotlight } from '../sections'
import { resolveEditOpportunityCopy } from './editOpportunityCopy'
import { resolveCodexIcon } from './wikitabCardSupportingIcons'
import {
  formatWikitabEditRelativeTime,
  wikitabRevisionDiffUrl,
  wikitabRevisionThankUrl,
  type WikitabSearchActivityItem,
} from './fetchWikitabSearchActivity'
import { formatWikitabRelativeTime } from './wikitabRelativeTime'
import type { WikitabSearchContributeItem } from './fetchWikitabSearchContribute'
import type { WikitabSearchArticle } from './fetchWikitabSearchArticles'
import type { WikitabSearchImage } from './fetchWikitabSearchImages'
import {
  formatActivityEditSummary,
  parseActivityEditSummaryDisplay,
} from './wikitabActivityEditSummary'
import { searchActivityItemToCardData } from './wikitabSearchActivityWikitabCard'
import type {
  WikitabArticleCardPayload,
  WikitabFeaturedArticleCardPayload,
  WikitabFeaturedImageCardPayload,
  WikitabFeaturedListCardPayload,
  WikitabFeaturedQuoteCardPayload,
  WikitabFeaturedWordCardPayload,
  WikitabFeedBirthsCardPayload,
  WikitabFeedDailyReadsCardPayload,
  WikitabFeedDiscussionCardPayload,
  WikitabFeedDykCardPayload,
  WikitabFeedNewsCardPayload,
  WikitabFeedOtdCardPayload,
  WikitabFeedSuggestedEditsCardPayload,
  WikitabFeedTrendingCardPayload,
  WikitabSavedArticleCardPayload,
  WikitabSavedDiscussionCardPayload,
  WikitabSavedImageCardPayload,
  WikitabSavedSnippetCardPayload,
  WikitabSavedSuggestionCardPayload,
  WikitabSearchActivityCardPayload,
  WikitabSearchContributeCardPayload,
  WikitabSearchImageCardPayload,
  WikitabSearchResultCardPayload,
  WikitabCardPayloadSupportingFields,
} from './wikitabCardPayloadTypes'
import type {
  WikitabSavedChangeItem,
  WikitabSavedDiscussionItem,
  WikitabSavedImageItem,
  WikitabSavedArticleItem,
  WikitabSavedListItem,
  WikitabSavedQuoteItem,
  WikitabSavedSnippetItem,
  WikitabSavedSuggestionItem,
  WikitabSavedWordItem,
} from './wikitabSavedItems'
import { formatSearchArticleRelationRationaleHtml } from './formatSearchArticleRelation'
import { articleUrl } from './wikitabHtml'
import {
  formatImageAttribution,
  imageCardTitle,
  imageDisplayTitle,
} from './fetchWikitabSearchImages'
import { featuredSpotlightToCardData } from './wikitabFeaturedSpotlightCard'
/** Component prop type for `WikitabCard` (`card`). */
export type WikitabCardComponentData = WikitabCardData

/** Component prop type for `WikitabFeaturedCard` (`spotlight`). */
export type WikitabFeaturedSpotlightComponentData = WikitabFeaturedSpotlight

function formatPageViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`
  return String(views)
}

function cardWideLinkFromArticle(payload: { url: string; title: string }) {
  return { url: payload.url, title: payload.title }
}

function cardWideLinkFromSnippet(payload: { url: string; description: string }) {
  return { url: payload.url }
}

function commonsFilePageTitleFromUrl(filePageUrl: string): string {
  try {
    const slug = decodeURIComponent(new URL(filePageUrl).pathname.replace(/^\/wiki\//, ''))
    return slug.replace(/_/g, ' ')
  } catch {
    return 'File'
  }
}

function filePageLinkTitleFromUrl(filePageUrl: string): string {
  return imageDisplayTitle(commonsFilePageTitleFromUrl(filePageUrl))
}

function suggestedEditTaskLabel(task: string): string {
  return resolveEditOpportunityCopy(task).title
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Suggestion primitive supporting line — progressive task label in HTML. */
export function wikitabSuggestionTaskSupportingHtml(task: string): string | undefined {
  const label = suggestedEditTaskLabel(task).trim()
  if (!label) return undefined
  return `<span class="wikitab-suggestion-task">${escapeHtmlText(label)}</span>`
}

function spotlightFromArticleLink<T extends { url: string; title: string }>(
  linked: T,
  fields: Partial<WikitabFeaturedSpotlightComponentData>,
): WikitabFeaturedSpotlightComponentData {
  const { url, title, ...rest } = linked
  return {
    ...rest,
    url,
    title,
    ...fields,
  } as WikitabFeaturedSpotlightComponentData
}

function spotlightFromFilePageLink(
  filePageUrl: string,
  title: string | undefined,
  fields: Partial<WikitabFeaturedSpotlightComponentData>,
): WikitabFeaturedSpotlightComponentData {
  return {
    url: filePageUrl,
    title: title?.trim() || filePageLinkTitleFromUrl(filePageUrl),
    ...fields,
  } as WikitabFeaturedSpotlightComponentData
}

function trendingViewsSupportingText(payload: WikitabFeedTrendingCardPayload): string {
  return `${formatPageViews(payload.pageViews)} views`
}

function formatCommentCount(count: number): string {
  return `${count} ${count === 1 ? 'comment' : 'comments'}`
}

export function articleCardPayloadToCardData(
  payload: WikitabArticleCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    title: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFields(payload),
  }
}

/** `WikitabCard` props fragment: icon beside supporting text (not stored on `WikitabCardData`). */
export function articleCardPayloadSupportingIcon(
  payload: WikitabArticleCardPayload,
): ReturnType<typeof resolveCodexIcon> | undefined {
  return payload.supportingIcon ? resolveCodexIcon(payload.supportingIcon) : undefined
}

export function feedTrendingPayloadToCardData(
  payload: WikitabFeedTrendingCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    title: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    supportingText: trendingViewsSupportingText(payload),
  }
}

export function feedNewsPayloadToCardData(payload: WikitabFeedNewsCardPayload): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromSnippet(payload),
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFields(payload),
  }
}

export function feedDykPayloadToCardData(payload: WikitabFeedDykCardPayload): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromSnippet(payload),
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFields(payload),
  }
}

export function feedDiscussionPayloadToCardData(
  payload: WikitabFeedDiscussionCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    description: payload.noticeboardTitle,
    supportingText: formatCommentCount(payload.commentCount),
    supportingTextEnd: formatWikitabRelativeTime(payload.latestReplyTimestamp),
    commentCount: payload.commentCount,
  }
}

export function feedOtdPayloadToCardData(payload: WikitabFeedOtdCardPayload): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromSnippet(payload),
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFields(payload),
  }
}

export function feedBirthsPayloadToCardData(
  payload: WikitabFeedBirthsCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    title: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFieldsWithFallback(payload, {
      supportingText: `${payload.ageYears} years old`,
    }),
  }
}

export function feedDailyReadsPayloadToCardData(
  payload: WikitabFeedDailyReadsCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    title: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFieldsWithFallback(payload, {
      supportingText: `Related to ${payload.seedTitle}`,
    }),
  }
}

export function feedSuggestedEditsPayloadToCardData(
  payload: WikitabFeedSuggestedEditsCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    url: payload.url,
    title: payload.title,
    task: payload.task,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    supportingHtml: wikitabSuggestionTaskSupportingHtml(payload.task),
    ...(payload.supportingTextEnd?.trim()
      ? { supportingTextEnd: payload.supportingTextEnd.trim() }
      : {}),
  }
}

function featuredSupportingText(
  payload: WikitabFeaturedArticleCardPayload,
  showSpotlightLabel: boolean,
): Pick<WikitabCardComponentData, 'supportingText' | 'supportingHtml'> {
  if (!showSpotlightLabel) return {}
  return cardPayloadSupportingFieldsWithFallback(payload, {
    supportingText: payload.feedAttributionLabel ?? payload.label,
  })
}

function featuredSpotlightMeta(
  payload: WikitabFeaturedArticleCardPayload,
  showSpotlightLabel: boolean,
): Pick<WikitabFeaturedSpotlightComponentData, 'kind' | 'supportingText' | 'supportingHtml'> {
  return {
    kind: 'kind' in payload ? payload.kind : 'potd',
    ...featuredSupportingText(payload, showSpotlightLabel),
  }
}

export function featuredArticlePayloadToSpotlight(
  payload: WikitabFeaturedArticleCardPayload,
  options: { showSpotlightLabel?: boolean } = {},
): WikitabFeaturedSpotlightComponentData {
  const meta = featuredSpotlightMeta(payload, options.showSpotlightLabel !== false)
  const linked = { url: payload.url, title: payload.title }

  switch (payload.kind) {
    case 'tfp':
      return spotlightFromArticleLink(linked, {
        ...meta,
        title: undefined,
        description: payload.description,
        thumbnailUrl: payload.thumbnailUrl,
      })
    case 'tfa':
    default:
      return spotlightFromArticleLink(linked, {
        ...meta,
        title: payload.cardTitle ?? payload.title,
        description: payload.description,
        thumbnailUrl: payload.thumbnailUrl,
      })
  }
}

/** Plain quote line for the card title (leading quote icon, no curly quotes). */
export function quoteHookHtml(quote: string): string {
  let trimmed = quote.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('\u201C') && trimmed.endsWith('\u201D')) {
    return trimmed.slice(1, -1).trim()
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function cardPayloadSupportingFields(
  payload: WikitabCardPayloadSupportingFields,
): Pick<WikitabCardComponentData, 'supportingText' | 'supportingHtml' | 'supportingTextEnd'> {
  const end = payload.supportingTextEnd?.trim()
  const html = payload.supportingHtml?.trim()
  if (html) {
    return end ? { supportingHtml: html, supportingTextEnd: end } : { supportingHtml: html }
  }
  const text = payload.supportingText?.trim()
  if (text || end) {
    return {
      ...(text ? { supportingText: text } : {}),
      ...(end ? { supportingTextEnd: end } : {}),
    }
  }
  return {}
}

/** Payload supporting line when set; otherwise module defaults (page views, label, …). */
export function cardPayloadSupportingFieldsWithFallback(
  payload: WikitabCardPayloadSupportingFields,
  fallback: Pick<WikitabCardComponentData, 'supportingText' | 'supportingHtml'>,
): Pick<WikitabCardComponentData, 'supportingText' | 'supportingHtml'> {
  const authored = cardPayloadSupportingFields(payload)
  if (authored.supportingHtml || authored.supportingText) return authored
  return cardPayloadSupportingFields({
    supportingText: fallback.supportingText,
    supportingHtml: fallback.supportingHtml,
  })
}

/** `WikitabCard` prop when payload uses plain `supportingText` + `supportingIcon` (article-style). */
export function cardPayloadSupportingIcon(
  payload: WikitabCardPayloadSupportingFields,
): ReturnType<typeof resolveCodexIcon> | undefined {
  return payload.supportingIcon ? resolveCodexIcon(payload.supportingIcon) : undefined
}

export function featuredListPayloadToSpotlight(
  payload: WikitabFeaturedListCardPayload,
): WikitabFeaturedSpotlightComponentData {
  return spotlightFromArticleLink(
    { url: payload.url, title: payload.title },
    {
      kind: 'tfl',
      title: payload.title,
      description: payload.description,
      thumbnailUrl: payload.thumbnailUrl,
      ...cardPayloadSupportingFields(payload),
    },
  )
}

export function featuredWordPayloadToSpotlight(
  payload: WikitabFeaturedWordCardPayload,
): WikitabFeaturedSpotlightComponentData {
  return spotlightFromArticleLink(
    { url: payload.url, title: payload.word },
    {
      kind: 'wotd',
      title: payload.word,
      description: payload.definition,
      thumbnailUrl: payload.thumbnailUrl,
      ...cardPayloadSupportingFields(payload),
    },
  )
}

export function featuredQuotePayloadToSpotlight(
  payload: WikitabFeaturedQuoteCardPayload,
): WikitabFeaturedSpotlightComponentData {
  const name = payload.name.trim()
  return spotlightFromArticleLink(
    { url: payload.url, title: name },
    {
      kind: 'qotd',
      title: quoteHookHtml(payload.quote),
      description: name || undefined,
      thumbnailUrl: payload.thumbnailUrl,
      ...cardPayloadSupportingFields(payload),
    },
  )
}

export function featuredArticlePayloadToCardData(
  payload: WikitabFeaturedArticleCardPayload,
  options: { showSpotlightLabel?: boolean } = {},
): WikitabCardComponentData {
  return featuredSpotlightToCardData(
    featuredArticlePayloadToSpotlight(payload, options),
    options.showSpotlightLabel !== false,
  )
}

export function featuredListPayloadToCardData(
  payload: WikitabFeaturedListCardPayload,
  options: { showSpotlightLabel?: boolean } = {},
): WikitabCardComponentData {
  return featuredSpotlightToCardData(
    featuredListPayloadToSpotlight(payload),
    options.showSpotlightLabel !== false,
  )
}

export function featuredWordPayloadToCardData(
  payload: WikitabFeaturedWordCardPayload,
  options: { showSpotlightLabel?: boolean } = {},
): WikitabCardComponentData {
  return featuredSpotlightToCardData(
    featuredWordPayloadToSpotlight(payload),
    options.showSpotlightLabel !== false,
  )
}

export function featuredQuotePayloadToCardData(
  payload: WikitabFeaturedQuoteCardPayload,
  options: { showSpotlightLabel?: boolean } = {},
): WikitabCardComponentData {
  const showLabel = options.showSpotlightLabel !== false
  return featuredSpotlightToCardData(featuredQuotePayloadToSpotlight(payload), showLabel)
}

export function featuredImagePayloadToCardData(
  payload: WikitabFeaturedImageCardPayload,
  options: { showSpotlightLabel?: boolean } = {},
): WikitabCardComponentData {
  return featuredSpotlightToCardData(
    featuredImagePayloadToSpotlight(payload, options),
    options.showSpotlightLabel !== false,
  )
}

export function featuredImagePayloadToSpotlight(
  payload: WikitabFeaturedImageCardPayload,
  _options: { showSpotlightLabel?: boolean } = {},
): WikitabFeaturedSpotlightComponentData {
  return spotlightFromFilePageLink(payload.url, undefined, {
    kind: 'potd',
    title: undefined,
    description: payload.caption,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFields(payload),
  })
}

export function searchActivityPayloadToCardData(
  payload: WikitabSearchActivityCardPayload,
): WikitabCardComponentData {
  return searchActivityItemToCardData(searchActivityCardPayloadToItem(payload))
}

export function searchActivityCardPayloadToItem(
  payload: WikitabSearchActivityCardPayload,
): WikitabSearchActivityItem {
  const { section: _section, editSummary: _editSummary, title, ...rest } = payload
  return {
    pageid: 0,
    ...rest,
    articleTitle: title,
    editSummary: formatActivityEditSummary(payload),
    diffUrl: wikitabRevisionDiffUrl(title, payload.revisionId),
    thankUrl: wikitabRevisionThankUrl(payload.revisionId),
    editedRelative: payload.editedTimestamp.trim()
      ? formatWikitabEditRelativeTime(payload.editedTimestamp)
      : '',
  }
}

export function searchContributeItemToCardData(
  item: WikitabSearchContributeItem,
): WikitabCardComponentData {
  return {
    title: item.articleTitle,
    url: item.editUrl,
    description: item.description?.trim() || undefined,
    thumbnailUrl: item.thumbnailUrl,
    supportingHtml: wikitabSuggestionTaskSupportingHtml(item.task),
    task: item.task,
  }
}

export function searchContributePayloadToCardData(
  payload: WikitabSearchContributeCardPayload,
): WikitabCardComponentData {
  return searchContributeItemToCardData(searchContributeCardPayloadToItem(payload))
}

export function searchImagePayloadToCardData(
  payload: WikitabSearchImageCardPayload,
): WikitabCardComponentData {
  const image = searchImageCardPayloadToImage(payload)
  const caption = image.caption?.trim()
  const attribution = formatImageAttribution(image)
  return {
    url: image.filePageUrl,
    title: imageCardTitle(image),
    thumbnailUrl: image.thumbnailUrl,
    ...(caption ? { description: caption } : {}),
    supportingText: attribution || undefined,
  }
}

export function searchImageToCardData(image: WikitabSearchImage): WikitabCardComponentData {
  return searchImagePayloadToCardData(searchImageToCardPayload(image))
}

export function searchActivityItemToCardPayload(
  item: WikitabSearchActivityItem,
): WikitabSearchActivityCardPayload {
  const { section, editSummary } = parseActivityEditSummaryDisplay(item.editSummary)
  return {
    title: item.articleTitle,
    section,
    editSummary,
    thumbnailUrl: item.thumbnailUrl,
    delta: item.delta,
    articleUrl: item.articleUrl,
    revisionId: item.revisionId,
    reverted: item.reverted,
    highRevertRisk: item.highRevertRisk ?? false,
    needsReview: item.needsReview === true ? true : undefined,
    isLatestRevision: item.isLatestRevision,
    editorName: item.editorName,
    editorUrl: item.editorUrl,
    editedTimestamp: item.editedTimestamp,
    editorKind: item.editorKind,
  }
}

export function searchContributeCardPayloadToItem(
  payload: WikitabSearchContributeCardPayload,
): WikitabSearchContributeItem {
  return {
    pageid: 0,
    articleTitle: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    suggestionLabel: suggestedEditTaskLabel(payload.task),
    body: resolveEditOpportunityCopy(payload.task).body,
    task: payload.task,
    editUrl: payload.url,
  }
}

export function searchContributeItemToCardPayload(
  item: WikitabSearchContributeItem,
): WikitabSearchContributeCardPayload {
  return {
    title: item.articleTitle,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    task: item.task,
    url: item.editUrl,
  }
}

export function searchContributeItemToFeedSuggestedEditsCard(
  item: WikitabSearchContributeItem,
): WikitabCardComponentData {
  return {
    ...feedSuggestedEditsPayloadToCardData(searchContributeItemToFeedSuggestedPayload(item)),
    pageid: item.pageid,
  }
}

export function searchContributeItemToFeedSuggestedPayload(
  item: WikitabSearchContributeItem,
): WikitabFeedSuggestedEditsCardPayload {
  const title = item.articleTitle.trim().replace(/_/g, ' ')
  return {
    key: `suggested-edits:${item.pageid}`,
    title,
    task: item.task,
    url: item.editUrl,
    description: item.description?.trim() || undefined,
    thumbnailUrl: item.thumbnailUrl,
  }
}

function normalizeSearchExtractHtml(html: string): string {
  return html
    .replace(/<mark(\s[^>]*)?>/gi, '<strong>')
    .replace(/<\/mark>/gi, '</strong>')
}

function searchResultExtractFromPayload(extractHtml: string | undefined): {
  extract: string
  matchSnippetHtml?: string
} {
  const trimmed = extractHtml?.trim() ?? ''
  if (!trimmed) return { extract: '' }
  if (/<[a-z]/i.test(trimmed)) {
    return { extract: '', matchSnippetHtml: normalizeSearchExtractHtml(trimmed) }
  }
  return { extract: trimmed }
}

export function searchResultCardPayloadToArticle(
  payload: WikitabSearchResultCardPayload,
): WikitabSearchArticle {
  const { extract, matchSnippetHtml } = searchResultExtractFromPayload(payload.extractHtml)
  return {
    pageid: 0,
    title: payload.title,
    description: payload.description,
    extract,
    matchSnippetHtml,
    thumbnailUrl: payload.thumbnailUrl,
    url: payload.url,
    relation: 'related',
    rationaleHtml: payload.rationaleHtml,
  }
}

export function searchArticleToResultCardPayload(
  article: WikitabSearchArticle,
): WikitabSearchResultCardPayload {
  const extractHtml = article.matchSnippetHtml?.trim() || article.extract?.trim() || undefined
  return {
    title: article.title,
    url: article.url,
    description: article.description,
    extractHtml,
    rationaleHtml:
      article.rationaleHtml ??
      formatSearchArticleRelationRationaleHtml(article, ''),
    thumbnailUrl: article.thumbnailUrl,
  }
}

export function searchImageCardPayloadToImage(
  payload: WikitabSearchImageCardPayload,
): WikitabSearchImage {
  return {
    pageid: 0,
    title: commonsFilePageTitleFromUrl(payload.url),
    width: 0,
    height: 0,
    thumbnailUrl: payload.thumbnailUrl,
    filePageUrl: payload.url,
    mime: '',
    license: payload.license,
    licenseUrl: '',
    credit: payload.credit,
    caption: payload.caption,
  }
}

export function searchImageToCardPayload(image: WikitabSearchImage): WikitabSearchImageCardPayload {
  return {
    thumbnailUrl: image.thumbnailUrl,
    url: image.filePageUrl,
    license: image.license,
    credit: image.credit,
    caption: image.caption,
  }
}

export function savedArticleItemToCardPayload(
  item: WikitabSavedArticleItem,
): WikitabSavedArticleCardPayload {
  return {
    key: item.id,
    url: item.url,
    title: item.title,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
  }
}

export function savedArticlePayloadToCardData(
  payload: WikitabSavedArticleCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    title: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFields(payload),
  }
}

export function savedWordItemToFeaturedPayload(
  item: WikitabSavedWordItem,
): WikitabFeaturedWordCardPayload {
  return {
    key: item.id,
    url: item.url,
    word: item.word,
    definition: item.description ?? '',
  }
}

export function savedQuoteItemToFeaturedPayload(
  item: WikitabSavedQuoteItem,
): WikitabFeaturedQuoteCardPayload {
  return {
    key: item.id,
    url: item.url,
    name: item.personName?.trim() || item.quoteText.slice(0, 80),
    quote: item.quoteText,
  }
}

export function savedListItemToFeaturedPayload(
  item: WikitabSavedListItem,
): WikitabFeaturedListCardPayload {
  return {
    key: item.id,
    url: item.url,
    title: item.listTitle,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
  }
}

function savedSuggestionArticleTitle(item: WikitabSavedSuggestionItem): string {
  const raw = item.articleTitle.trim()
  const legacy = raw.match(/^Edit\s+(.+?):\s+/i)
  if (legacy) return legacy[1].trim().replace(/_/g, ' ')
  return raw.replace(/_/g, ' ')
}

export function savedSuggestionItemToCardPayload(
  item: WikitabSavedSuggestionItem,
): WikitabSavedSuggestionCardPayload {
  const title = savedSuggestionArticleTitle(item)
  return {
    key: item.id,
    url: item.editUrl,
    title,
    task: item.task,
    description: item.description?.trim() || undefined,
    thumbnailUrl: item.thumbnailUrl,
  }
}

export function savedSuggestionPayloadToCardData(
  payload: WikitabSavedSuggestionCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    url: payload.url,
    title: payload.title,
    task: payload.task,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    supportingHtml: wikitabSuggestionTaskSupportingHtml(payload.task),
  }
}

export function savedChangeItemToCardPayload(
  item: WikitabSavedChangeItem,
): WikitabSearchActivityCardPayload {
  const { section, editSummary } = parseActivityEditSummaryDisplay(item.editSummary)
  return {
    title: item.articleTitle,
    section,
    editSummary,
    delta: item.delta,
    articleUrl: articleUrl(item.articleTitle),
    revisionId: item.revisionId,
    reverted: item.reverted ?? false,
    highRevertRisk: item.highRevertRisk ?? false,
    isLatestRevision: item.isLatestRevision ?? false,
    editorName: item.editorName,
    editorUrl: `https://en.wikipedia.org/wiki/User:${encodeURIComponent(item.editorName.replace(/ /g, '_'))}`,
    editedTimestamp: item.editedTimestamp?.trim() || '',
    editorKind: item.editorKind,
  }
}

export function savedSnippetItemToCardPayload(
  item: WikitabSavedSnippetItem,
): WikitabSavedSnippetCardPayload {
  return {
    key: item.id,
    url: item.url,
    description: item.snippetHtml,
    thumbnailUrl: item.thumbnailUrl,
  }
}

export function savedSnippetPayloadToCardData(
  payload: WikitabSavedSnippetCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromSnippet(payload),
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
  }
}

export function savedDiscussionItemToCardPayload(
  item: WikitabSavedDiscussionItem,
): WikitabSavedDiscussionCardPayload {
  return {
    key: item.id,
    url: item.url,
    title: item.title,
    noticeboardTitle: item.noticeboardLabel,
    commentCount: item.commentCount,
    latestReplyRelativeLabel: item.latestReplyRelative,
  }
}

export function savedDiscussionPayloadToCardData(
  payload: WikitabSavedDiscussionCardPayload,
): WikitabCardComponentData {
  return {
    key: payload.key,
    ...cardWideLinkFromArticle(payload),
    description: payload.noticeboardTitle,
    supportingText: formatCommentCount(payload.commentCount),
    supportingTextEnd: payload.latestReplyRelativeLabel,
  }
}

export function savedImageItemToCardPayload(item: WikitabSavedImageItem): WikitabSavedImageCardPayload {
  const fileName = imageDisplayTitle(item.title)
  const caption = item.description.trim()
  const attribution = formatImageAttribution({ license: item.licenseType, credit: item.artistHtml })
  if (item.captionHtml) {
    return {
      key: item.id,
      url: item.filePageUrl,
      thumbnailUrl: item.thumbnailUrl,
      caption: item.captionHtml,
    }
  }
  return {
    key: item.id,
    url: item.filePageUrl,
    thumbnailUrl: item.thumbnailUrl,
    caption: caption || fileName,
    attributionPlainText: attribution || undefined,
  }
}

export function savedImagePayloadToCardData(
  payload: WikitabSavedImageCardPayload,
): WikitabCardComponentData {
  const caption = payload.caption?.trim()
  return {
    key: payload.key,
    url: payload.url,
    description: caption || filePageLinkTitleFromUrl(payload.url) || undefined,
    thumbnailUrl: payload.thumbnailUrl,
    ...cardPayloadSupportingFieldsWithFallback(payload, {
      supportingText: payload.attributionPlainText,
    }),
  }
}
