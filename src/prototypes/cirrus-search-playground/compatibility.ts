import type { CirrusSearchFormState } from './types'

export type FieldKey =
  | 'words'
  | 'exactPhrase'
  | 'excludeTerm'
  | 'forceResults'
  | 'namespaceDomain'
  | 'localOnly'
  | 'prefix'
  | 'filters'
  | 'insourceText'
  | 'insourceRegex'
  | 'intitleRegex'
  | 'dateRows'
  | 'articletopic'
  | 'articlecountry'
  | 'hasrecommendation'
  | 'preferRecent'
  | 'boostTemplates'
  | 'geo'
  | 'fileProperties'
  | 'wikibaseRaw'
  | 'seedTitles'
  | 'cirrusMlt'

export interface FieldCompatibility {
  disabled: boolean
  reason?: string
}

export type CompatibilityMap = Record<FieldKey, FieldCompatibility>

function disabled(reason: string): FieldCompatibility {
  return { disabled: true, reason }
}

function enabled(): FieldCompatibility {
  return { disabled: false }
}

function isScoringSortDisabled(state: CirrusSearchFormState): boolean {
  const sort = state.srsort.trim()
  return sort.length > 0 && sort !== 'relevance'
}

function isFileNamespace(state: CirrusSearchFormState): boolean {
  if (state.namespaceDomain === 'file') return true
  const ns = state.srnamespace.trim()
  return ns === '6' || ns.split('|').includes('6')
}

export function computeCompatibility(state: CirrusSearchFormState): CompatibilityMap {
  const greedyMorelike = state.queryMode === 'morelike'
  const scoringDisabled = isScoringSortDisabled(state)
  const fileNs = isFileNamespace(state)

  const greedyReason =
    'morelike: is greedy and cannot combine with other srsearch terms. Use Morelikethis mode instead.'

  const scoringReason =
    'Scoring keywords have no effect when sort is not relevance (or empty default).'

  return {
    seedTitles: greedyMorelike || state.queryMode === 'morelikethis' ? enabled() : enabled(),
    words: greedyMorelike ? disabled(greedyReason) : enabled(),
    exactPhrase: greedyMorelike ? disabled(greedyReason) : enabled(),
    excludeTerm: greedyMorelike ? disabled(greedyReason) : enabled(),
    forceResults: greedyMorelike ? disabled(greedyReason) : enabled(),
    namespaceDomain: greedyMorelike ? disabled(greedyReason) : enabled(),
    localOnly:
      greedyMorelike
        ? disabled(greedyReason)
        : fileNs
          ? enabled()
          : disabled('local: only applies when searching the File namespace.'),
    prefix: greedyMorelike ? disabled(greedyReason) : enabled(),
    filters: greedyMorelike ? disabled(greedyReason) : enabled(),
    insourceText: greedyMorelike ? disabled(greedyReason) : enabled(),
    insourceRegex: greedyMorelike ? disabled(greedyReason) : enabled(),
    intitleRegex: greedyMorelike ? disabled(greedyReason) : enabled(),
    dateRows: greedyMorelike ? disabled(greedyReason) : enabled(),
    articletopic: greedyMorelike ? disabled(greedyReason) : enabled(),
    articlecountry: greedyMorelike ? disabled(greedyReason) : enabled(),
    hasrecommendation: greedyMorelike ? disabled(greedyReason) : enabled(),
    preferRecent:
      greedyMorelike
        ? disabled(greedyReason)
        : scoringDisabled
          ? disabled(scoringReason)
          : enabled(),
    boostTemplates:
      greedyMorelike
        ? disabled(greedyReason)
        : scoringDisabled
          ? disabled(scoringReason)
          : enabled(),
    geo:
      greedyMorelike
        ? disabled(greedyReason)
        : scoringDisabled && state.geoMode.startsWith('boost-')
          ? disabled(scoringReason)
          : enabled(),
    fileProperties: greedyMorelike ? disabled(greedyReason) : enabled(),
    wikibaseRaw: greedyMorelike ? disabled(greedyReason) : enabled(),
    cirrusMlt:
      state.queryMode === 'morelike' || state.queryMode === 'morelikethis'
        ? enabled()
        : disabled('Morelike tuning applies only in Morelike or Morelikethis modes.'),
  }
}
