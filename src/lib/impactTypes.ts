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
  /** Titles edited (namespace 0) — used to sync config editedPages. */
  editedPageTitles?: string[]
}

export const EMPTY_IMPACT_DATA: ImpactData = {
  recentActivityData: [],
  mostViewed: [],
  sparklineData: [],
}
