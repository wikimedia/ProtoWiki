/** Wikimedia Attribution API (beta) — Core REST `/w/rest.php/attribution/v0-beta/…` */

export interface AttributionLicense {
  title: string
  url: string
}

export interface AttributionBrandMark {
  name: string
  url: string
  type: 'logo' | 'icon' | 'audio' | string
}

export interface AttributionSourceWiki {
  site_name?: string
  project_family?: string
  site_id?: string
  site_language?: string
  page_language?: string
}

export interface AttributionEssential {
  title: string
  link: string
  license: AttributionLicense
  default_brand_marks?: AttributionBrandMark[]
  source_wiki?: AttributionSourceWiki
  /** Present on Commons media file pages. */
  credit?: string
}

export interface AttributionTrendingFlags {
  read: boolean
  edited: boolean
  read_and_edited: boolean
}

export interface AttributionTrending {
  top?: AttributionTrendingFlags
  relative?: AttributionTrendingFlags
}

export interface AttributionTrustAndRelevance {
  last_updated?: string
  contributor_counts?: number | null
  page_views?: number | null
  reference_count?: number | null
  trending?: AttributionTrending
}

export interface AttributionCta {
  url: string
  link_text: string
  description: string
}

export interface AttributionCallsToAction {
  participation_ctas?: Record<string, AttributionCta>
  donation_ctas?: Record<string, AttributionCta>
}

export interface AttributionSignals {
  essential: AttributionEssential
  trust_and_relevance?: AttributionTrustAndRelevance
  calls_to_action?: AttributionCallsToAction
}

export type AttributionExpand =
  | 'trust_and_relevance'
  | 'calls_to_action'
  | 'essential'

export interface FetchAttributionSignalsOptions {
  host?: string
  expand?: AttributionExpand[]
  signal?: AbortSignal
  apiContact?: string
}

export interface FetchContributorCountOptions {
  host?: string
  signal?: AbortSignal
  apiContact?: string
}

export class AttributionApiError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'http' | 'aborted' | 'invalid',
    public readonly httpStatus?: number,
    public readonly errorKey?: string,
  ) {
    super(message)
    this.name = 'AttributionApiError'
  }
}

export type AttributionCardVariant = 'full' | 'compact' | 'inline'

/** How to present the Wikimedia source identity. */
export type AttributionSourceDisplay = 'name-and-mark' | 'name-only' | 'mark-only'

/** How to present the page title and link. */
export type AttributionTitleDisplay = 'linked-title' | 'title-only' | 'link-only'

/** How to present the license signal. */
export type AttributionLicenseDisplay = 'text-only' | 'linked-text' | 'hidden'

/** Which ecosystem-growth CTA to surface, if any. */
export type AttributionEcosystemCta =
  | 'none'
  | 'donation:default'
  | 'donation:foundation'
  | 'donation:special'
  | 'participation:learn_more'
  | 'participation:create_account'
  | 'participation:download_app'

/** Override trending badge when API data is sparse (playground / demos). */
export type AttributionTrendingMode = 'api' | 'most-read' | 'not-trending'

export interface AttributionCardDisplay {
  sourceDisplay?: AttributionSourceDisplay
  titleDisplay?: AttributionTitleDisplay
  licenseDisplay?: AttributionLicenseDisplay
  showCredit?: boolean
  showReferenceCount?: boolean
  showContributorCount?: boolean
  showPageViews?: boolean
  showTrending?: boolean
  showLastUpdate?: boolean
  showSourceLink?: boolean
  ecosystemCta?: AttributionEcosystemCta
  trendingMode?: AttributionTrendingMode
}

/** Ideal-level display props for the Search reuse scenario (framework demo). */
export const SEARCH_ATTRIBUTION_DISPLAY: Required<
  Pick<
    AttributionCardDisplay,
    | 'sourceDisplay'
    | 'titleDisplay'
    | 'licenseDisplay'
    | 'showCredit'
    | 'showReferenceCount'
    | 'showContributorCount'
    | 'showPageViews'
    | 'showTrending'
    | 'showLastUpdate'
    | 'showSourceLink'
    | 'ecosystemCta'
    | 'trendingMode'
  >
> = {
  sourceDisplay: 'name-and-mark',
  titleDisplay: 'linked-title',
  licenseDisplay: 'hidden',
  showCredit: false,
  showReferenceCount: true,
  showContributorCount: true,
  showPageViews: true,
  showTrending: true,
  showLastUpdate: false,
  showSourceLink: true,
  ecosystemCta: 'donation:default',
  trendingMode: 'most-read',
}
