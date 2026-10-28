import type { Icon } from '@wikimedia/codex-icons'

import {
  WIKITAB_QUOTE_CARD_LEADING_ICON,
  WIKITAB_WORD_CARD_LEADING_ICON,
  type WikitabCardData,
  type WikitabCardLoading,
  type WikitabFeaturedSpotlight,
  type WikitabFeaturedSpotlightKind,
} from '../sections'
import { wikitabCardBindProps } from './wikitabCardPresentation'
import { wikitabCardFeedMenuItems } from './wikitabCardMenuItems'
import { wikitabReservedSlotHeight } from './wikitabCardSlotHeights'
import type { WikitabCardPrimitiveId } from './wikitabCardTypeLinks'

const WIKITAB_CARD_DATA_KEYS: (keyof WikitabCardData)[] = [
  'key',
  'url',
  'title',
  'description',
  'supportingText',
  'supportingHtml',
  'supportingTextEnd',
  'thumbnailUrl',
  'commentCount',
  'pageid',
  'task',
  'suggestionBody',
]

/** Card prop only — strips Featured feed fields (`kind`, `unavailable`) and omits undefined values. */
export function pickWikitabCardData(
  value: WikitabFeaturedSpotlight | WikitabCardData,
): WikitabCardData {
  const out: WikitabCardData = { key: value.key }
  for (const k of WIKITAB_CARD_DATA_KEYS) {
    if (k === 'key') continue
    const v = value[k]
    if (v !== undefined) out[k] = v as never
  }
  return out
}

export function featuredPrimitiveForSpotlightKind(
  kind: WikitabFeaturedSpotlightKind | undefined,
): WikitabCardPrimitiveId {
  switch (kind) {
    case 'tfp':
    case 'potd':
      return 'image'
    case 'wotd':
      return 'word'
    case 'qotd':
      return 'quote'
    case 'tfl':
      return 'list'
    default:
      return 'article'
  }
}

/** Unavailable spotlights carry a plain message, so they render as the snippet primitive. */
const FEATURED_UNAVAILABLE_PRIMITIVE: WikitabCardPrimitiveId = 'snippet'

/** Maps Featured spotlight data to the `card` prop shape for `WikitabCard.vue`. */
export function featuredSpotlightToCardData(
  spot: WikitabFeaturedSpotlight,
  showSpotlightLabel = true,
): WikitabCardData {
  const supportingText = showSpotlightLabel ? spot.supportingText : undefined

  if (spot.kind === 'potd' || spot.kind === 'tfp') {
    return pickWikitabCardData({
      ...spot,
      title: undefined,
      supportingText,
    })
  }

  if (spot.kind === 'qotd' || spot.kind === 'wotd') {
    return pickWikitabCardData({
      ...spot,
      supportingText,
    })
  }

  if (spot.kind === 'tfl') {
    return pickWikitabCardData({
      ...spot,
      supportingText: showSpotlightLabel ? spot.supportingText : undefined,
    })
  }

  return pickWikitabCardData({
    ...spot,
    supportingText,
  })
}

export function featuredSpotlightTitleLeadingIcon(
  kind: WikitabFeaturedSpotlightKind | undefined,
): Icon | undefined {
  if (kind === 'qotd') return WIKITAB_QUOTE_CARD_LEADING_ICON
  if (kind === 'wotd') return WIKITAB_WORD_CARD_LEADING_ICON
  return undefined
}

/**
 * Before a spotlight's fetch lands, only its static label is known. Forced-thumbnail kinds
 * skeleton the rest; text-only kinds have no thumbnail to wait for; picture kinds have an
 * optional thumbnail column, so they stay whole skeletons until it is known.
 */
export function featuredSpotlightInitialLoading(
  kind: WikitabFeaturedSpotlightKind,
): WikitabCardLoading {
  switch (kind) {
    case 'tfa':
    case 'tfl':
      return { title: true, description: true, thumbnail: true }
    case 'qotd':
    case 'wotd':
      return { title: true, description: true }
    default:
      return true
  }
}

export function featuredSpotlightPlaceholderHeight(
  kind: WikitabFeaturedSpotlightKind | undefined,
): number {
  return wikitabReservedSlotHeight(featuredPrimitiveForSpotlightKind(kind))
}

/** Bind props for `WikitabCard.vue` from a Featured spotlight (feed or saved). */
export function featuredSpotlightWikitabCardBindProps(options: {
  spotlight?: WikitabFeaturedSpotlight
  slotKind?: WikitabFeaturedSpotlightKind
  showSpotlightLabel?: boolean
  loading?: WikitabCardLoading
  showCardMenu?: boolean
  sectionHeading?: string
  isSaved?: boolean
}): Record<string, unknown> {
  const kind = options.spotlight?.kind ?? options.slotKind
  const unavailable = options.spotlight?.unavailable
  const primitive = unavailable
    ? FEATURED_UNAVAILABLE_PRIMITIVE
    : featuredPrimitiveForSpotlightKind(kind)
  const showLabel = options.showSpotlightLabel !== false
  const card = options.spotlight
    ? featuredSpotlightToCardData(options.spotlight, showLabel)
    : undefined

  return wikitabCardBindProps(primitive, {
    card,
    loading: options.loading,
    loadingHeight: featuredSpotlightPlaceholderHeight(kind),
    menu:
      options.showCardMenu && options.sectionHeading
        ? wikitabCardFeedMenuItems({
            save: { isSaved: options.isSaved },
            hideFromHeading: options.sectionHeading,
          })
        : undefined,
    icon: unavailable ? undefined : featuredSpotlightTitleLeadingIcon(kind),
  })
}
