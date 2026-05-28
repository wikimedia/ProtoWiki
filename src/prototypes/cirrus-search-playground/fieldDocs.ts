import type {
  CirrusMltField,
  FilterKeyword,
  QueryMode,
  SrInfo,
  SrProp,
} from './types'

/** Inline help from Help:CirrusSearch — keyed to form controls. */
export const FIELD_DOCS = {
  lang: 'Wikipedia language code for the API host (e.g. en → en.wikipedia.org).',
  queryMode:
    'Normal builds a full query. Morelike (greedy) sends only morelike:Seeds. Morelikethis combines a seed with filters.',
  seedTitlesMorelike:
    'Pipe-separated page titles. Becomes morelike:Page1|Page2 — cannot mix with other srsearch terms.',
  seedTitlesMorelikethis:
    'Single seed page. Becomes morelikethis:Page and can combine with filters like hastemplate:.',
  words:
    'Indexed full-text terms matched against rendered page content. Stemming and wildcards (*, \\?) apply.',
  exactPhrase:
    'Phrase in quotes — greyspace-tolerant exact match. Disables automatic stemming for that phrase.',
  excludeTerm:
    'Prefix with - to exclude pages containing this term (truth-logic NOT).',
  forceResults:
    'Leading ~ on the first term forces search results instead of title navigation.',
  namespaceDomain:
    'Search domain prefix — must be first in srsearch. file:, talk:, all:, or : for mainspace only.',
  localOnly:
    'With file:, limits to locally hosted files and excludes Commons-hosted media.',
  prefix:
    'Matches page names starting with this string; always placed last in srsearch. Can include a namespace (e.g. Talk:cow/).',
  filtersIntro:
    'Each filter narrows the domain. Add multiple rows; check Negate for -keyword: syntax.',
  filterValue: 'Value for the selected keyword (quotes added automatically when needed).',
  filterNegate: 'Prefix the keyword with - to exclude matching pages.',
  dateCreation:
    'First revision timestamp. Examples: creationdate:2025, creationdate:>2024, creationdate:now-1y.',
  dateLastEdit:
    'Last edit timestamp. Examples: lasteditdate:2025-09, lasteditdate:>=now-1d.',
  dateOperator: 'Comparison: exact year/month/day, or >, >=, <, <= before the date value.',
  dateValue: 'Absolute (2025, 2025-09-01) or relative (now, now-1d, today-1y). Wiki local timezone.',
  insourceText:
    'Match words or phrases in raw wikitext (not rendered content). Ignores greyspace.',
  insourceRegex:
    'Regex over wikitext — slow; pair with other filters. Syntax: insource:/pattern/ or /pattern/i.',
  insourceRegexCaseInsensitive: 'Append i flag for case-insensitive regex (slower).',
  intitleRegex:
    'Regex matched against titles only. Syntax: intitle:/pattern/ or intitle:/pattern/i.',
  intitleRegexCaseInsensitive: 'Append i flag for case-insensitive title regex.',
  datesIntro:
    'Filter by first revision (creationdate:) or last edit (lasteditdate:). Use >, >=, <, <= or exact; relative values like now-1d.',
  articletopic:
    'Filter/rank by ML topic (Wikipedia mainspace). Pipe for OR (books|films); space for AND. Boost with ^2.0.',
  articlecountry:
    'Filter/rank by predicted country relation (e.g. bel|fra). Optional ^ boost factor.',
  hasrecommendation:
    'Filter pages with ML edit recommendations (image, link, tone, etc.). Threshold: >0.5; boost: ^1.0.',
  preferRecent:
    'Boost recently edited pages when srsort is relevance. Format: boost,half-life-days (default 0.6,160).',
  boostTemplates:
    'Ad-hoc template score boosts. One per line: Template:Name|150% (overrides wiki default boosts).',
  geoMode:
    'GeoData extension: neartitle:/nearcoord: filter by location; boost-* variants increase nearby scores.',
  geoDistance: 'Optional radius prefix, e.g. 100km, before title or coordinates.',
  geoTitle: 'Page title to source coordinates from (neartitle: / boost-neartitle:).',
  geoLat: 'Latitude for nearcoord: / boost-nearcoord: (decimal degrees).',
  geoLon: 'Longitude for nearcoord: / boost-nearcoord: (decimal degrees).',
  filetype:
    'Media type classification: BITMAP, VIDEO, OFFICE, etc. Best combined with file: namespace.',
  filemime: 'MIME type filter — exact with quotes ("image/png") or partial (pdf).',
  filesize: 'Size in kilobytes (1024 bytes). Supports >, <, and min,max ranges.',
  fileMeasuresIntro:
    'Pixel width (filew), height (fileh), resolution (fileres), or bit depth (filebits).',
  fileMeasureValue: 'Numeric value, or min for a range when operator is range.',
  fileMeasureEnd: 'Maximum value for an inclusive range (min,max).',
  wikibaseRaw:
    'Passthrough Wikibase CirrusSearch keywords for Wikidata / Commons (see Help:WikibaseCirrusSearch).',
  srwhat:
    'API: what to search — text (default), title, or nearmatch (near title match).',
  srnamespace:
    'API: pipe-separated namespace IDs to search (0 = main). Independent of query file: prefix.',
  srlimit: 'API: max results per request (1–50).',
  sroffset: 'API: pagination offset; incremented by Show more via continue.sroffset.',
  srsort:
    'API: explicit sort order. Non-relevance sorts disable prefer-recent and boost-templates.',
  srqiprofile:
    'API: ranking profile override, e.g. popular_inclinks_pv (wiki-dependent).',
  srpropIntro: 'API: extra properties returned per hit (snippet, timestamp, size, …).',
  srinfoIntro:
    'API: query metadata — totalhits count, spelling suggestion, rewritten query.',
  cirrusMltMinDocFreq: 'Min documents (per shard) that must contain a term for MLT to use it.',
  cirrusMltMaxDocFreq: 'Max documents (per shard) that may contain a term.',
  cirrusMltMaxQueryTerms: 'Maximum number of terms extracted from seed pages.',
  cirrusMltMinTermFreq: 'Min occurrences in seed doc for a term to count (use 1 for title fields).',
  cirrusMltMinWordLength: 'Minimum character length for extracted terms (0 = no minimum).',
  cirrusMltMaxWordLength: 'Maximum word length; 0 = unbounded.',
  cirrusMltPercentTermsToMatch: 'Fraction of extracted terms that must match (default 0.3).',
  cirrusMltUseFields:
    'When true, use only cirrusMltFields data instead of extracting from text.',
  cirrusMltFieldsIntro:
    'Indexed fields for morelike term extraction: title, text, opening_text, headings, all, …',
} as const

export const QUERY_MODE_DOCS: Record<QueryMode, string> = {
  normal: 'Words, filters, and weighting compose freely.',
  morelike: 'Greedy — srsearch is only morelike:Seed1|Seed2. No other terms allowed.',
  morelikethis: 'Composable — morelikethis:Seed plus filters like incategory: or hastemplate:.',
}

export const FILTER_DOCS: Record<FilterKeyword, string> = {
  intitle: 'Match title only (stemming on unless quoted). intitle:"fine line" disables stemming.',
  incategory: 'Pages in Category:Name (no subcategories — use deepcat: for those).',
  deepcat: 'Category plus subcategories (SPARQL-backed; depth/ count limits apply).',
  linksto: 'Pages with [[wikilinks]] to exact canonical page name (not redirects).',
  hastemplate: 'Pages transcluding Template:Name (post-expansion; namespace aliases OK).',
  inlanguage: 'Translate extension — pages in given language code (e.g. inlanguage:ja).',
  contentmodel: 'Pages with content model, e.g. contentmodel:json.',
  subpageof: 'Subpages of ParentPage (quotes if name has spaces).',
  pageid: 'Restrict to numeric page IDs (mainly for tooling, not manual search).',
}

export const SRP_PROP_DOCS: Record<SrProp, string> = {
  snippet: 'HTML snippet with search term highlights.',
  timestamp: 'Last revision timestamp of each result.',
  size: 'Page size in bytes.',
  wordcount: 'Indexed word count.',
  titlesnippet: 'Highlighted title snippet.',
}

export const SR_INFO_DOCS: Record<SrInfo, string> = {
  totalhits: 'Approximate total matching pages (shown above results).',
  suggestion: 'Did-you-mean spelling correction from the search backend.',
  rewrittenquery: 'Query the engine actually ran after rewrites.',
}

export const MLT_FIELD_DOCS: Record<CirrusMltField, string> = {
  title: 'Page title field.',
  text: 'Main article body text (default extraction source).',
  auxiliary_text: 'Hatnotes, captions, ToC, searchaux-marked content.',
  opening_text: 'Lead section before the first heading.',
  headings: 'Section headings.',
  all: 'All indexed text fields.',
}

export function filterDoc(keyword: FilterKeyword): string {
  return FILTER_DOCS[keyword]
}
