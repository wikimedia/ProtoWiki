/** Serializable Impact module props (matches template-homepage ImpactModule). */

export interface ImpactMostViewedArticle {
  title: string
  views: number
  thumbnailSrc?: string
  href?: string
  sparklineData?: number[]
}

export interface ImpactData {
  viewCount?: string
  viewLabel?: string
  sparklineData?: number[]
  lastEdited?: string
  longestStreak?: string
  /** Numeric when known; `"?"` when not available from live APIs. */
  thanksReceived?: number | string
  totalEdits?: number
  recentActivityData?: number[]
  activityStartDate?: string
  activityEndDate?: string
  mostViewed?: ImpactMostViewedArticle[]
  viewAllEditsHref?: string
  /** Unique article titles from recent namespace-0 contribs (impact fetch only). */
  editedPageTitles?: string[]
}

export const EMPTY_IMPACT_DATA: ImpactData = {
  recentActivityData: [],
  mostViewed: [],
  sparklineData: [],
}
