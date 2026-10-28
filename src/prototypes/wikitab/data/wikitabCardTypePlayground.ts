import type { AttributionTrustAndRelevance } from '@/components/attribution/types'

import { WIKITAB_EDITOR_KINDS } from './fetchWikitabSearchActivity'
import {
  catalogEntryById,
  type WikitabCardCatalogEntry,
  type WikitabCardPrimitiveId,
  type WikitabCardTypePropertySchema,
  type WikitabCardTypeSchema,
} from './wikitabCardTypeLinks'
import { WIKITAB_FEATURED_ARTICLE_SPOTLIGHT_KINDS } from './wikitabCardPayloadTypes'
import {
  codexIconExportLabel,
  codexIconExportNameFromIcon,
  CODEX_ICON_NAMES,
  isCodexIconName,
  resolveCodexIcon,
} from './wikitabCardSupportingIcons'
import type { Icon } from '@wikimedia/codex-icons'
import { WIKITAB_DEMO_LIST_MCU } from './wikitabCardTypeDemoListMcu'
import { WIKITAB_DEMO_QUOTE_WET_LEG } from './wikitabCardTypeDemoQuoteWetLeg'
import { WIKITAB_DEMO_WORD_WET } from './wikitabCardTypeDemoWordWet'
import {
  playgroundInferredMenuRows,
  playgroundMenuItemsForEntry,
} from './wikitabCardPlaygroundMenu'
import type {
  WikitabArticleCardPayload,
  WikitabSearchActivityCardPayload,
  WikitabSearchResultCardPayload,
} from './wikitabCardPayloadTypes'
import {
  featuredImagePayloadToCardData,
  featuredListPayloadToCardData,
  featuredQuotePayloadToCardData,
  featuredWordPayloadToCardData,
  feedDiscussionPayloadToCardData,
  feedDykPayloadToCardData,
  feedSuggestedEditsPayloadToCardData,
  articleCardPayloadToCardData,
  cardPayloadSupportingIcon,
  savedArticlePayloadToCardData,
  savedDiscussionPayloadToCardData,
  savedImagePayloadToCardData,
  savedSuggestionPayloadToCardData,
  searchActivityCardPayloadToItem,
  searchActivityPayloadToCardData,
  searchContributePayloadToCardData,
  searchImagePayloadToCardData,
  searchResultCardPayloadToArticle,
} from './wikitabCardPayloadMappers'
import { wikitabCardPropsForSearchActivityItem } from './wikitabSearchActivityWikitabCard'
import type { WikitabCardTypeMap } from './wikitabCardTypeLinks'
import {
  wikitabCardBindProps,
  wikitabCardIsLoading,
  wikitabCardPresentationFieldRows,
  wikitabPrimitiveHardcodesSupportingIcon,
} from './wikitabCardPresentation'
import {
  WIKITAB_CARD_RESERVED_SLOT_HEIGHT,
  wikitabReservedSlotHeight,
} from './wikitabCardSlotHeights'
import {
  WIKITAB_QUOTE_CARD_LEADING_ICON,
  WIKITAB_WORD_CARD_LEADING_ICON,
  type WikitabCardData,
  type WikitabCardLoading,
  type WikitabCardLoadingField,
} from '../sections'

/** Shared demo article — same band as `template-article-custom` / snapshots. */
const WET_LEG = {
  title: 'Wet Leg',
  url: 'https://en.wikipedia.org/wiki/Wet_Leg',
  /** Snippet card-wide link — section anchor, not just the article root. */
  snippetUrl: 'https://en.wikipedia.org/wiki/Wet_Leg#Awards_and_nominations',
  articleDescription: 'English indie rock band from the Isle of Wight',
  thumbUrl: `${import.meta.env.BASE_URL}images/wet-leg-o2-infobox.jpg`,
  seedTitle: 'Chaise Longue (song)',
  snippetDescription:
    'Did you know that <a href="https://en.wikipedia.org/wiki/Wet_Leg">Wet Leg</a> won the Grammy Award for Best Alternative Music Album?',
  otdHtml:
    'In <a href="https://en.wikipedia.org/wiki/2022">2022</a>, <a href="https://en.wikipedia.org/wiki/Wet_Leg">Wet Leg</a>\'s debut album reached number one on the UK Albums Chart.',
  newsHtml:
    '<a href="https://en.wikipedia.org/wiki/Wet_Leg">Wet Leg</a> continue touring after their Grammy win.',
  editSection: 'Singles',
  editSummary: 'Update charts',
  commonsFileTitle: 'File:Wet Leg O2 Academy Brixton 2025-05-24 -29.jpg',
  commonsFileUrl:
    'https://commons.wikimedia.org/wiki/File:Wet_Leg_O2_Academy_Brixton_2025-05-24_-29.jpg',
  /** From Commons extmetadata on the file above. */
  commonsLicense: 'CC BY-SA 4.0',
  commonsCredit: 'Sol Procter-Tarabanov',
  commonsCaption: 'Wet Leg performing at O2 Academy Brixton in London in 2025',
} as const

function searchResultAttributionTrustFromPayload(
  payload: WikitabSearchResultCardPayload,
): AttributionTrustAndRelevance | undefined {
  const { pageViews, referenceCount, lastUpdated } = payload
  if (
    pageViews === undefined &&
    referenceCount === undefined &&
    !lastUpdated?.trim()
  ) {
    return undefined
  }
  return {
    page_views: pageViews,
    reference_count: referenceCount,
    last_updated: lastUpdated?.trim() || undefined,
  }
}

function componentBasename(componentPath: string): string {
  return componentPath.replace(/\.vue$/, '')
}

export function schemaVariantKey(catalogId: string, schemaIndex: number): string {
  return `${catalogId}::${schemaIndex}`
}

function isWordDemoCatalog(catalogId: string): boolean {
  return catalogId === 'primitive-word' || catalogId === 'saved-word'
}

function isQuoteDemoCatalog(catalogId: string): boolean {
  return catalogId === 'primitive-quote' || catalogId === 'saved-quote'
}

/** Every `WikitabCard.vue` catalog entry is an instance of one primitive. */
function playgroundEntryPrimitive(entry: WikitabCardCatalogEntry): WikitabCardPrimitiveId {
  if (!entry.primitiveId) {
    throw new Error(`Catalog entry "${entry.id}" has no primitiveId`)
  }
  return entry.primitiveId
}

/** Payload + bind `supportingIcon` — not when the primitive pins it. */
function playgroundPayloadSupportingIconEditable(entry: WikitabCardCatalogEntry): boolean {
  if (!entry.primitiveId) return true
  return !wikitabPrimitiveHardcodesSupportingIcon(entry.primitiveId)
}

function isListDemoCatalog(catalogId: string): boolean {
  return catalogId === 'primitive-list' || catalogId === 'saved-list'
}

function isDiscussionDemoCatalog(catalogId: string): boolean {
  return catalogId === 'primitive-discussion' || catalogId === 'saved-discussion'
}

function isSuggestionDemoCatalog(catalogId: string): boolean {
  return (
    catalogId === 'primitive-suggestion' ||
    catalogId === 'saved-suggestion' ||
    catalogId === 'search-contribute'
  )
}

function isImageDemoCatalog(catalogId: string): boolean {
  return (
    catalogId === 'primitive-image' ||
    catalogId === 'saved-image' ||
    catalogId === 'search-image'
  )
}

function quoteDemoField(name: string, catalogId: string): string | undefined {
  if (!isQuoteDemoCatalog(catalogId)) return undefined
  switch (name) {
    case 'url':
      return WIKITAB_DEMO_QUOTE_WET_LEG.url
    case 'name':
      return WIKITAB_DEMO_QUOTE_WET_LEG.name
    case 'quote':
      return WIKITAB_DEMO_QUOTE_WET_LEG.quote
    case 'thumbnailUrl':
      return ''
    default:
      return undefined
  }
}

function listDemoField(name: string, catalogId: string): string | undefined {
  if (!isListDemoCatalog(catalogId)) return undefined
  switch (name) {
    case 'url':
      return WIKITAB_DEMO_LIST_MCU.url
    case 'title':
      return WIKITAB_DEMO_LIST_MCU.title
    case 'description':
      return WIKITAB_DEMO_LIST_MCU.description
    case 'thumbnailUrl':
      return WIKITAB_DEMO_LIST_MCU.thumbnailUrl
    default:
      return undefined
  }
}

function wordDemoField(name: string, catalogId: string): string | undefined {
  if (!isWordDemoCatalog(catalogId)) return undefined
  switch (name) {
    case 'url':
      return WIKITAB_DEMO_WORD_WET.url
    case 'word':
      return WIKITAB_DEMO_WORD_WET.word
    case 'definition':
      return WIKITAB_DEMO_WORD_WET.definition
    case 'thumbnailUrl':
      return ''
    case 'supportingText':
      return WIKITAB_DEMO_WORD_WET.supportingText
    default:
      return undefined
  }
}

function sampleValueForProperty(name: string, type: string, catalogId: string): string {
  const samples: Record<string, string> = {
    key: `${catalogId}-demo`,
    url: WET_LEG.url,
    title: WET_LEG.title,
    commentCount: '12',
    latestReplyTimestamp: '2026-03-27T12:00:00Z',
    latestReplyRelativeLabel: '2h ago',
    description: WET_LEG.articleDescription,
    thumbnailUrl: WET_LEG.thumbUrl,
    pageViews: '1250000',
    seedTitle: WET_LEG.seedTitle,
    ageYears: '6',
    task: 'Extend article',
    kind: 'tfa',
    label: "Today's featured article",
    cardTitle: WET_LEG.title,
    feedAttributionLabel: 'From Wikipedia',
    caption: WET_LEG.commonsCaption,
    license: WET_LEG.commonsLicense,
    attributionPlainText: `${WET_LEG.commonsLicense}, ${WET_LEG.commonsCredit}`,
    section: WET_LEG.editSection,
    editSummary: WET_LEG.editSummary,
    delta: '4',
    articleUrl: WET_LEG.url,
    revisionId: '1234567890',
    reverted: 'false',
    highRevertRisk: 'false',
    isLatestRevision: 'true',
    editorName: 'ExampleEditor',
    editorUrl: 'https://en.wikipedia.org/wiki/User:ExampleEditor',
    editedTimestamp: '2026-03-27T12:26:00Z',
    editorKind: 'user',
    extractHtml:
      '…English <strong>indie rock</strong> band from the Isle of Wight, founded in 2019 by Rhian Teasdale and Hester Chambers…',
    rationaleHtml: `<strong>Wet Leg</strong> is related to <strong>${WET_LEG.seedTitle}</strong>.`,
    referenceCount: '48',
    lastUpdated: '2026-03-01T14:30:00Z',
    credit: WET_LEG.commonsCredit,
  }

  if (name === 'url') {
    if (catalogId === 'primitive-snippet') {
      return WET_LEG.snippetUrl
    }
    if (isDiscussionDemoCatalog(catalogId)) {
      return 'https://en.wikipedia.org/wiki/Wikipedia:Village_pump_(idea_lab)#Wet_Leg_discography'
    }
    if (isSuggestionDemoCatalog(catalogId)) {
      return `https://en.wikipedia.org/wiki/Special:EditPage/${encodeURIComponent(WET_LEG.title.replace(/ /g, '_'))}`
    }
    if (isImageDemoCatalog(catalogId)) {
      return WET_LEG.commonsFileUrl
    }
  }
  if (name === 'title' && isDiscussionDemoCatalog(catalogId)) {
    return 'Should Wet Leg discography be split by medium?'
  }
  if (name === 'noticeboardTitle' && isDiscussionDemoCatalog(catalogId)) {
    return 'Village pump (idea lab)'
  }
  const wordDemo = wordDemoField(name, catalogId)
  if (wordDemo !== undefined) return wordDemo
  const quoteDemo = quoteDemoField(name, catalogId)
  if (quoteDemo !== undefined) return quoteDemo
  const listDemo = listDemoField(name, catalogId)
  if (listDemo !== undefined) return listDemo
  if (name === 'thumbnailUrl' && catalogId === 'primitive-edit') {
    return ''
  }
  if (name === 'description' && catalogId === 'primitive-snippet') {
    return WET_LEG.snippetDescription
  }
  if (catalogId === 'primitive-image' && name === 'caption') return WET_LEG.commonsCaption
  if (catalogId === 'saved-image' && name === 'caption') return WET_LEG.commonsCaption
  if (name in samples) return samples[name]
  if (type === 'number') return '0'
  if (type === 'boolean' || type === 'true') return 'false'
  if (name === 'kind') {
    return 'tfa'
  }
  if (name === 'label' && catalogId.startsWith('saved-')) return ''
  if (catalogId === 'primitive-article' && name === 'thumbnailUrl') return WET_LEG.thumbUrl
  if (catalogId === 'primitive-image' && name === 'thumbnailUrl') return WET_LEG.thumbUrl
  return ''
}

export function defaultFieldValues(
  catalogId: string,
  schema: WikitabCardTypeSchema,
  schemaIndex: number,
): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const prop of schema.properties) {
    fields[prop.name] = sampleValueForProperty(prop.name, prop.type, catalogId)
  }
  return fields
}

function coerceField(type: string, raw: string, optional: boolean): unknown {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return optional ? undefined : ''
  }
  if (type === 'number') {
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : 0
  }
  if (type === 'boolean' || type === 'true') {
    return trimmed === 'true'
  }
  return trimmed
}

export function payloadFromFieldValues(
  schema: WikitabCardTypeSchema,
  fields: Record<string, string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const prop of schema.properties) {
    const raw = fields[prop.name] ?? ''
    const value = coerceField(prop.type, raw, prop.optional)
    if (value === undefined) continue
    payload[prop.name] = value
  }
  return payload
}

type TypeName = keyof WikitabCardTypeMap

function mapPayload(
  typeName: TypeName,
  payload: Record<string, unknown>,
  catalogId: string,
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = payload as any
  const showSpotlightLabel = !catalogId.startsWith('saved-')
  switch (typeName) {
    case 'WikitabArticleCardPayload':
      return articleCardPayloadToCardData(p)
    case 'WikitabFeedDykCardPayload':
      return feedDykPayloadToCardData(p)
    case 'WikitabFeedDiscussionCardPayload':
      return feedDiscussionPayloadToCardData(p)
    case 'WikitabFeedSuggestedEditsCardPayload':
      return feedSuggestedEditsPayloadToCardData(p)
    case 'WikitabFeaturedListCardPayload':
      return featuredListPayloadToCardData(p, { showSpotlightLabel })
    case 'WikitabFeaturedImageCardPayload':
      return featuredImagePayloadToCardData(p, { showSpotlightLabel })
    case 'WikitabFeaturedQuoteCardPayload':
      return featuredQuotePayloadToCardData(p, { showSpotlightLabel })
    case 'WikitabFeaturedWordCardPayload':
      return featuredWordPayloadToCardData(p, { showSpotlightLabel })
    case 'WikitabSearchActivityCardPayload':
      return searchActivityPayloadToCardData(p)
    case 'WikitabSearchContributeCardPayload':
      return searchContributePayloadToCardData(p)
    case 'WikitabSearchResultCardPayload':
      return searchResultCardPayloadToArticle(p)
    case 'WikitabSearchImageCardPayload':
      return searchImagePayloadToCardData(p)
    case 'WikitabSavedArticleCardPayload':
      return savedArticlePayloadToCardData(p)
    case 'WikitabSavedSuggestionCardPayload':
      return savedSuggestionPayloadToCardData(p)
    case 'WikitabSavedDiscussionCardPayload':
      return savedDiscussionPayloadToCardData(p)
    case 'WikitabSavedImageCardPayload':
      return savedImagePayloadToCardData(p)
    default:
      return null
  }
}

export interface WikitabCardTypePreviewModel {
  component: 'WikitabCard' | 'WikitabSearchResultCard' | 'WikitabSearchLoadingCard'
  props: Record<string, unknown>
}

function wikitabCardPropsFromData(
  card: WikitabCardData,
  entry: WikitabCardCatalogEntry,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return wikitabCardBindProps(playgroundEntryPrimitive(entry), { card, ...extra })
}

function wikitabCardPreviewBaseProps(
  entry: WikitabCardCatalogEntry,
  schema: WikitabCardTypeSchema,
  fields: Record<string, string>,
): Record<string, unknown> | null {
  if (!entry.typeName) return null

  const payload = payloadFromFieldValues(schema, fields)
  const mapped = mapPayload(entry.typeName, payload, entry.id)
  if (mapped == null) return null

  if (entry.typeName === 'WikitabSearchActivityCardPayload') {
    const item = searchActivityCardPayloadToItem(payload as WikitabSearchActivityCardPayload)
    const savedCatalog = entry.id === 'saved-change'
    return wikitabCardPropsForSearchActivityItem(item, {
      includeSave: true,
      isSaved: false,
      revisionActionsMenu: !savedCatalog,
    })
  }

  let props = wikitabCardPropsFromData(mapped as WikitabCardData, entry)
  if (
    playgroundPayloadSupportingIconEditable(entry) &&
    payload &&
    typeof payload === 'object' &&
    'supportingIcon' in payload
  ) {
    const icon = cardPayloadSupportingIcon(
      payload as WikitabArticleCardPayload & { supportingIcon?: string },
    )
    if (icon) props = { ...props, supportingIcon: icon }
  }
  if (entry.typeName === 'WikitabFeaturedQuoteCardPayload') {
    props = { ...props, icon: WIKITAB_QUOTE_CARD_LEADING_ICON }
  }
  if (entry.typeName === 'WikitabFeaturedWordCardPayload') {
    props = { ...props, icon: WIKITAB_WORD_CARD_LEADING_ICON }
  }
  return props
}

export function previewModelForEntry(
  entry: WikitabCardCatalogEntry,
  schema: WikitabCardTypeSchema,
  fields: Record<string, string>,
  bindFields?: Record<string, string>,
): WikitabCardTypePreviewModel | null {
  if (entry.id === 'search-loading') {
    return { component: 'WikitabSearchLoadingCard', props: {} }
  }
  if (!entry.typeName) return null

  const payload = payloadFromFieldValues(schema, fields)
  const mapped = mapPayload(entry.typeName, payload, entry.id)
  if (mapped == null) return null

  const component = componentBasename(entry.componentPath)

  if (component === 'WikitabCard') {
    const baseProps = wikitabCardPreviewBaseProps(entry, schema, fields)
    if (!baseProps) return null
    const props = bindFields
      ? applyPlaygroundBindFieldsToWikitabCardProps(baseProps, bindFields, entry)
      : baseProps
    return {
      component: 'WikitabCard',
      props,
    }
  }

  if (component === 'WikitabSearchResultCard') {
    const searchPayload = payload as WikitabSearchResultCardPayload
    return {
      component: 'WikitabSearchResultCard',
      props: {
        article: mapped,
        searchQuery: 'wet leg',
        isArticleSaved: false,
        attributionTrust: searchResultAttributionTrustFromPayload(searchPayload),
      },
    }
  }

  return null
}

/** Stable card id — required on payloads but not edited in the playground. */
const PLAYGROUND_OMITTED_PAYLOAD_FIELD_NAMES = new Set(['key'])

/**
 * Supporting fields the primitive's mapper derives from other payload fields — shown as
 * hardcoded runtime rows, never as editable payload rows. Every other supporting field
 * on a payload type is editable.
 */
const PLAYGROUND_MAPPER_DERIVED_SUPPORTING_FIELD_NAMES: Partial<
  Record<WikitabCardPrimitiveId, ReadonlySet<string>>
> = {
  discussion: new Set(['supportingText', 'supportingHtml', 'supportingTextEnd']),
  suggestion: new Set(['supportingText', 'supportingHtml']),
}

function playgroundPayloadFieldOmittedForEntry(
  entry: WikitabCardCatalogEntry | undefined,
  fieldName: string,
): boolean {
  if (!entry) return false
  if (
    fieldName === 'supportingIcon' &&
    !playgroundPayloadSupportingIconEditable(entry)
  ) {
    return true
  }
  if (!entry.primitiveId) return false
  return PLAYGROUND_MAPPER_DERIVED_SUPPORTING_FIELD_NAMES[entry.primitiveId]?.has(fieldName) ?? false
}

export function filterPlaygroundPayloadProperties(
  properties: readonly WikitabCardTypePropertySchema[],
  entry?: WikitabCardCatalogEntry,
): WikitabCardTypePropertySchema[] {
  return properties.filter(
    (prop) =>
      !PLAYGROUND_OMITTED_PAYLOAD_FIELD_NAMES.has(prop.name) &&
      !playgroundPayloadFieldOmittedForEntry(entry, prop.name),
  )
}

/** Payload table — options (`WikitabCardData` names) then custom domain fields. */
export function orderPlaygroundPayloadProperties(
  properties: readonly WikitabCardTypePropertySchema[],
  entry?: WikitabCardCatalogEntry,
): WikitabCardTypePropertySchema[] {
  const filtered = filterPlaygroundPayloadProperties(properties, entry)
  const options: WikitabCardTypePropertySchema[] = []
  const custom: WikitabCardTypePropertySchema[] = []
  for (const prop of filtered) {
    if (playgroundPayloadFieldKind(prop.name, entry) === 'options') options.push(prop)
    else custom.push(prop)
  }
  options.sort((a, b) => {
    const orderA = playgroundPayloadOptionsFieldOrderIndex(a.name)
    const orderB = playgroundPayloadOptionsFieldOrderIndex(b.name)
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
  return [...options, ...custom]
}

/** Options-column order — keep supporting bind props beside supporting line fields. */
const PLAYGROUND_PAYLOAD_OPTIONS_FIELD_ORDER = [
  'url',
  'title',
  'description',
  'thumbnailUrl',
  'supportingText',
  'supportingIcon',
  'supportingHtml',
  'supportingTextEnd',
] as const

function playgroundPayloadOptionsFieldOrderIndex(name: string): number {
  const idx = (PLAYGROUND_PAYLOAD_OPTIONS_FIELD_ORDER as readonly string[]).indexOf(name)
  return idx >= 0 ? idx : PLAYGROUND_PAYLOAD_OPTIONS_FIELD_ORDER.length
}

/** `WikitabCardData` declaration order for runtime field sorting. */
const WIKITAB_CARD_DATA_PLAYGROUND_FIELD_ORDER = [
  'url',
  'title',
  'description',
  'supportingText',
  'supportingIcon',
  'supportingHtml',
  'supportingTextEnd',
  'thumbnailUrl',
  'commentCount',
  'pageid',
  'task',
  'suggestionBody',
] as const

function playgroundRuntimeFieldOrderIndex(name: string): number {
  const cardIdx = (WIKITAB_CARD_DATA_PLAYGROUND_FIELD_ORDER as readonly string[]).indexOf(name)
  if (cardIdx >= 0) return cardIdx
  const bindIdx = WIKITAB_CARD_INFERRED_BIND_FIELDS.findIndex((field) => field.name === name)
  if (bindIdx >= 0) return WIKITAB_CARD_DATA_PLAYGROUND_FIELD_ORDER.length + bindIdx
  return WIKITAB_CARD_DATA_PLAYGROUND_FIELD_ORDER.length + WIKITAB_CARD_INFERRED_BIND_FIELDS.length
}

function sortPlaygroundRuntimeFieldRows(rows: WikitabCardTypeRuntimeFieldRow[]): void {
  rows.sort((a, b) => {
    const kindA = a.rowKind === 'options' ? 1 : 0
    const kindB = b.rowKind === 'options' ? 1 : 0
    if (kindA !== kindB) return kindA - kindB
    const orderA = playgroundRuntimeFieldOrderIndex(a.name)
    const orderB = playgroundRuntimeFieldOrderIndex(b.name)
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

export type WikitabCardTypeRuntimeFieldRowKind = 'options' | 'inferred'

export interface WikitabCardTypeRuntimeFieldRow {
  name: string
  type: string
  value: string
  rowKind: WikitabCardTypeRuntimeFieldRowKind
}

function formatPlaygroundRuntimeValue(value: unknown): string {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function collectPlaygroundRuntimeFieldRows(
  value: unknown,
  pathPrefix: string,
  out: WikitabCardTypeRuntimeFieldRow[],
): void {
  if (value === null || value === undefined) {
    if (!pathPrefix) return
    out.push({
      name: pathPrefix,
      type: 'null',
      value: formatPlaygroundRuntimeValue(value),
      rowKind: 'inferred',
    })
    return
  }
  if (typeof value !== 'object') {
    out.push({
      name: pathPrefix,
      type: typeof value,
      value: formatPlaygroundRuntimeValue(value),
      rowKind: 'inferred',
    })
    return
  }
  if (Array.isArray(value)) {
    out.push({
      name: pathPrefix,
      type: 'array',
      value: formatPlaygroundRuntimeValue(value),
      rowKind: 'inferred',
    })
    return
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key
    if (!pathPrefix && PLAYGROUND_OMITTED_PAYLOAD_FIELD_NAMES.has(key)) {
      continue
    }
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      collectPlaygroundRuntimeFieldRows(child, path, out)
    } else if (child !== undefined) {
      out.push({
        name: path,
        type: Array.isArray(child) ? 'array' : typeof child,
        value: formatPlaygroundRuntimeValue(child),
        rowKind: 'inferred',
      })
    }
  }
}

function previewPrimaryDataProp(component: WikitabCardTypePreviewModel['component']): string | null {
  switch (component) {
    case 'WikitabCard':
      return 'card'
    case 'WikitabSearchResultCard':
      return 'article'
    default:
      return null
  }
}

/** Hardcoded presentation of the entry's primitive (read-only in the payloads UI). */
export function playgroundPresentationFieldRows(
  entry: WikitabCardCatalogEntry,
): ReturnType<typeof wikitabCardPresentationFieldRows> {
  if (entry.componentPath !== 'WikitabCard.vue' || !entry.primitiveId) return []
  return wikitabCardPresentationFieldRows(entry.primitiveId)
}

const PRESENTATION_PROP_NAMES = new Set([
  'descriptionFormat',
  'titleLineClamp',
  'descriptionLineClamp',
  'thumbnailType',
  'thumbnailSize',
  'thumbnailLayout',
])

/** Bind props from `wikitabCardBindProps` — not payload or mapper output. */
const BIND_PROP_NAMES = new Set([
  ...PRESENTATION_PROP_NAMES,
  'searchQuery',
  'isArticleSaved',
  'attributionTrust',
])

/** Optional `WikitabCard` bind props — options (editable defaults) or hardcoded runtime (effective props). */
const WIKITAB_CARD_INFERRED_BIND_FIELDS: { name: string; type: string }[] = [
  { name: 'menu', type: 'WikitabCardMenuItem[]' },
  { name: 'chips', type: 'WikitabCardChip[]' },
  { name: 'supportingIcon', type: 'CodexIconName' },
  { name: 'icon', type: 'Icon' },
  { name: 'loading', type: 'WikitabCardLoading' },
  { name: 'loadingHeight', type: 'number' },
]

const WIKITAB_CARD_LOADING_FIELD_NAMES = new Set<string>([
  'title',
  'description',
  'supporting',
  'supportingEnd',
  'thumbnail',
  'chips',
] satisfies WikitabCardLoadingField[])

/** `true` / `false`, or an object such as `{description: true}` (keys may be unquoted). */
function parsePlaygroundLoadingValue(raw: string): WikitabCardLoading {
  const trimmed = raw.trim()
  if (trimmed === 'true') return true
  if (!trimmed.startsWith('{')) return false
  try {
    const json = trimmed
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":')
      .replace(/,\s*}/g, '}')
    const parsed = JSON.parse(json) as Record<string, unknown>
    const fields: Partial<Record<WikitabCardLoadingField, boolean>> = {}
    for (const [name, value] of Object.entries(parsed)) {
      if (WIKITAB_CARD_LOADING_FIELD_NAMES.has(name) && value === true) {
        fields[name as WikitabCardLoadingField] = true
      }
    }
    return Object.keys(fields).length ? fields : false
  } catch {
    return false
  }
}

function formatPlaygroundLoadingValue(value: unknown): string {
  if (value === true) return 'true'
  if (value && typeof value === 'object') return JSON.stringify(value)
  return 'false'
}

const WIKITAB_CARD_INFERRED_BIND_NAMES = new Set(
  WIKITAB_CARD_INFERRED_BIND_FIELDS.map((field) => field.name),
)

export function defaultPlaygroundBindFieldValues(
  entry: WikitabCardCatalogEntry,
): Record<string, string> {
  return {
    chips: '[]',
    supportingIcon: '',
    icon: '',
    loading: 'false',
    loadingHeight: entry.primitiveId ? String(wikitabReservedSlotHeight(entry.primitiveId)) : '',
  }
}

export function parsePlaygroundBindFieldValue(name: string, raw: string): unknown {
  const trimmed = raw.trim()
  switch (name) {
    case 'menu':
    case 'chips': {
      if (!trimmed) return []
      try {
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    case 'loading':
      return parsePlaygroundLoadingValue(trimmed)
    case 'loadingHeight': {
      const height = Number(trimmed || NaN)
      return Number.isNaN(height) ? undefined : height
    }
    case 'supportingIcon':
    case 'icon':
      if (!trimmed || !isCodexIconName(trimmed)) return undefined
      return resolveCodexIcon(trimmed)
    default:
      return undefined
  }
}

export function applyPlaygroundBindFieldsToWikitabCardProps(
  baseProps: Record<string, unknown>,
  bindFields: Record<string, string>,
  entry: WikitabCardCatalogEntry,
): Record<string, unknown> {
  const merged = { ...baseProps }
  const defaults = defaultPlaygroundBindFieldValues(entry)
  for (const field of WIKITAB_CARD_INFERRED_BIND_FIELDS) {
    if (!wikitabCardBindPropUsesDefault(field.name, baseProps)) continue
    if (field.name === 'menu') {
      merged.menu = playgroundMenuItemsForEntry(entry)
      continue
    }
    if (field.name === 'supportingIcon' && !playgroundPayloadSupportingIconEditable(entry)) {
      continue
    }
    const raw = bindFields[field.name] ?? defaults[field.name] ?? ''
    merged[field.name] = parsePlaygroundBindFieldValue(field.name, raw)
  }
  if (wikitabCardIsLoading(merged.loading as WikitabCardLoading) && merged.loadingHeight == null) {
    merged.loadingHeight = wikitabReservedSlotHeight(playgroundEntryPrimitive(entry))
  }
  return merged
}

export function playgroundRuntimeBindFieldEditable(
  entry: WikitabCardCatalogEntry,
  schema: WikitabCardTypeSchema,
  fields: Record<string, string>,
  fieldName: string,
): boolean {
  if (fieldName === 'menu') return false
  if (fieldName === 'icon' && playgroundIconBindHardcodedEmpty(entry)) return false
  if (fieldName === 'chips' && playgroundChipsBindHardcodedEmpty(entry)) return false
  if (!WIKITAB_CARD_INFERRED_BIND_NAMES.has(fieldName)) return false
  const baseProps = wikitabCardPreviewBaseProps(entry, schema, fields)
  if (!baseProps) return false
  return wikitabCardBindPropUsesDefault(fieldName, baseProps)
}

export function playgroundBindFieldUsesTextarea(name: string): boolean {
  return name === 'menu' || name === 'chips'
}

/** Playground textareas — at least two rows so wrapped single-line values are not clipped. */
export function playgroundFieldTextareaRows(value: string): number {
  if (!value.includes('\n')) return 2
  return Math.min(Math.max(value.split('\n').length, 2), 12)
}

export function playgroundBindFieldUsesSelect(name: string): boolean {
  return name === 'supportingIcon' || name === 'icon'
}

function effectiveWikitabCardInferredBindValue(
  name: string,
  props: Record<string, unknown>,
): unknown {
  if (name in props && props[name] !== undefined) return props[name]
  switch (name) {
    case 'menu':
    case 'chips':
      return []
    case 'loading':
      return false
    default:
      return undefined
  }
}

function wikitabCardBindPropUsesDefault(name: string, props: Record<string, unknown>): boolean {
  if (!(name in props) || props[name] === undefined) return true
  const raw = props[name]
  switch (name) {
    case 'menu':
    case 'chips':
      return Array.isArray(raw) && raw.length === 0
    case 'loading':
      return !wikitabCardIsLoading(raw as WikitabCardLoading)
    case 'supportingIcon':
    case 'icon':
      return !raw
    case 'loadingHeight':
      return raw == null
    default:
      return false
  }
}

function formatPlaygroundInferredBindValue(name: string, value: unknown): string {
  if (name === 'supportingIcon' || name === 'icon') {
    if (!value) return ''
    return codexIconExportNameFromIcon(value as Icon) ?? ''
  }
  if (name === 'loading') {
    return formatPlaygroundLoadingValue(value)
  }
  return formatPlaygroundBindPropValue(name, value)
}

/** Title-leading `icon` bind prop — quote/word featured only; article and snippet cards do not. */
function playgroundIconBindHardcodedEmpty(entry: WikitabCardCatalogEntry): boolean {
  return entry.primitiveId === 'article' || entry.primitiveId === 'snippet'
}

/** Edit cards alone use configurable chips; every other catalog entry documents `[]`. */
function playgroundChipsBindHardcodedEmpty(entry: WikitabCardCatalogEntry): boolean {
  return entry.primitiveId !== 'edit'
}

function appendPlaygroundWikitabCardInferredBindRows(
  rows: WikitabCardTypeRuntimeFieldRow[],
  baseProps: Record<string, unknown>,
  bindFields: Record<string, string> | undefined,
  entry: WikitabCardCatalogEntry,
): void {
  const withoutBind = rows.filter((row) => !WIKITAB_CARD_INFERRED_BIND_NAMES.has(row.name))
  rows.length = 0
  rows.push(...withoutBind)

  const bindDefaults = defaultPlaygroundBindFieldValues(entry)

  for (const field of WIKITAB_CARD_INFERRED_BIND_FIELDS) {
    if (field.name === 'supportingIcon' && !playgroundPayloadSupportingIconEditable(entry)) {
      continue
    }
    if (field.name === 'icon' && playgroundIconBindHardcodedEmpty(entry)) {
      rows.push({
        name: field.name,
        type: field.type,
        value: '',
        rowKind: 'inferred',
      })
      continue
    }
    if (field.name === 'chips' && playgroundChipsBindHardcodedEmpty(entry)) {
      rows.push({
        name: field.name,
        type: field.type,
        value: formatPlaygroundBindPropValue('chips', []),
        rowKind: 'inferred',
      })
      continue
    }
    const usesDefault = wikitabCardBindPropUsesDefault(field.name, baseProps)
    if (field.name === 'menu' && usesDefault) {
      rows.push({
        name: field.name,
        type: field.type,
        value: formatPlaygroundBindPropValue('menu', playgroundInferredMenuRows(entry)),
        rowKind: 'inferred',
      })
      continue
    }
    if (usesDefault) {
      const raw = bindFields?.[field.name] ?? bindDefaults[field.name] ?? ''
      rows.push({
        name: field.name,
        type: field.type,
        value: raw,
        rowKind: 'options',
      })
      continue
    }
    const value = effectiveWikitabCardInferredBindValue(field.name, baseProps)
    rows.push({
      name: field.name,
      type: field.type,
      value: formatPlaygroundInferredBindValue(field.name, value),
      rowKind: 'inferred',
    })
  }
}

function formatPlaygroundBindPropValue(name: string, value: unknown): string {
  if (name === 'chips' && Array.isArray(value)) {
    return JSON.stringify(
      value.map((chip) => {
        const row = chip as { text?: string; type?: string }
        return { text: row.text, type: row.type }
      }),
      null,
      2,
    )
  }
  if (name === 'menu' && Array.isArray(value)) {
    return JSON.stringify(
      value.map((item) => {
        const row = item as { value?: string; label?: string }
        return { value: row.value, label: row.label }
      }),
      null,
      2,
    )
  }
  if (name === 'supportingIcon' && value) {
    return codexIconExportNameFromIcon(value as Icon) ?? ''
  }
  return formatPlaygroundRuntimeValue(value)
}

/**
 * Payload keys copied onto `card` with the same name in typical mappers (no rename/transform).
 * Excludes save-metadata keys (`task`, `pageid`, `suggestionBody`) that mappers derive or rename.
 */
export const WIKITAB_CARD_NATIVE_PAYLOAD_FIELD_NAMES = new Set<string>([
  'title',
  'url',
  'description',
  'thumbnailUrl',
  'supportingText',
  'supportingHtml',
  'supportingTextEnd',
  'commentCount',
])

/** Suggestion primitive — payload `task` → `card.task` and `supportingHtml` (mapper transform). */
const PLAYGROUND_SUGGESTION_DOMAIN_PAYLOAD_FIELD_NAMES = new Set(['task'])

/** Payload keys that map directly onto other `WikitabCard` props (outside `card`). */
export const WIKITAB_CARD_NATIVE_BIND_FIELD_NAMES = new Set<string>(['supportingIcon'])

export type WikitabCardTypeFieldRowKind = 'hardcoded' | 'options' | 'custom'

export function playgroundRuntimeFieldRowKind(
  row: WikitabCardTypeRuntimeFieldRow,
): WikitabCardTypeFieldRowKind {
  if (row.rowKind === 'inferred') return 'hardcoded'
  return 'options'
}

export function playgroundPayloadFieldKind(
  fieldName: string,
  entry?: WikitabCardCatalogEntry,
): 'options' | 'custom' {
  if (
    entry?.primitiveId === 'suggestion' &&
    PLAYGROUND_SUGGESTION_DOMAIN_PAYLOAD_FIELD_NAMES.has(fieldName)
  ) {
    return 'custom'
  }
  if (
    fieldName === 'supportingIcon' &&
    entry &&
    !playgroundPayloadSupportingIconEditable(entry)
  ) {
    return 'custom'
  }
  if (
    WIKITAB_CARD_NATIVE_PAYLOAD_FIELD_NAMES.has(fieldName) ||
    WIKITAB_CARD_NATIVE_BIND_FIELD_NAMES.has(fieldName)
  ) {
    return 'options'
  }
  return 'custom'
}

export function playgroundFieldRowClass(kind: WikitabCardTypeFieldRowKind): string {
  return `wikitab-card-type-preview__row--${kind}`
}

/** Mapper output on `WikitabCardData` not declared on the payload type. */
export function playgroundRuntimeFieldRows(
  entry: WikitabCardCatalogEntry,
  schema: WikitabCardTypeSchema,
  fields: Record<string, string>,
  bindFields?: Record<string, string>,
): WikitabCardTypeRuntimeFieldRow[] {
  if (entry.id === 'search-loading' || !entry.typeName) return []

  const payload = payloadFromFieldValues(schema, fields)
  const mapped = mapPayload(entry.typeName, payload, entry.id)
  const rows: WikitabCardTypeRuntimeFieldRow[] = []

  if (mapped !== null && typeof mapped === 'object') {
    collectPlaygroundRuntimeFieldRows(mapped, '', rows)
  }

  const baseCardProps = wikitabCardPreviewBaseProps(entry, schema, fields)
  const previewModel = previewModelForEntry(entry, schema, fields, bindFields)

  if (previewModel?.component === 'WikitabCard' && baseCardProps) {
    const dataProp = previewPrimaryDataProp(previewModel.component)
    for (const [name, value] of Object.entries(baseCardProps)) {
      if (dataProp && name === dataProp) continue
      if (BIND_PROP_NAMES.has(name)) continue
      if (WIKITAB_CARD_INFERRED_BIND_NAMES.has(name)) continue
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        collectPlaygroundRuntimeFieldRows(value, name, rows)
      } else if (value !== undefined) {
        rows.push({
          name,
          type: Array.isArray(value) ? 'array' : typeof value,
          value: formatPlaygroundBindPropValue(name, value),
          rowKind: 'inferred',
        })
      }
    }
    appendPlaygroundWikitabCardInferredBindRows(rows, baseCardProps, bindFields, entry)
  }

  sortPlaygroundRuntimeFieldRows(rows)
  return rows
}

export function fieldUsesCheckbox(prop: { name: string; type: string }): boolean {
  return prop.type === 'boolean' || prop.type === 'true' || prop.name === 'unavailable'
}

export function fieldUsesTextarea(prop: { name: string; type: string }): boolean {
  return (
    prop.name === 'description' ||
    prop.name === 'definition' ||
    prop.name === 'caption' ||
    prop.name.endsWith('Html') ||
    prop.name === 'quoteText' ||
    prop.name === 'quote'
  )
}

export function fieldUsesSelect(prop: { name: string; type: string }): boolean {
  return (
    prop.type === 'WikitabFeaturedArticleSpotlightKind' ||
    prop.name === 'kind' ||
    prop.type === 'CodexIconName' ||
    prop.type === 'Icon' ||
    prop.name === 'supportingIcon' ||
    prop.name === 'icon' ||
    prop.type === 'EditorKind' ||
    prop.name === 'editorKind' ||
    prop.type === 'WikitabCardDescriptionFormat' ||
    prop.type === 'WikitabCardThumbnail' ||
    prop.type === 'WikitabCardThumbnailLayout' ||
    prop.type === '1 | 2 | 4' ||
    prop.type === '2 | 4' ||
    prop.type === '96 | 40'
  )
}

export function fieldSelectMenuItems(prop: {
  name: string
  type: string
}): { label: string; value: string }[] {
  if (prop.type === 'WikitabFeaturedArticleSpotlightKind' || prop.name === 'kind') {
    return WIKITAB_FEATURED_ARTICLE_SPOTLIGHT_KINDS.map((kind) => ({
      value: kind,
      label: kind,
    }))
  }
  if (
    prop.type === 'CodexIconName' ||
    prop.type === 'Icon' ||
    prop.name === 'supportingIcon' ||
    prop.name === 'icon'
  ) {
    return [
      { value: '', label: '(none)' },
      ...CODEX_ICON_NAMES.map((id) => ({
        value: id,
        label: codexIconExportLabel(id),
      })),
    ]
  }
  if (prop.type === 'EditorKind' || prop.name === 'editorKind') {
    return WIKITAB_EDITOR_KINDS.map((kind) => ({ value: kind, label: kind }))
  }
  if (prop.type === 'WikitabCardDescriptionFormat') {
    return [
      { value: 'plain', label: 'plain' },
      { value: 'html', label: 'html' },
    ]
  }
  if (prop.type === 'WikitabCardThumbnail') {
    return ['force', 'optional', 'none'].map((value) => ({ value, label: value }))
  }
  if (prop.type === 'WikitabCardThumbnailLayout') {
    return ['inline-start', 'inline-end', 'block-start'].map((value) => ({ value, label: value }))
  }
  if (prop.type === '1 | 2 | 4') {
    return [
      { value: '', label: '(none)' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '4', label: '4' },
    ]
  }
  if (prop.type === '2 | 4') {
    return [
      { value: '', label: '(none)' },
      { value: '2', label: '2' },
      { value: '4', label: '4' },
    ]
  }
  if (prop.type === '96 | 40') {
    return [
      { value: '96', label: '96' },
      { value: '40', label: '40' },
    ]
  }
  return []
}

/** Inferred Fields table — disabled select for the same shapes as payload editors. */
export function runtimeFieldUsesSelect(row: { name: string; type: string }): boolean {
  return fieldUsesSelect(row)
}

/** Card tab — direct `WikitabCard.vue` props (no payload mapper or presentation.json hardcoding). */
const WIKITAB_CARD_COMPONENT_CARD_FIELD_NAMES = [
  'url',
  'title',
  'description',
  'supportingText',
  'supportingHtml',
  'supportingTextEnd',
  'thumbnailUrl',
] as const

const WIKITAB_CARD_COMPONENT_SUPPORTING_ICON_FIELD: WikitabCardTypePropertySchema = {
  name: 'supportingIcon',
  type: 'CodexIconName',
  optional: true,
}

const WIKITAB_CARD_COMPONENT_PROP_FIELD_DEFS: WikitabCardTypePropertySchema[] = [
  { name: 'descriptionFormat', type: 'WikitabCardDescriptionFormat', optional: false },
  { name: 'titleLineClamp', type: '1 | 2 | 4', optional: true },
  { name: 'descriptionLineClamp', type: '2 | 4', optional: true },
  { name: 'thumbnailType', type: 'WikitabCardThumbnail', optional: false },
  { name: 'thumbnailSize', type: '96 | 40', optional: true },
  { name: 'thumbnailLayout', type: 'WikitabCardThumbnailLayout', optional: true },
  { name: 'loading', type: 'WikitabCardLoading', optional: true },
  { name: 'loadingHeight', type: 'number', optional: true },
  { name: 'icon', type: 'Icon', optional: true },
  { name: 'menu', type: 'WikitabCardMenuItem[]', optional: true },
  { name: 'chips', type: 'WikitabCardChip[]', optional: true },
]

export function wikitabCardComponentPlaygroundProperties(): WikitabCardTypePropertySchema[] {
  const rows: WikitabCardTypePropertySchema[] = []
  for (const name of WIKITAB_CARD_COMPONENT_CARD_FIELD_NAMES) {
    rows.push({
      name,
      type: 'string',
      optional: name !== 'url' && name !== 'title',
    })
    if (name === 'supportingText') {
      rows.push(WIKITAB_CARD_COMPONENT_SUPPORTING_ICON_FIELD)
    }
  }
  return [...rows, ...WIKITAB_CARD_COMPONENT_PROP_FIELD_DEFS]
}

export function defaultWikitabCardComponentFieldValues(): Record<string, string> {
  const entry = catalogEntryById('primitive-article')
  const menu = entry
    ? formatPlaygroundBindPropValue('menu', playgroundMenuItemsForEntry(entry))
    : '[]'
  return {
    url: WET_LEG.url,
    title: WET_LEG.title,
    description: WET_LEG.articleDescription,
    thumbnailUrl: WET_LEG.thumbUrl,
    supportingText: '1.2M views',
    supportingHtml: '',
    supportingTextEnd: '',
    descriptionFormat: 'plain',
    titleLineClamp: '2',
    descriptionLineClamp: '2',
    thumbnailType: 'force',
    thumbnailSize: '96',
    thumbnailLayout: 'inline-start',
    loading: 'false',
    loadingHeight: '',
    supportingIcon: 'cdxIconChartLine',
    icon: '',
    menu,
    chips: '[]',
  }
}

function cardDataFromComponentPlaygroundFields(
  fields: Record<string, string>,
): WikitabCardData {
  const card: WikitabCardData = { key: 'wikitab-card-playground' }
  for (const name of WIKITAB_CARD_COMPONENT_CARD_FIELD_NAMES) {
    const raw = fields[name]?.trim() ?? ''
    if (!raw) continue
    card[name] = raw
  }
  return card
}

export function previewModelForWikitabCardComponent(
  fields: Record<string, string>,
): WikitabCardTypePreviewModel {
  const card = cardDataFromComponentPlaygroundFields(fields)
  const props: Record<string, unknown> = {
    descriptionFormat: fields.descriptionFormat?.trim() || 'plain',
    thumbnailType: fields.thumbnailType?.trim() || 'force',
    card,
  }

  const titleLineClamp = fields.titleLineClamp?.trim()
  if (titleLineClamp === '1' || titleLineClamp === '2' || titleLineClamp === '4') {
    props.titleLineClamp = Number(titleLineClamp)
  }
  const descriptionLineClamp = fields.descriptionLineClamp?.trim()
  if (descriptionLineClamp === '2' || descriptionLineClamp === '4') {
    props.descriptionLineClamp = Number(descriptionLineClamp)
  }

  const thumbnailType = String(props.thumbnailType)
  if (thumbnailType !== 'none') {
    const size = fields.thumbnailSize?.trim()
    if (size === '96' || size === '40') props.thumbnailSize = Number(size)
    const layout = fields.thumbnailLayout?.trim()
    if (
      layout === 'inline-start' ||
      layout === 'inline-end' ||
      layout === 'block-start'
    ) {
      props.thumbnailLayout = layout
    }
  }

  const loading = parsePlaygroundLoadingValue(fields.loading ?? 'false')
  if (wikitabCardIsLoading(loading)) {
    props.loading = loading
    const height = Number(fields.loadingHeight?.trim() || NaN)
    props.loadingHeight = Number.isNaN(height)
      ? WIKITAB_CARD_RESERVED_SLOT_HEIGHT.article
      : height
  }

  for (const name of ['supportingIcon', 'icon', 'menu', 'chips'] as const) {
    const parsed = parsePlaygroundBindFieldValue(name, fields[name] ?? '')
    if (parsed !== undefined) {
      if (name === 'menu' || name === 'chips') {
        props[name] = parsed
      } else if (parsed) {
        props[name] = parsed
      }
    }
  }

  return { component: 'WikitabCard', props }
}

export function componentPlaygroundFieldUsesCheckbox(_name: string, type: string): boolean {
  return type === 'boolean'
}

export function componentPlaygroundFieldUsesTextarea(name: string): boolean {
  return (
    fieldUsesTextarea({ name, type: 'string' }) ||
    name === 'menu' ||
    name === 'chips'
  )
}

export function componentPlaygroundFieldUsesSelect(name: string, type: string): boolean {
  if (name === 'loading') return false
  return fieldUsesSelect({ name, type }) || type.startsWith('WikitabCard')
}
