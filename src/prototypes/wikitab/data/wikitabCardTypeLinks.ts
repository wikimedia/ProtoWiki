import type * as Payload from './wikitabCardPayloadTypes'

import catalogJson from './wikitabCardTypeCatalog.json'
import primitiveCatalogJson from './wikitabCardPrimitiveCatalog.json'
import schemaJson from './wikitabCardTypeSchema.generated.json'

/** Payload types referenced by `wikitabCardTypeCatalog.json` (playground catalog). */
export type WikitabCardTypeMap = {
  WikitabArticleCardPayload: Payload.WikitabArticleCardPayload
  WikitabFeedDykCardPayload: Payload.WikitabFeedDykCardPayload
  WikitabFeedDiscussionCardPayload: Payload.WikitabFeedDiscussionCardPayload
  WikitabFeedSuggestedEditsCardPayload: Payload.WikitabFeedSuggestedEditsCardPayload
  WikitabFeaturedImageCardPayload: Payload.WikitabFeaturedImageCardPayload
  WikitabFeaturedListCardPayload: Payload.WikitabFeaturedListCardPayload
  WikitabFeaturedQuoteCardPayload: Payload.WikitabFeaturedQuoteCardPayload
  WikitabFeaturedWordCardPayload: Payload.WikitabFeaturedWordCardPayload
  WikitabSearchActivityCardPayload: Payload.WikitabSearchActivityCardPayload
  WikitabSearchContributeCardPayload: Payload.WikitabSearchContributeCardPayload
  WikitabSearchResultCardPayload: Payload.WikitabSearchResultCardPayload
  WikitabSearchImageCardPayload: Payload.WikitabSearchImageCardPayload
  WikitabSavedArticleCardPayload: Payload.WikitabSavedArticleCardPayload
  WikitabSavedSuggestionCardPayload: Payload.WikitabSavedSuggestionCardPayload
  WikitabSavedDiscussionCardPayload: Payload.WikitabSavedDiscussionCardPayload
  WikitabSavedImageCardPayload: Payload.WikitabSavedImageCardPayload
}

export type WikitabCardCatalogGroup = 'primitives' | 'search' | 'saved'

export interface WikitabCardCatalogEntry {
  id: string
  group: WikitabCardCatalogGroup
  label: string
  componentPath: string
  dataProp: string | null
  typeModulePath: string | null
  typeName: keyof WikitabCardTypeMap | null
  /** Related primitive (saved / search catalog entries). */
  primitiveId?: WikitabCardPrimitiveId
}

export interface WikitabCardPrimitiveEntry {
  id: WikitabCardPrimitiveId
  label: string
  componentPath: string
  demoCatalogId: string
}

export type WikitabCardPrimitiveId =
  | 'article'
  | 'snippet'
  | 'discussion'
  | 'suggestion'
  | 'image'
  | 'word'
  | 'quote'
  | 'list'
  | 'edit'

export interface WikitabCardTypePropertySchema {
  name: string
  type: string
  optional: boolean
}

export interface WikitabCardTypeSchema {
  typeName: string
  typeModulePath: string
  properties: WikitabCardTypePropertySchema[]
}

export interface WikitabCardTypeSchemaEntry {
  catalogId: string
  schemas: WikitabCardTypeSchema[]
}

export const WIKITAB_CARD_TYPE_CATALOG = catalogJson as WikitabCardCatalogEntry[]
export const WIKITAB_CARD_PRIMITIVE_CATALOG = primitiveCatalogJson as WikitabCardPrimitiveEntry[]
export const WIKITAB_CARD_TYPE_SCHEMA = schemaJson as WikitabCardTypeSchemaEntry[]

type CatalogTypeNames = NonNullable<WikitabCardCatalogEntry['typeName']>
type _CatalogTypesLinked = CatalogTypeNames extends keyof WikitabCardTypeMap ? true : never
type _TypeMapMatchesCatalog = keyof WikitabCardTypeMap extends CatalogTypeNames ? true : never

export const WIKITAB_REPO_BLOB_BASE =
  'https://github.com/wikimedia/ProtoWiki/blob/main/src/prototypes/wikitab'

export function wikitabComponentSourceUrl(componentPath: string): string {
  return `${WIKITAB_REPO_BLOB_BASE}/${componentPath}`
}

export function wikitabTypeSourceUrl(typeModulePath: string): string {
  return `${WIKITAB_REPO_BLOB_BASE}/${typeModulePath}`
}

export function wikitabLocalComponentPath(componentPath: string): string {
  return `src/prototypes/wikitab/${componentPath}`
}

export function wikitabLocalTypePath(typeModulePath: string): string {
  return `src/prototypes/wikitab/${typeModulePath}`
}

export function schemaForCatalogId(catalogId: string): WikitabCardTypeSchemaEntry | undefined {
  return WIKITAB_CARD_TYPE_SCHEMA.find((entry) => entry.catalogId === catalogId)
}

export function catalogEntryById(catalogId: string): WikitabCardCatalogEntry | undefined {
  return WIKITAB_CARD_TYPE_CATALOG.find((entry) => entry.id === catalogId)
}

export function primitiveById(id: WikitabCardPrimitiveId): WikitabCardPrimitiveEntry | undefined {
  return WIKITAB_CARD_PRIMITIVE_CATALOG.find((entry) => entry.id === id)
}

export function primitiveLabel(id: WikitabCardPrimitiveId): string {
  return primitiveById(id)?.label ?? id
}
