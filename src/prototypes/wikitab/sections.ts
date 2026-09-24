import { cdxIconCalendar, cdxIconChartLine, cdxIconLink, type Icon } from '@wikimedia/codex-icons'

export type WikitabSectionId = 'trending' | 'otd' | 'births' | 'dyk' | 'news' | 'discussions'

export const WIKITAB_SAVED_MODULE_ID = 'saved' as const
export const WIKITAB_DAILY_READS_MODULE_ID = 'daily-reads' as const

export type WikitabModuleId =
  | WikitabSectionId
  | typeof WIKITAB_SAVED_MODULE_ID
  | typeof WIKITAB_DAILY_READS_MODULE_ID

/**
 * Which card layout a section renders. Drives the real card, its placeholder,
 * and the loading mode (see `WikitabCard.vue`):
 * - `thumbnail` — always shows a thumbnail column; thumbnail-slot loading.
 * - `text` — thumbnail only when a URL resolves; full-card skeleton while loading.
 */
export type WikitabCardVariant = 'thumbnail' | 'text'

export interface WikitabSectionSpec {
  id: WikitabSectionId
  heading: string
  /** Card slots shown before any paging. Desktop renders these as 2x2. */
  initialCount: number
  /** How many more a "Show more" press (or a mobile scroll-to-end) reveals. */
  pageSize: number
  /**
   * Exact card height in px. The placeholder and the real card must match this
   * so revealing a page never shifts the layout.
   */
  cardHeight: number
  variant: WikitabCardVariant
  /**
   * Thumbnail edge length in px. Must leave room inside `cardHeight`: a 96px
   * thumbnail needs 122px of card, a 40px one fits in 98px.
   */
  thumbnailSize: number
  /** Glyph beside the card's supporting text, where the variant shows one. */
  supportingIcon?: Icon
  /**
   * Text variant only: show the full hook with no line-clamp and let the card
   * grow past `cardHeight` (which becomes a minimum). Placeholders still use
   * `cardHeight` exactly.
   */
  fullHook?: boolean
}

export const WIKITAB_SECTIONS: readonly WikitabSectionSpec[] = [
  {
    id: 'trending',
    heading: 'Trending',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'thumbnail',
    thumbnailSize: 96,
    supportingIcon: cdxIconChartLine,
  },
  {
    id: 'news',
    heading: 'In the news',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'text',
    thumbnailSize: 96,
    fullHook: true,
  },
  {
    id: 'dyk',
    heading: 'Did you know',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'text',
    thumbnailSize: 96,
    fullHook: true,
  },
  {
    id: 'discussions',
    heading: 'Active discussions',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 98,
    variant: 'text',
    thumbnailSize: 96,
  },
  {
    id: 'otd',
    heading: 'On this day',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'text',
    thumbnailSize: 96,
    fullHook: true,
  },
  {
    id: 'births',
    heading: 'Birthdays',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'thumbnail',
    thumbnailSize: 96,
    supportingIcon: cdxIconCalendar,
  },
]

/** Default home-feed module order when nothing is pinned. Saved and Daily reads lead. */
export const WIKITAB_HOME_MODULE_ORDER: readonly WikitabModuleId[] = [
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  'trending',
  ...WIKITAB_SECTIONS.filter((section) => section.id !== 'trending').map(
    (section) => section.id,
  ),
]

/** Home Saved module — same paging contract as feed sections. */
export const WIKITAB_SAVED_MODULE_SPEC = {
  id: WIKITAB_SAVED_MODULE_ID,
  heading: 'Saved',
  initialCount: 4,
  pageSize: 6,
  cardHeight: 122,
  variant: 'thumbnail' as WikitabCardVariant,
  thumbnailSize: 96,
}

/** Home Daily reads module — morelike suggestions from daily-random saved seeds. */
export const WIKITAB_DAILY_READS_MODULE_SPEC = {
  id: WIKITAB_DAILY_READS_MODULE_ID,
  heading: 'Daily reads',
  initialCount: 4,
  pageSize: 6,
  cardHeight: 122,
  variant: 'thumbnail' as WikitabCardVariant,
  thumbnailSize: 96,
  supportingIcon: cdxIconLink,
}

/** Configure-panel rows: Saved first, then daily feed sections. */
export const WIKITAB_CONFIGURE_MODULES: ReadonlyArray<{
  id: WikitabModuleId
  heading: string
}> = [
  { id: WIKITAB_SAVED_MODULE_ID, heading: WIKITAB_SAVED_MODULE_SPEC.heading },
  { id: WIKITAB_DAILY_READS_MODULE_ID, heading: WIKITAB_DAILY_READS_MODULE_SPEC.heading },
  ...WIKITAB_SECTIONS.map((section) => ({ id: section.id, heading: section.heading })),
]

export interface WikitabSupportingSignal {
  icon: Icon
  text: string
}

/** One card's display data. Fields used depend on the section's variant. */
export interface WikitabCardData {
  key: string
  /** Where the card as a whole links — the bolded link's page. */
  href?: string
  /** Accessible name for that card-wide link. */
  linkTitle?: string
  /** `thumbnail` variant: bold title, subtle description, supporting caption. */
  title?: string
  description?: string
  supportingText?: string
  /** When set, renders multiple icon + text pairs instead of `supportingText`. */
  supportingSignals?: WikitabSupportingSignal[]
  /** With `supportingSignals`, pins this text to the inline end of the row. */
  supportingTextEnd?: string
  /** `text` variant: hook / story HTML with its inline links preserved. */
  html?: string
  thumbnailUrl?: string
  /**
   * Page title whose summary supplies `thumbnailUrl`. Present on DYK hooks,
   * where the feed gives no thumbnail and it has to be fetched per page.
   */
  thumbnailTitle?: string
}

export type WikitabFeed = Record<WikitabSectionId, WikitabCardData[]>
