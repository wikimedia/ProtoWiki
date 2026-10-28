import {
  cdxIconCalendar,
  cdxIconChartLine,
  cdxIconLanguage,
  cdxIconLink,
  cdxIconQuotes,
  type Icon,
} from '@wikimedia/codex-icons'

import { wikitabReservedSlotHeight } from './data/wikitabCardSlotHeights'
import type { WikitabCardPrimitiveId } from './data/wikitabCardTypeLinks'
import type { WikitabSeedArticle } from './data/wikitabSeedArticle'
/** Codex Card `icon` for quote-of-the-day cards (quote in title, attributee in description). */
export const WIKITAB_QUOTE_CARD_LEADING_ICON = cdxIconQuotes

/** Codex Card `icon` for word-of-the-day cards (headword in title, gloss in description). */
export const WIKITAB_WORD_CARD_LEADING_ICON = cdxIconLanguage

export type WikitabSectionId = 'trending' | 'otd' | 'births' | 'dyk' | 'news' | 'discussions'

export const WIKITAB_SAVED_MODULE_ID = 'saved' as const
export const WIKITAB_FEATURED_MODULE_ID = 'featured' as const
export const WIKITAB_DAILY_READS_MODULE_ID = 'daily-reads' as const
export const WIKITAB_SUGGESTED_EDITS_MODULE_ID = 'suggested-edits' as const
export const WIKITAB_REVIEW_CHANGES_MODULE_ID = 'review-changes' as const

export type WikitabModuleId =
  | WikitabSectionId
  | typeof WIKITAB_SAVED_MODULE_ID
  | typeof WIKITAB_FEATURED_MODULE_ID
  | typeof WIKITAB_DAILY_READS_MODULE_ID
  | typeof WIKITAB_SUGGESTED_EDITS_MODULE_ID
  | typeof WIKITAB_REVIEW_CHANGES_MODULE_ID

/** Home modules that only render once the reader has saved articles. */
const WIKITAB_SAVED_GATED_MODULE_IDS: ReadonlySet<WikitabModuleId> = new Set<WikitabModuleId>([
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
])

export function isWikitabSavedGatedModule(id: WikitabModuleId): boolean {
  return WIKITAB_SAVED_GATED_MODULE_IDS.has(id)
}

/** Spotlight kinds in the Featured module carousel (v1). */
export type WikitabFeaturedSpotlightKind = 'tfa' | 'tfp' | 'potd' | 'wotd' | 'qotd' | 'tfl'

/** Fixed v1 catalog order for Featured spotlights (fetch + skeleton slots). */
export const WIKITAB_FEATURED_SPOTLIGHT_KINDS: readonly WikitabFeaturedSpotlightKind[] = [
  'tfa',
  'tfl',
  'tfp',
  'potd',
  'qotd',
  'wotd',
]

export type {
  WikitabCardDescriptionFormat,
  WikitabCardPresentationSpec,
  WikitabCardThumbnail,
  WikitabCardThumbnailLayout,
  WikitabCardThumbnailSizePx,
} from './data/wikitabCardPresentation'
export interface WikitabFeaturedSpotlight extends WikitabCardData {
  kind: WikitabFeaturedSpotlightKind
  /** When true, card shows a fixed-height unavailable state instead of omitting the slot. */
  unavailable?: boolean
}

/**
 * Feed section: which primitive its cards are, plus that primitive's editable fields
 * the section sets. Presentation itself comes from the primitive, never the section.
 */
export interface WikitabSectionSpec {
  id: WikitabSectionId
  heading: string
  primitive: WikitabCardPrimitiveId
  /** Card slots shown before any paging. Desktop renders these as 2x2. */
  initialCount: number
  /** How many more a "Show more" press (or a mobile scroll-to-end) reveals. */
  pageSize: number
  /**
   * Reserved loading-placeholder height in px (the primitive's `wikitabCardSlotHeights.ts` row).
   * Real cards hug content; row equalization uses this as a floor via
   * `useEqualRowHeights`.
   */
  cardHeight: number
  /** Editable supporting glyph — only on primitives that don't pin one. */
  supportingIcon?: Icon
}

const FEED_SECTION_BASE: ReadonlyArray<Omit<WikitabSectionSpec, 'cardHeight'>> = [
  {
    id: 'trending',
    heading: 'Trending',
    primitive: 'article',
    initialCount: 4,
    pageSize: 6,
    supportingIcon: cdxIconChartLine,
  },
  { id: 'news', heading: 'In the news', primitive: 'snippet', initialCount: 4, pageSize: 6 },
  { id: 'dyk', heading: 'Did you know', primitive: 'snippet', initialCount: 4, pageSize: 6 },
  {
    id: 'discussions',
    heading: 'Active discussions',
    primitive: 'discussion',
    initialCount: 4,
    pageSize: 6,
  },
  { id: 'otd', heading: 'On this day', primitive: 'snippet', initialCount: 4, pageSize: 6 },
  {
    id: 'births',
    heading: 'Birthdays',
    primitive: 'article',
    initialCount: 4,
    pageSize: 6,
    supportingIcon: cdxIconCalendar,
  },
]

export const WIKITAB_SECTIONS: readonly WikitabSectionSpec[] = FEED_SECTION_BASE.map((base) => ({
  ...base,
  cardHeight: wikitabReservedSlotHeight(base.primitive),
}))

/** Default home-feed / configure-panel module order (all modules visible). */
export const WIKITAB_HOME_MODULE_ORDER: readonly WikitabModuleId[] = [
  'trending',
  WIKITAB_FEATURED_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  'dyk',
  'news',
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  'discussions',
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
  'otd',
  'births',
]

/**
 * When true, TFP/POTD use Codex block-start portrait cards (full-width 4∶3 thumb).
 * When false, they use text hook + inline-start thumbnail (thumb leading, unlike DYK).
 */
export const WIKITAB_FEATURED_USE_PORTRAIT_IMAGE_CARDS = false

/** Home Featured module — mixed daily spotlights from sister wikis. */
export const WIKITAB_FEATURED_MODULE_SPEC = {
  id: WIKITAB_FEATURED_MODULE_ID,
  heading: 'Featured',
  initialCount: 4,
  pageSize: 6,
  cardHeight: 122,
  /** Placeholder floor for block-start spotlights (TFP, POTD): 4∶3 thumb + caption. */
  portraitCardHeight: 320,
  thumbnailSize: 96,
}

/** Home Saved module — same paging contract as feed sections. */
export const WIKITAB_SAVED_MODULE_SPEC = {
  id: WIKITAB_SAVED_MODULE_ID,
  heading: 'Saved',
  initialCount: 4,
  pageSize: 6,
  primitive: 'article' as const,
  cardHeight: wikitabReservedSlotHeight('article'),
}

/** Home Daily reads module — morelike suggestions from daily-random saved seeds. */
export const WIKITAB_DAILY_READS_MODULE_SPEC = {
  id: WIKITAB_DAILY_READS_MODULE_ID,
  heading: 'Daily reads',
  initialCount: 4,
  pageSize: 6,
  primitive: 'article' as const,
  cardHeight: wikitabReservedSlotHeight('article'),
  supportingIcon: cdxIconLink,
}

/** Home Suggested edits module — quality-check tasks from daily-random saved seeds. */
export const WIKITAB_SUGGESTED_EDITS_MODULE_SPEC = {
  id: WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  heading: 'Suggested edits',
  initialCount: 2,
  pageSize: 4,
  primitive: 'suggestion' as const,
  cardHeight: wikitabReservedSlotHeight('suggestion'),
}

/** Home Review changes module — merged edits from daily-random saved article seeds. */
export const WIKITAB_REVIEW_CHANGES_MODULE_SPEC = {
  id: WIKITAB_REVIEW_CHANGES_MODULE_ID,
  heading: 'Review changes',
  initialCount: 2,
  pageSize: 4,
}

/** Configure-panel rows — same order as `WIKITAB_HOME_MODULE_ORDER`. */
export const WIKITAB_CONFIGURE_MODULES: ReadonlyArray<{
  id: WikitabModuleId
  heading: string
}> = WIKITAB_HOME_MODULE_ORDER.map((id) => {
  if (id === WIKITAB_SAVED_MODULE_ID) {
    return { id, heading: WIKITAB_SAVED_MODULE_SPEC.heading }
  }
  if (id === WIKITAB_FEATURED_MODULE_ID) {
    return { id, heading: WIKITAB_FEATURED_MODULE_SPEC.heading }
  }
  if (id === WIKITAB_DAILY_READS_MODULE_ID) {
    return { id, heading: WIKITAB_DAILY_READS_MODULE_SPEC.heading }
  }
  if (id === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
    return { id, heading: WIKITAB_SUGGESTED_EDITS_MODULE_SPEC.heading }
  }
  if (id === WIKITAB_REVIEW_CHANGES_MODULE_ID) {
    return { id, heading: WIKITAB_REVIEW_CHANGES_MODULE_SPEC.heading }
  }
  const section = WIKITAB_SECTIONS.find((entry) => entry.id === id)
  return { id, heading: section!.heading }
})

const WIKITAB_MODULE_HEADINGS = Object.fromEntries(
  WIKITAB_CONFIGURE_MODULES.map((module) => [module.id, module.heading]),
) as Record<WikitabModuleId, string>

export function wikitabModuleHeading(id: WikitabModuleId): string {
  return WIKITAB_MODULE_HEADINGS[id]
}

/** Registry default when no custom order is stored. */
export function defaultModuleOrder(): WikitabModuleId[] {
  return WIKITAB_CONFIGURE_MODULES.map((module) => module.id)
}

/** Stored order when non-empty; otherwise the registry default. */
export function resolveModuleOrder(stored: readonly WikitabModuleId[]): WikitabModuleId[] {
  if (!stored.length) return defaultModuleOrder()
  return [...stored]
}

/** Info chip row on `WikitabCard` (`CdxInfoChip` status). */
export type WikitabCardChipType = 'notice' | 'warning' | 'error' | 'success'

export interface WikitabCardChip {
  text: string
  type: WikitabCardChipType
  icon: Icon
}

/** `CdxMenuButton` row on `WikitabCard`. */
export interface WikitabCardMenuItem {
  value: string
  label: string
  icon: Icon
}

/**
 * Parts of `WikitabCard` that can skeleton independently while their data is still fetching.
 * `supporting` covers the whole supporting row; `supportingEnd` only its trailing `supportingTextEnd`.
 */
export type WikitabCardLoadingField =
  | 'title'
  | 'description'
  | 'supporting'
  | 'supportingEnd'
  | 'thumbnail'
  | 'chips'

/**
 * `true` — the whole card is a skeleton. An object — only the flagged fields are
 * skeletons; everything else renders from `card`.
 */
export type WikitabCardLoading = boolean | Partial<Record<WikitabCardLoadingField, boolean>>

/** One card's display data. Fields used depend on the section's variant. */
export interface WikitabCardData {
  key: string
  /** Where the card as a whole links — the bolded link's page. */
  url?: string
  /** Article body: bold title, subtle description, supporting caption. */
  title?: string
  /** Body under the title — plain text or HTML depending on presentation `descriptionFormat`. */
  description?: string
  /** Plain supporting line — pairs with presentation `supportingIcon` on `WikitabCard`. */
  supportingText?: string
  /** HTML supporting line — takes precedence over `supportingText` when both are set. */
  supportingHtml?: string
  /** Optional end-aligned caption (e.g. discussion relative time) alongside `supportingText`. */
  supportingTextEnd?: string
  thumbnailUrl?: string
  /** Active discussions — comment count for saves. */
  commentCount?: number
  /** Suggested edits — page id and task id for saves (same as suggestion payload `task`). */
  pageid?: number
  task?: string
  suggestionBody?: string
  /** Set by the fetcher; copied onto saved items to drive saved-driven modules. */
  seedArticle?: WikitabSeedArticle
}

export type WikitabFeed = Record<WikitabSectionId, WikitabCardData[]>
