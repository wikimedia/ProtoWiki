import type { WikitabCardPrimitiveId } from './wikitabCardTypeLinks'

/**
 * Reserved slot heights for loading placeholders only (`sections.ts` no-jump contract).
 * Resolved cards hug content; row stretch comes from `useEqualRowHeights`.
 */
export const WIKITAB_CARD_RESERVED_SLOT_HEIGHT: Record<WikitabCardPrimitiveId, number> = {
  article: 122,
  snippet: 122,
  discussion: 98,
  suggestion: 122,
  image: 122,
  word: 122,
  quote: 122,
  list: 122,
  /** Chip row + title, delta, two-line summary, supporting — taller than article cards. */
  edit: 148,
}

export function wikitabReservedSlotHeight(primitive: WikitabCardPrimitiveId): number {
  const height = WIKITAB_CARD_RESERVED_SLOT_HEIGHT[primitive]
  if (height === undefined) {
    throw new Error(`Missing wikitabCardSlotHeights entry for primitive "${primitive}"`)
  }
  return height
}
