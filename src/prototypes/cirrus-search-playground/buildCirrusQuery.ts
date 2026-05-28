import { buildCirrusSearchApiUrl, type FetchCirrusSearchParams } from '@/lib/fetchCirrusSearch'

import type {
  CirrusSearchFormState,
  DateFilterRow,
  FilterRow,
  FileMeasureRow,
  NamespaceDomain,
} from './types'

export interface BuildCirrusQueryResult {
  srsearch: string
  apiParams: FetchCirrusSearchParams
  apiUrl: string
  warnings: string[]
}

function quoteIfNeeded(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.length) return ''
  if (/\s/.test(trimmed) || trimmed.includes('|')) {
    return `"${trimmed.replace(/"/g, '\\"')}"`
  }
  return trimmed
}

function namespacePrefix(domain: NamespaceDomain, localOnly: boolean): string {
  let prefix = ''
  switch (domain) {
    case 'file':
      prefix = 'file:'
      break
    case 'talk':
      prefix = 'talk:'
      break
    case 'all':
      prefix = 'all:'
      break
    case 'colon':
      prefix = ':'
      break
    default:
      break
  }
  if (domain === 'file' && localOnly) {
    prefix += 'local:'
  }
  return prefix
}

function buildFilterClause(row: FilterRow): string {
  const value = quoteIfNeeded(row.value)
  if (!value) return ''
  const prefix = row.negate ? '-' : ''
  return `${prefix}${row.keyword}:${value}`
}

function buildDateClause(row: DateFilterRow): string {
  const value = row.value.trim()
  if (!value) return ''
  const op = row.operator === 'exact' ? '' : row.operator
  return `${row.keyword}:${op}${value}`
}

function buildGeoClause(state: CirrusSearchFormState): string {
  if (state.geoMode === 'none') return ''

  const keyword = state.geoMode
  const distance = state.geoDistance.trim()
  const title = state.geoTitle.trim()
  const lat = state.geoLat.trim()
  const lon = state.geoLon.trim()

  if (keyword === 'neartitle' || keyword === 'boost-neartitle') {
    if (!title) return ''
    const inner = distance ? `${distance},${quoteIfNeeded(title)}` : quoteIfNeeded(title)
    return `${keyword}:${inner}`
  }

  if (keyword === 'nearcoord' || keyword === 'boost-nearcoord') {
    if (!lat || !lon) return ''
    const coords = distance ? `${distance},${lat},${lon}` : `${lat},${lon}`
    return `${keyword}:${coords}`
  }

  return ''
}

function buildFileMeasureClause(row: FileMeasureRow): string {
  const measure = row.measure
  const value = row.value.trim()
  if (!value) return ''

  if (row.operator === 'range') {
    const end = row.valueEnd.trim()
    if (!end) return ''
    return `${measure}:${value},${end}`
  }

  const op = row.operator === 'exact' ? '' : row.operator
  return `${measure}:${op}${value}`
}

function buildMorelikeSeeds(seedTitles: string): string {
  return seedTitles
    .split('|')
    .map((title) => title.trim())
    .filter(Boolean)
    .join('|')
}

function buildBodyTokens(state: CirrusSearchFormState): string[] {
  const tokens: string[] = []

  if (state.queryMode === 'morelike') {
    const seeds = buildMorelikeSeeds(state.seedTitles)
    if (seeds) tokens.push(`morelike:${seeds}`)
    return tokens
  }

  if (state.queryMode === 'morelikethis') {
    const seed = state.seedTitles.trim().split('|')[0]?.trim()
    if (seed) tokens.push(`morelikethis:${quoteIfNeeded(seed)}`)
  }

  if (state.forceResults && tokens.length === 0 && state.words.trim()) {
    tokens.push(`~${state.words.trim()}`)
  } else if (state.words.trim()) {
    tokens.push(state.words.trim())
  }

  if (state.exactPhrase.trim()) {
    tokens.push(`"${state.exactPhrase.trim()}"`)
  }

  if (state.excludeTerm.trim()) {
    tokens.push(`-${state.excludeTerm.trim()}`)
  }

  for (const row of state.filterRows) {
    const clause = buildFilterClause(row)
    if (clause) tokens.push(clause)
  }

  if (state.insourceText.trim()) {
    tokens.push(`insource:${quoteIfNeeded(state.insourceText)}`)
  }

  if (state.insourceRegex.trim()) {
    const flags = state.insourceRegexCaseInsensitive ? 'i' : ''
    tokens.push(`insource:/${state.insourceRegex.trim()}/${flags}`)
  }

  if (state.intitleRegex.trim()) {
    const flags = state.intitleRegexCaseInsensitive ? 'i' : ''
    tokens.push(`intitle:/${state.intitleRegex.trim()}/${flags}`)
  }

  for (const row of state.dateRows) {
    const clause = buildDateClause(row)
    if (clause) tokens.push(clause)
  }

  if (state.articletopic.trim()) {
    tokens.push(`articletopic:${state.articletopic.trim()}`)
  }

  if (state.articlecountry.trim()) {
    tokens.push(`articlecountry:${state.articlecountry.trim()}`)
  }

  if (state.hasrecommendation.trim()) {
    tokens.push(`hasrecommendation:${state.hasrecommendation.trim()}`)
  }

  if (state.preferRecent.trim()) {
    tokens.push(`prefer-recent:${state.preferRecent.trim()}`)
  }

  if (state.boostTemplates.trim()) {
    tokens.push(`boost-templates:"${state.boostTemplates.trim().replace(/"/g, '\\"')}"`)
  }

  const geo = buildGeoClause(state)
  if (geo) tokens.push(geo)

  if (state.filetype.trim()) {
    tokens.push(`filetype:${state.filetype.trim()}`)
  }

  if (state.filemime.trim()) {
    tokens.push(`filemime:${quoteIfNeeded(state.filemime)}`)
  }

  if (state.filesize.trim()) {
    tokens.push(`filesize:${state.filesize.trim()}`)
  }

  for (const row of state.fileMeasures) {
    const clause = buildFileMeasureClause(row)
    if (clause) tokens.push(clause)
  }

  if (state.wikibaseRaw.trim()) {
    tokens.push(state.wikibaseRaw.trim())
  }

  const prefix = state.prefix.trim()
  if (prefix) {
    tokens.push(`prefix:${prefix}`)
  }

  return tokens
}

function buildCirrusMltParams(state: CirrusSearchFormState): Record<string, string> | undefined {
  if (state.queryMode !== 'morelike' && state.queryMode !== 'morelikethis') return undefined

  const mlt = state.cirrusMlt
  const params: Record<string, string> = {}

  if (mlt.minDocFreq) params.cirrusMltMinDocFreq = mlt.minDocFreq
  if (mlt.maxDocFreq) params.cirrusMltMaxDocFreq = mlt.maxDocFreq
  if (mlt.maxQueryTerms) params.cirrusMltMaxQueryTerms = mlt.maxQueryTerms
  if (mlt.minTermFreq) params.cirrusMltMinTermFreq = mlt.minTermFreq
  if (mlt.minWordLength) params.cirrusMltMinWordLength = mlt.minWordLength
  if (mlt.maxWordLength) params.cirrusMltMaxWordLength = mlt.maxWordLength
  if (mlt.fields.length) params.cirrusMltFields = mlt.fields.join(',')
  if (mlt.useFields) params.cirrusMltUseFields = 'true'
  if (mlt.percentTermsToMatch) params.cirrusMltPercentTermsToMatch = mlt.percentTermsToMatch

  return Object.keys(params).length ? params : undefined
}

export function collectWarnings(state: CirrusSearchFormState, srsearch: string): string[] {
  const warnings: string[] = []

  const sort = state.srsort.trim()
  const scoringDisabled = sort.length > 0 && sort !== 'relevance'
  if (scoringDisabled) {
    warnings.push(
      'prefer-recent, boost-templates, and boost-neartitle have no effect when sort is not relevance.',
    )
  }

  if (state.queryMode === 'morelike') {
    warnings.push('morelike: is greedy — it cannot combine with other search terms in srsearch.')
  }

  const hasFileFilters =
    state.filetype.trim() ||
    state.filemime.trim() ||
    state.filesize.trim() ||
    state.fileMeasures.some((row) => row.value.trim())

  if (hasFileFilters && state.namespaceDomain !== 'file') {
    warnings.push('File property filters work best with the File namespace (file:).')
  }

  const hasRegex = state.insourceRegex.trim()
  const hasOtherTerms =
    state.words.trim() ||
    state.exactPhrase.trim() ||
    state.filterRows.some((row) => row.value.trim()) ||
    state.insourceText.trim()

  if (hasRegex && !hasOtherTerms && state.queryMode !== 'morelike') {
    warnings.push('Bare insource:/regex/ searches can be slow — add other filters when possible.')
  }

  if (
    (state.articletopic.trim() || state.articlecountry.trim() || state.hasrecommendation.trim()) &&
    state.lang !== 'en'
  ) {
    warnings.push('articletopic, articlecountry, and hasrecommendation may not work on all wikis.')
  }

  if (state.geoMode !== 'none') {
    warnings.push('Geo search requires the GeoData extension on the target wiki.')
  }

  if (!srsearch.trim()) {
    warnings.push('Query is empty — enter search terms or switch to Morelike mode with seed pages.')
  }

  return warnings
}

export function buildCirrusQuery(state: CirrusSearchFormState): BuildCirrusQueryResult {
  const nsPrefix = namespacePrefix(state.namespaceDomain, state.localOnly)
  const bodyTokens = buildBodyTokens(state)
  const srsearch = `${nsPrefix}${bodyTokens.join(' ')}`.trim()

  const apiParams: FetchCirrusSearchParams = {
    srsearch,
    srwhat: state.srwhat,
    srlimit: state.srlimit,
    sroffset: state.sroffset,
  }

  if (state.srnamespace.trim()) {
    apiParams.srnamespace = state.srnamespace.trim()
  }

  if (state.srsort.trim()) {
    apiParams.srsort = state.srsort.trim()
  }

  if (state.srprop.length) {
    apiParams.srprop = state.srprop.join('|')
  }

  if (state.srinfo.length) {
    apiParams.srinfo = state.srinfo.join('|')
  }

  if (state.srqiprofile.trim()) {
    apiParams.srqiprofile = state.srqiprofile.trim()
  }

  const cirrusMlt = buildCirrusMltParams(state)
  if (cirrusMlt) {
    apiParams.cirrusMlt = cirrusMlt
  }

  const warnings = collectWarnings(state, srsearch)
  const apiUrl = buildCirrusSearchApiUrl(state.lang, apiParams)

  return { srsearch, apiParams, apiUrl, warnings }
}
