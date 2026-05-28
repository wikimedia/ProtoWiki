export type QueryMode = 'normal' | 'morelike' | 'morelikethis'

export type NamespaceDomain =
  | 'main'
  | 'file'
  | 'talk'
  | 'all'
  | 'colon'

export type FilterKeyword =
  | 'intitle'
  | 'incategory'
  | 'deepcat'
  | 'linksto'
  | 'hastemplate'
  | 'inlanguage'
  | 'contentmodel'
  | 'subpageof'
  | 'pageid'

export interface FilterRow {
  id: string
  keyword: FilterKeyword
  value: string
  negate: boolean
}

export type DateKeyword = 'creationdate' | 'lasteditdate'

export type DateOperator = 'exact' | '>' | '>=' | '<' | '<='

export interface DateFilterRow {
  id: string
  keyword: DateKeyword
  operator: DateOperator
  value: string
}

export type GeoMode =
  | 'none'
  | 'neartitle'
  | 'nearcoord'
  | 'boost-neartitle'
  | 'boost-nearcoord'

export type FileMeasure = 'filew' | 'fileh' | 'fileres' | 'filebits'

export type FileMeasureOperator = 'exact' | '>' | '<' | 'range'

export interface FileMeasureRow {
  id: string
  measure: FileMeasure
  operator: FileMeasureOperator
  value: string
  valueEnd: string
}

export type SrWhat = 'text' | 'title' | 'nearmatch'

export type SrSort =
  | ''
  | 'relevance'
  | 'last_edit_desc'
  | 'last_edit_asc'
  | 'create_timestamp_desc'
  | 'create_timestamp_asc'
  | 'just_match'
  | 'random'
  | 'incoming_links_desc'
  | 'incoming_links_asc'
  | 'title_natural_desc'
  | 'title_natural_asc'
  | 'user_random'
  | 'none'

export type SrProp = 'snippet' | 'timestamp' | 'size' | 'wordcount' | 'titlesnippet'

export type SrInfo = 'totalhits' | 'suggestion' | 'rewrittenquery'

export type CirrusMltField =
  | 'title'
  | 'text'
  | 'auxiliary_text'
  | 'opening_text'
  | 'headings'
  | 'all'

export interface CirrusMltSettings {
  minDocFreq: string
  maxDocFreq: string
  maxQueryTerms: string
  minTermFreq: string
  minWordLength: string
  maxWordLength: string
  fields: CirrusMltField[]
  useFields: boolean
  percentTermsToMatch: string
}

export interface CirrusSearchFormState {
  lang: string
  queryMode: QueryMode
  seedTitles: string
  words: string
  exactPhrase: string
  excludeTerm: string
  forceResults: boolean
  namespaceDomain: NamespaceDomain
  localOnly: boolean
  prefix: string
  filterRows: FilterRow[]
  insourceText: string
  insourceRegex: string
  insourceRegexCaseInsensitive: boolean
  intitleRegex: string
  intitleRegexCaseInsensitive: boolean
  dateRows: DateFilterRow[]
  articletopic: string
  articlecountry: string
  hasrecommendation: string
  preferRecent: string
  boostTemplates: string
  geoMode: GeoMode
  geoDistance: string
  geoTitle: string
  geoLat: string
  geoLon: string
  filetype: string
  filemime: string
  filesize: string
  fileMeasures: FileMeasureRow[]
  wikibaseRaw: string
  srwhat: SrWhat
  srnamespace: string
  srlimit: number
  sroffset: number
  srsort: SrSort
  srprop: SrProp[]
  srinfo: SrInfo[]
  srqiprofile: string
  cirrusMlt: CirrusMltSettings
}

export function createFilterRow(keyword: FilterKeyword): FilterRow {
  return {
    id: `${keyword}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    keyword,
    value: '',
    negate: false,
  }
}

export function createDateRow(keyword: DateKeyword): DateFilterRow {
  return {
    id: `${keyword}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    keyword,
    operator: 'exact',
    value: '',
  }
}

export function createFileMeasureRow(measure: FileMeasure = 'filew'): FileMeasureRow {
  return {
    id: `measure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    measure,
    operator: 'exact',
    value: '',
    valueEnd: '',
  }
}

export const DEFAULT_CIRRUS_MLT: CirrusMltSettings = {
  minDocFreq: '',
  maxDocFreq: '',
  maxQueryTerms: '',
  minTermFreq: '',
  minWordLength: '',
  maxWordLength: '',
  fields: [],
  useFields: false,
  percentTermsToMatch: '',
}

export const DEFAULT_FORM_STATE: CirrusSearchFormState = {
  lang: 'en',
  queryMode: 'normal',
  seedTitles: '',
  words: 'climate',
  exactPhrase: '',
  excludeTerm: '',
  forceResults: false,
  namespaceDomain: 'main',
  localOnly: false,
  prefix: '',
  filterRows: [],
  insourceText: '',
  insourceRegex: '',
  insourceRegexCaseInsensitive: false,
  intitleRegex: '',
  intitleRegexCaseInsensitive: false,
  dateRows: [],
  articletopic: '',
  articlecountry: '',
  hasrecommendation: '',
  preferRecent: '',
  boostTemplates: '',
  geoMode: 'none',
  geoDistance: '',
  geoTitle: '',
  geoLat: '',
  geoLon: '',
  filetype: '',
  filemime: '',
  filesize: '',
  fileMeasures: [],
  wikibaseRaw: '',
  srwhat: 'text',
  srnamespace: '',
  srlimit: 20,
  sroffset: 0,
  srsort: '',
  srprop: ['snippet'],
  srinfo: ['totalhits'],
  srqiprofile: '',
  cirrusMlt: { ...DEFAULT_CIRRUS_MLT },
}
