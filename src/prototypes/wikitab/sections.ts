import { cdxIconChartLine } from '@wikimedia/codex-icons'

export type WikitabSectionId = 'trending' | 'dyk' | 'news'

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
  supportingIcon?: string
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
    supportingIcon: cdxIconChartLine as string,
  },
  {
    id: 'dyk',
    heading: 'Did you know',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'text',
    thumbnailSize: 96,
  },
  {
    id: 'news',
    heading: 'In the news',
    initialCount: 4,
    pageSize: 6,
    cardHeight: 122,
    variant: 'text',
    thumbnailSize: 96,
  },
]

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
