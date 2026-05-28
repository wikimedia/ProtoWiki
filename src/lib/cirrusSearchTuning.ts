/**
 * Shared CirrusSearch tuning for fuzzy, semantic-ish retrieval in morelike flows.
 *
 * Both seed resolution and morelike run through Action API `list=search`, which on
 * enwiki is backed by CirrusSearch (Elasticsearch).
 */

/** Full-text seed lookup — force search (not title nav) and relax ranking. */
export const FUZZY_SEED_SEARCH = {
  /** Leading ~ skips title navigation after our explicit title lookup already ran. */
  prefixQuery: true,
  srwhat: 'text' as const,
  srnamespace: '0',
  /** Weight by incoming links + pageviews — surfaces broadly related notable pages. */
  srqiprofile: 'wsum_inclinks_pv',
  srprop: 'snippet',
} as const

/**
 * Morelike term extraction — lower match threshold, more fields, more query terms.
 * @see https://www.mediawiki.org/wiki/Help:CirrusSearch#More_like_this
 */
export const FUZZY_MORELIKE_CIRRUS_MLT: Record<string, string> = {
  cirrusMltMaxQueryTerms: '75',
  cirrusMltPercentTermsToMatch: '0.15',
  cirrusMltMinTermFreq: '1',
  cirrusMltMinWordLength: '0',
  cirrusMltFields: 'opening_text,headings,text',
  cirrusMltUseFields: 'true',
}

export function buildMorelikeQuery(seedTitles: string[]): string {
  return `morelike:${seedTitles.join('|')}`
}
