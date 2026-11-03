import type { WikitabCardCatalogEntry } from './wikitabCardTypeLinks'
import {
  catalogEntryById,
  WIKITAB_CARD_TYPE_CATALOG,
  schemaForCatalogId,
} from './wikitabCardTypeLinks'
import { WIKITAB_DEMO_QUOTE_WET_LEG } from './wikitabCardTypeDemoQuoteWetLeg'
import { demoCardDataForCatalogEntry } from './wikitabCardTypePlayground'
import { wikitabCardDescriptionText } from './wikitabCardDescription'
import { primaryLinkTitle } from './wikitabHtml'
import { seedArticle, type WikitabSeedArticle } from './wikitabSeedArticle'
import type { WikitabCardData } from '../sections'
import { searchResultCardPayloadToArticle } from './wikitabCardPayloadMappers'
import type { WikitabSearchResultCardPayload } from './wikitabCardPayloadTypes'
import {
  defaultFieldValues,
  defaultPlaygroundBindFieldValues,
  payloadFromFieldValues,
  previewModelForEntry,
  type WikitabCardTypePreviewModel,
} from './wikitabCardTypePlayground'
import {
  wikitabCardFeedMenuItems,
  wikitabPrimitiveShowsSaveArticleMenu,
} from './wikitabCardMenuItems'
import { wikitabCardSaveArticleMenuOption } from './savedCardHelpers'

export interface WikitabCardTypeSeedArticleRow {
  catalogId: string
  label: string
  productionContext: string
  seed: WikitabSeedArticle | undefined
  /** Second Save row in overflow when primitive save ≠ article and seed is set. */
  saveArticleMenu: boolean
}

const PRODUCTION_CONTEXT: Record<string, string> = {
  'primitive-article': 'Trending, Birthdays, Daily reads, Nearby, Featured TFA / TFL',
  'primitive-snippet': 'Did you know, In the news, On this day',
  'primitive-discussion': 'Active discussions',
  'primitive-suggestion': 'Help wanted (home)',
  'primitive-image': 'Featured TFP / POTD',
  'primitive-word': 'Featured word of the day',
  'primitive-quote': 'Featured quote of the day',
  'primitive-edit': 'Search Activity, Recent edits',
  'search-contribute': 'Search Contribute tab',
  'search-result': 'Search Articles tab',
  'search-image': 'Search Images tab',
  'search-loading': 'Search skeleton',
}

function enrichPlaygroundDemoSeedArticle(
  catalogId: string,
  card: WikitabCardData,
): WikitabCardData {
  if (card.seedArticle) return card

  switch (catalogId) {
    case 'primitive-article':
    case 'saved-article':
      return {
        ...card,
        seedArticle: seedArticle(card.title ?? '', 'self'),
      }
    case 'primitive-snippet': {
      const body = wikitabCardDescriptionText(card)
      const hook =
        (body && primaryLinkTitle(body)) ||
        card.title ||
        ''
      return { ...card, seedArticle: seedArticle(hook, 'hook-link') }
    }
    case 'primitive-discussion':
    case 'saved-discussion':
      return card
    case 'primitive-suggestion':
    case 'saved-suggestion':
    case 'search-contribute':
      return { ...card, seedArticle: seedArticle(card.title ?? '', 'self') }
    case 'primitive-edit':
    case 'saved-change':
      return { ...card, seedArticle: seedArticle(card.title ?? '', 'edited-page') }
    case 'primitive-image':
    case 'saved-image':
    case 'search-image':
      return { ...card, seedArticle: seedArticle('Wet Leg', 'caption-link') }
    case 'primitive-word':
    case 'saved-word':
      return { ...card, seedArticle: seedArticle('Wet Leg', 'wiktionary-sister') }
    case 'primitive-quote':
    case 'saved-quote':
      return {
        ...card,
        seedArticle: seedArticle(WIKITAB_DEMO_QUOTE_WET_LEG.name, 'quote-author'),
      }
    default:
      return card
  }
}

function demoSearchResultSeed(entry: WikitabCardCatalogEntry): WikitabSeedArticle | undefined {
  const schemaEntry = schemaForCatalogId(entry.id)
  const schema = schemaEntry?.schemas[0]
  if (!schema) return undefined
  const fields = defaultFieldValues(entry.id, schema, 0)
  const payload = payloadFromFieldValues(schema, fields) as WikitabSearchResultCardPayload
  const article = searchResultCardPayloadToArticle(payload)
  return seedArticle(article.title, 'self')
}

function resolveSeedForCatalogEntry(
  entry: WikitabCardCatalogEntry,
): WikitabSeedArticle | undefined {
  if (entry.id === 'search-loading' || !entry.typeName) return undefined
  if (entry.id === 'search-result') return demoSearchResultSeed(entry)

  let card = demoCardDataForCatalogEntry(entry)
  if (!card) return undefined
  card = enrichPlaygroundDemoSeedArticle(entry.id, card)
  return card.seedArticle
}

function saveArticleMenuForEntry(
  entry: WikitabCardCatalogEntry,
  seed: WikitabSeedArticle | undefined,
): boolean {
  if (!seed) return false
  if (entry.id === 'search-result') return false
  if (!wikitabPrimitiveShowsSaveArticleMenu(entry.primitiveId)) return false
  return true
}

const SEED_ARTICLE_CATALOG_EXCLUDE = new Set(['search-image', 'search-loading'])

/** Seed-articles tab titles — shorter than full catalog labels. */
function seedArticleRowLabel(entry: WikitabCardCatalogEntry): string {
  if (entry.id === 'search-contribute') return 'Search'
  if (entry.label.startsWith('Primitive — ')) {
    return entry.label.slice('Primitive — '.length)
  }
  if (entry.label.startsWith('Search — ')) {
    return entry.label.slice('Search — '.length)
  }
  return entry.label
}

export function wikitabCardTypeSeedArticleRows(): WikitabCardTypeSeedArticleRow[] {
  return WIKITAB_CARD_TYPE_CATALOG.filter(
    (entry) =>
      entry.typeName &&
      entry.group !== 'saved' &&
      !SEED_ARTICLE_CATALOG_EXCLUDE.has(entry.id),
  ).map((entry) => {
    const seed = resolveSeedForCatalogEntry(entry)
    return {
      catalogId: entry.id,
      label: seedArticleRowLabel(entry),
      productionContext: PRODUCTION_CONTEXT[entry.id] ?? entry.group,
      seed,
      saveArticleMenu: saveArticleMenuForEntry(entry, seed),
    }
  })
}

export function formatSeedArticleDisplay(seed: WikitabSeedArticle | undefined): string {
  if (!seed) return '—'
  return `${seed.title} (${seed.via})`
}

/** Default playground preview for one catalog row, with demo seed + Save article menu when production would show it. */
export function previewModelForSeedCatalogEntry(
  catalogId: string,
): WikitabCardTypePreviewModel | null {
  const entry = catalogEntryById(catalogId)
  if (!entry?.typeName) return null
  const schema = schemaForCatalogId(catalogId)?.schemas[0]
  if (!schema) return null
  const fields = defaultFieldValues(catalogId, schema, 0)
  const bindFields = defaultPlaygroundBindFieldValues(entry)
  const model = previewModelForEntry(entry, schema, fields, bindFields)
  if (!model) return null

  if (model.component !== 'WikitabCard') return model

  const props = { ...model.props }
  const card = props.card
  if (!card || typeof card !== 'object') return { ...model, props }

  const enriched = enrichPlaygroundDemoSeedArticle(catalogId, card as WikitabCardData)
  props.card = enriched
  if (entry.primitiveId) {
    props.menu = wikitabCardFeedMenuItems({
      save: { isSaved: false, primitiveId: entry.primitiveId },
      saveArticle: saveArticleMenuForEntry(entry, enriched.seedArticle)
        ? wikitabCardSaveArticleMenuOption(enriched.seedArticle, () => false)
        : false,
    })
  }
  return { ...model, props }
}
