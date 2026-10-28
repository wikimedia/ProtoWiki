import type { Icon } from '@wikimedia/codex-icons'

import type { WikitabCardData, WikitabCardLoading, WikitabCardLoadingField } from '../sections'

import presentationJson from './wikitabCardPresentation.json'
import { wikitabReservedSlotHeight } from './wikitabCardSlotHeights'
import { resolveCodexIcon, type CodexIconName } from './wikitabCardSupportingIcons'
import {
  WIKITAB_CARD_PRIMITIVE_CATALOG,
  type WikitabCardPrimitiveId,
} from './wikitabCardTypeLinks'

/** `#description` renders `card.description` as plain text or HTML (inline links preserved). */
export type WikitabCardDescriptionFormat = 'plain' | 'html'
/** Thumbnail column policy — maps to CdxCard `forceThumbnail` when `force`. */
export type WikitabCardThumbnail = 'force' | 'optional' | 'none'

export type WikitabCardLoadingFlags = Record<WikitabCardLoadingField, boolean> & {
  /** Every field is a skeleton — render the flat reserved block instead of the card. */
  all: boolean
}

export function resolveWikitabCardLoading(
  loading: WikitabCardLoading | undefined,
): WikitabCardLoadingFlags {
  if (loading === true) {
    return {
      all: true,
      title: true,
      description: true,
      supporting: true,
      supportingEnd: true,
      thumbnail: true,
      chips: true,
    }
  }
  const fields = loading || {}
  return {
    all: false,
    title: !!fields.title,
    description: !!fields.description,
    supporting: !!fields.supporting,
    supportingEnd: !!fields.supportingEnd,
    thumbnail: !!fields.thumbnail,
    chips: !!fields.chips,
  }
}

/** True when any part of the card is still a skeleton. */
export function wikitabCardIsLoading(loading: WikitabCardLoading | undefined): boolean {
  if (!loading) return false
  if (loading === true) return true
  return Object.values(loading).some(Boolean)
}

export type WikitabCardThumbnailLayout = 'inline-start' | 'inline-end' | 'block-start'

/** Thumbnail edge in px — pairs with `cardHeight` (122↔96, 98↔40). */
export type WikitabCardThumbnailSizePx = 96 | 40

export const WIKITAB_CARD_THUMBNAIL_SIZE_DEFAULT: WikitabCardThumbnailSizePx = 96

export function isWikitabCardThumbnailSizePx(value: unknown): value is WikitabCardThumbnailSizePx {
  return value === 96 || value === 40
}

/**
 * Hardcoded presentation for one primitive (`wikitabCardPresentation.json`). No context
 * can override these fields — contexts only set the primitive's editable fields.
 */
export interface WikitabCardPresentationSpec {
  descriptionFormat: WikitabCardDescriptionFormat
  /** Line-clamp on `#title` (max lines). Omit for no title clamp. */
  titleLineClamp?: 1 | 2 | 4
  /** Line-clamp on `#description` (max lines). Omit for no clamp (full hook / description). */
  descriptionLineClamp?: 2 | 4
  thumbnailType: WikitabCardThumbnail
  thumbnailSize?: WikitabCardThumbnailSizePx
  thumbnailLayout?: WikitabCardThumbnailLayout
  /** When set, the primitive pins its supporting icon; otherwise `supportingIcon` is editable. */
  supportingIcon?: CodexIconName
}

const PRESENTATION = presentationJson as Record<WikitabCardPrimitiveId, WikitabCardPresentationSpec>

const PRESENTATION_CORE_FIELDS: Array<keyof WikitabCardPresentationSpec> = [
  'descriptionFormat',
  'thumbnailType',
]

/** `WikitabCard` props owned by the primitive's presentation row. */
const HARDCODED_PRESENTATION_PROP_NAMES = [
  'descriptionFormat',
  'titleLineClamp',
  'descriptionLineClamp',
  'thumbnailType',
  'thumbnailSize',
  'thumbnailLayout',
] as const

export function wikitabCardPresentationForPrimitive(
  primitive: WikitabCardPrimitiveId,
): WikitabCardPresentationSpec {
  const spec = PRESENTATION[primitive]
  if (!spec) {
    throw new Error(`Missing wikitabCardPresentation.json entry for primitive "${primitive}"`)
  }
  return spec
}

/** Primitives whose presentation row pins `supportingIcon` (not editable by contexts). */
export function wikitabPrimitiveHardcodesSupportingIcon(primitive: WikitabCardPrimitiveId): boolean {
  return Boolean(wikitabCardPresentationForPrimitive(primitive).supportingIcon)
}

function presentationFieldValue(
  spec: WikitabCardPresentationSpec,
  name: keyof WikitabCardPresentationSpec,
): string {
  const value = spec[name]
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function presentationFieldType(name: keyof WikitabCardPresentationSpec): string {
  switch (name) {
    case 'descriptionFormat':
      return "'plain' | 'html'"
    case 'descriptionLineClamp':
      return '2 | 4'
    case 'titleLineClamp':
      return '1 | 2 | 4'
    case 'thumbnailType':
      return "'force' | 'optional' | 'none'"
    case 'thumbnailLayout':
      return "'inline-start' | 'inline-end' | 'block-start'"
    case 'thumbnailSize':
      return '96 | 40'
    default:
      return 'string'
  }
}

export type WikitabCardPresentationFieldRow = {
  name: string
  type: string
  value: string
  optional: boolean
}

export function wikitabCardPresentationFieldRows(
  primitive: WikitabCardPrimitiveId,
): WikitabCardPresentationFieldRow[] {
  const spec = wikitabCardPresentationForPrimitive(primitive)
  const rows: WikitabCardPresentationFieldRow[] = []

  for (const name of PRESENTATION_CORE_FIELDS) {
    rows.push({
      name,
      type: presentationFieldType(name),
      value: presentationFieldValue(spec, name),
      optional: false,
    })
  }

  rows.push(
    {
      name: 'titleLineClamp',
      type: presentationFieldType('titleLineClamp'),
      value: presentationFieldValue(spec, 'titleLineClamp'),
      optional: true,
    },
    {
      name: 'descriptionLineClamp',
      type: presentationFieldType('descriptionLineClamp'),
      value: presentationFieldValue(spec, 'descriptionLineClamp'),
      optional: true,
    },
  )

  if (spec.thumbnailType !== 'none') {
    rows.push(
      {
        name: 'thumbnailSize',
        type: presentationFieldType('thumbnailSize'),
        value:
          spec.thumbnailSize !== undefined
            ? String(spec.thumbnailSize)
            : String(WIKITAB_CARD_THUMBNAIL_SIZE_DEFAULT),
        optional: true,
      },
      {
        name: 'thumbnailLayout',
        type: presentationFieldType('thumbnailLayout'),
        value: spec.thumbnailLayout ?? 'inline-start',
        optional: true,
      },
    )
  }
  if (spec.supportingIcon) {
    rows.push({
      name: 'supportingIcon',
      type: 'CodexIconName',
      value: spec.supportingIcon,
      optional: true,
    })
  }
  return rows
}

function wikitabCardPresentationBindFields(
  spec: WikitabCardPresentationSpec,
): Record<string, unknown> {
  const thumb =
    spec.thumbnailType === 'none'
      ? {}
      : {
          thumbnailSize: spec.thumbnailSize ?? WIKITAB_CARD_THUMBNAIL_SIZE_DEFAULT,
          thumbnailLayout: spec.thumbnailLayout ?? 'inline-start',
        }

  return {
    descriptionFormat: spec.descriptionFormat,
    titleLineClamp: spec.titleLineClamp,
    descriptionLineClamp: spec.descriptionLineClamp,
    thumbnailType: spec.thumbnailType,
    ...thumb,
  }
}

function assertOnlyEditableBindFields(
  primitive: WikitabCardPrimitiveId,
  spec: WikitabCardPresentationSpec,
  options: Record<string, unknown>,
): void {
  for (const name of HARDCODED_PRESENTATION_PROP_NAMES) {
    if (options[name] !== undefined) {
      throw new Error(
        `wikitabCardBindProps: "${name}" is hardcoded by the "${primitive}" primitive and cannot be set by a context`,
      )
    }
  }
  if (spec.supportingIcon && options.supportingIcon) {
    throw new Error(
      `wikitabCardBindProps: "${primitive}" pins supportingIcon (${spec.supportingIcon}); contexts cannot override it`,
    )
  }
}

/**
 * Props for `WikitabCard.vue` — production, saved slots, and payloads playground share this.
 * `options` may only carry the primitive's editable fields; hardcoded presentation always wins.
 */
export function wikitabCardBindProps(
  primitive: WikitabCardPrimitiveId,
  options: {
    card?: WikitabCardData
    loading?: WikitabCardLoading
    /** Editable unless the primitive pins one. */
    supportingIcon?: Icon
    /** Override loading skeleton height (default: the primitive's reserved slot height). */
    loadingHeight?: number
  } & Record<string, unknown> = {},
): Record<string, unknown> {
  const spec = wikitabCardPresentationForPrimitive(primitive)
  if (import.meta.env.DEV) assertOnlyEditableBindFields(primitive, spec, options)

  const { card, loading, supportingIcon: editableSupportingIcon, loadingHeight, ...rest } = options
  const supportingIcon = spec.supportingIcon
    ? resolveCodexIcon(spec.supportingIcon)
    : editableSupportingIcon

  return {
    ...rest,
    card,
    ...(supportingIcon ? { supportingIcon } : {}),
    ...(wikitabCardIsLoading(loading)
      ? {
          loading,
          loadingHeight: loadingHeight ?? wikitabReservedSlotHeight(primitive),
        }
      : {}),
    ...wikitabCardPresentationBindFields(spec),
  }
}

function assertPresentationCatalogComplete(): void {
  for (const spec of Object.values(PRESENTATION)) {
    if (
      spec.thumbnailSize !== undefined &&
      !isWikitabCardThumbnailSizePx(spec.thumbnailSize)
    ) {
      throw new Error(
        `wikitabCardPresentation.json thumbnailSize must be 96 or 40, got ${spec.thumbnailSize}`,
      )
    }
  }
  for (const entry of WIKITAB_CARD_PRIMITIVE_CATALOG) {
    if (!(entry.id in PRESENTATION)) {
      throw new Error(`wikitabCardPresentation.json is missing primitive "${entry.id}"`)
    }
  }
  for (const id of Object.keys(PRESENTATION)) {
    if (!WIKITAB_CARD_PRIMITIVE_CATALOG.some((entry) => entry.id === id)) {
      throw new Error(`wikitabCardPresentation.json row "${id}" is not a primitive`)
    }
  }
}

assertPresentationCatalogComplete()
