import type { ComputedRef, InjectionKey } from 'vue'

/** Local stand-in for upstream CdxCard props until Codex ships Gerrit 1319153. */
export type WikitaLiteCardSeparation = 'outline' | 'divider' | 'none'

export type WikitaLiteCardThumbnailPosition = 'start' | 'end' | 'top'

export type WikitaLiteCardThumbnailSize = 'small' | 'large'

export const WIKITA_LITE_CARD_SEPARATION: InjectionKey<ComputedRef<WikitaLiteCardSeparation>> =
  Symbol('wikita-lite-card-separation')

/** Mirrors upstream `cdx-card--separation-divider`. */
export const WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER = 'wikita-lite-card--separation-divider'

/** Mirrors upstream `cdx-card--separation-none`. */
export const WIKITA_LITE_CARD_CLASS_SEPARATION_NONE = 'wikita-lite-card--separation-none'

/** Mirrors upstream `cdx-card--thumbnail-position-end`. */
export const WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_END =
  'wikita-lite-card--thumbnail-position-end'

/** Mirrors upstream `cdx-card--thumbnail-position-top`. */
export const WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_TOP =
  'wikita-lite-card--thumbnail-position-top'

/** Mirrors upstream `cdx-card--thumbnail-size-large`. */
export const WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE = 'wikita-lite-card--thumbnail-size-large'

/** Outline card lists on tab previews — spaced bordered cards. */
export const WIKITA_LITE_CARD_GROUP_OUTLINE = 'wikita-lite-card-group--outline'

/** Divider card lists on fullscreen module pages. */
export const WIKITA_LITE_CARD_GROUP_DIVIDER = 'wikita-lite-card-group--divider'
