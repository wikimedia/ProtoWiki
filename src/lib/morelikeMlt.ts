export type MorelikeMltPreset = 'default' | 'custom'

export type MorelikeSortOrder = 'relevance' | 'lastEdit'

/** CirrusSearch more_like_this URL params (see Help:CirrusSearch#Morelike). */
export interface MorelikeMltCustomSettings {
  maxQueryTerms: number
  minTermFreq: number
  minDocFreq: number
  maxDocFreq: number | null
  minWordLength: number
  maxWordLength: number | null
  minimumShouldMatchPercent: number
  fields: 'text' | 'title' | 'opening_text'
  useFieldsOnly: boolean
}

/**
 * Extension defaults from CirrusSearch $wgCirrusSearchMoreLikeThisConfig
 * (docs/settings.txt). The “Default” preset omits all cirrusMlt* params so the
 * wiki uses these server-side — Custom only sends params that differ from this.
 */
export const CIRRUS_MLT_EXTENSION_DEFAULTS: MorelikeMltCustomSettings = {
  maxQueryTerms: 25,
  minTermFreq: 2,
  minDocFreq: 2,
  maxDocFreq: null,
  minWordLength: 0,
  maxWordLength: null,
  minimumShouldMatchPercent: 30,
  fields: 'text',
  useFieldsOnly: false,
}

/** Starting values for the Custom sliders (matches extension defaults). */
export const DEFAULT_MLT_CUSTOM: MorelikeMltCustomSettings = {
  ...CIRRUS_MLT_EXTENSION_DEFAULTS,
}

/** Preset for opening_text-only MLT tuning. */
export const OPENING_TEXT_MLT_CUSTOM: MorelikeMltCustomSettings = {
  ...DEFAULT_MLT_CUSTOM,
  fields: 'opening_text',
  useFieldsOnly: true,
}

export const MLT_PRESET_LABELS: Record<MorelikeMltPreset, string> = {
  default: 'No overrides (wiki default)',
  custom: 'Custom',
}

export const SORT_ORDER_LABELS: Record<MorelikeSortOrder, string> = {
  relevance: 'Most relevant',
  lastEdit: 'Most recent edit',
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function normalizeMltCustom(input: unknown): MorelikeMltCustomSettings {
  if (typeof input !== 'object' || input === null) {
    return { ...DEFAULT_MLT_CUSTOM }
  }

  const record = input as Record<string, unknown>
  const fields =
    record.fields === 'title' || record.fields === 'opening_text' || record.fields === 'text'
      ? record.fields
      : DEFAULT_MLT_CUSTOM.fields

  return {
    maxQueryTerms:
      typeof record.maxQueryTerms === 'number'
        ? clampInt(record.maxQueryTerms, 1, 100)
        : DEFAULT_MLT_CUSTOM.maxQueryTerms,
    minTermFreq:
      typeof record.minTermFreq === 'number'
        ? clampInt(record.minTermFreq, 1, 20)
        : DEFAULT_MLT_CUSTOM.minTermFreq,
    minDocFreq:
      typeof record.minDocFreq === 'number'
        ? clampInt(record.minDocFreq, 1, 20)
        : DEFAULT_MLT_CUSTOM.minDocFreq,
    maxDocFreq:
      typeof record.maxDocFreq === 'number'
        ? clampInt(record.maxDocFreq, 1, 1_000_000)
        : null,
    minWordLength:
      typeof record.minWordLength === 'number'
        ? clampInt(record.minWordLength, 0, 20)
        : DEFAULT_MLT_CUSTOM.minWordLength,
    maxWordLength:
      typeof record.maxWordLength === 'number' ? clampInt(record.maxWordLength, 1, 100) : null,
    minimumShouldMatchPercent:
      typeof record.minimumShouldMatchPercent === 'number'
        ? clampInt(record.minimumShouldMatchPercent, 1, 100)
        : DEFAULT_MLT_CUSTOM.minimumShouldMatchPercent,
    fields,
    useFieldsOnly:
      typeof record.useFieldsOnly === 'boolean'
        ? record.useFieldsOnly
        : DEFAULT_MLT_CUSTOM.useFieldsOnly,
  }
}

function buildCustomMltParams(custom: MorelikeMltCustomSettings): Record<string, string> {
  const normalized = normalizeMltCustom(custom)
  const defaults = CIRRUS_MLT_EXTENSION_DEFAULTS
  const params: Record<string, string> = {}

  if (normalized.maxQueryTerms !== defaults.maxQueryTerms) {
    params.cirrusMltMaxQueryTerms = String(normalized.maxQueryTerms)
  }

  if (normalized.minTermFreq !== defaults.minTermFreq) {
    params.cirrusMltMinTermFreq = String(normalized.minTermFreq)
  }

  if (normalized.minDocFreq !== defaults.minDocFreq) {
    params.cirrusMltMinDocFreq = String(normalized.minDocFreq)
  }

  if (normalized.minWordLength !== defaults.minWordLength) {
    params.cirrusMltMinWordLength = String(normalized.minWordLength)
  }

  if (normalized.minimumShouldMatchPercent !== defaults.minimumShouldMatchPercent) {
    params.cirrusMltMinimumShouldMatch = `${normalized.minimumShouldMatchPercent}%`
  }

  if (normalized.maxDocFreq !== null) {
    params.cirrusMltMaxDocFreq = String(normalized.maxDocFreq)
  }

  if (normalized.maxWordLength !== null) {
    params.cirrusMltMaxWordLength = String(normalized.maxWordLength)
  }

  if (normalized.useFieldsOnly) {
    params.cirrusMltUseFields = 'true'
  }

  if (normalized.useFieldsOnly || normalized.fields !== defaults.fields) {
    params.cirrusMltFields = normalized.fields
  }

  return params
}

export function resolveMltParams(
  preset: MorelikeMltPreset,
  custom: MorelikeMltCustomSettings,
): Record<string, string> {
  if (preset === 'default') return {}

  return buildCustomMltParams(custom)
}
