/** Wikidata anchor classes for music performers (expanded via P31/P279* in SPARQL). */
export const MUSIC_PERFORMER_QIDS = [
  'Q215380', // musical group
  'Q639669', // musician
  'Q36834', // composer
  'Q177220', // singer
  'Q753110', // songwriter
] as const

/** Wikidata anchor classes for geographic locations (expanded via P31/P279* in SPARQL). */
export const LOCATION_QIDS = [
  'Q515', // city
  'Q6256', // country
  'Q35657', // state
  'Q532', // village
  'Q23442', // island
  'Q486972', // human settlement
] as const

export type YearKind = 'inception' | 'birth'

export type TabId = 'overview' | 'info' | 'article' | 'images' | 'links'

export type EditIndicator = 'history' | 'talk'

export type ExternalLinkCategory = 'official' | 'social' | 'other'

export interface WikidataExternalLink {
  url: string
  displayText: string
  category: ExternalLinkCategory
}

export interface MusicalGroupSearchResult {
  id: string
  label: string
  description?: string
  thumbnailUrl?: string
}

export interface CarouselImage {
  url: string
  width: number
  height: number
  /** Canonical `File:` title on Wikimedia Commons. */
  title?: string
}

export interface MusicalGroupOverviewArticle {
  title: string
  extractHtml: string
  thumbnailUrl?: string
  articleUrl: string
  lastEditedTimestamp: string
  lastEditedLabel: string
  viewCount: number
  viewsLabel: string
  wordCount: number
  wordCountLabel: string
}

export interface MusicalGroupOverviewImages {
  itemCount: number
  itemCountLabel: string
}

export interface MusicalGroupOverviewRelated {
  id?: string
  title: string
  description: string
  thumbnailUrl?: string
  articleUrl: string
  lastEditedTimestamp: string
  lastEditedLabel: string
  viewCount: number
  viewsLabel: string
}

export interface MusicalGroupOverviewEditOpportunity {
  title: string
  body: string
  need: string
  score: number
}

export interface MusicalGroupInfoboxValue {
  text: string
  href?: string
}

export interface MusicalGroupInfoboxRow {
  label: string
  values: MusicalGroupInfoboxValue[]
  variant?: 'header' | 'row'
}

export interface MusicalGroupInfobox {
  rows: MusicalGroupInfoboxRow[]
}

export interface MusicalGroupOverviewData {
  article?: MusicalGroupOverviewArticle
  images?: MusicalGroupOverviewImages
  editOpportunity?: MusicalGroupOverviewEditOpportunity
  related?: MusicalGroupOverviewRelated
  infobox?: MusicalGroupInfobox
  noEnglishArticle?: boolean
  fetchedAt: number
}

export interface MusicalGroupData {
  id: string
  label: string
  isMusicPerformer: boolean
  isLocation: boolean
  description?: string
  typeLabel?: string
  inceptionYear?: number
  yearKind?: YearKind
  genres: string[]
  country?: string
  population?: number
  websiteUrl?: string
  websiteHost?: string
  images: CarouselImage[]
  editIndicator?: EditIndicator
  enwikiTitle?: string
  commonsCategory?: string
  /** Wikidata P18 filename, used to seed Commons image ordering. */
  imageFilename?: string
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}

/** True when the item has Commons photos worth a dedicated Images tab. */
export function hasImagesTab(data: MusicalGroupData): boolean {
  if (data.images.length > 0) return true
  if (data.imageFilename) return true
  if ((data.commonsImageCount ?? 0) > 0) return true
  return false
}

/** Featured "article of the day" card. */
export interface HomeFeatured {
  title: string
  enwikiTitle: string
  description: string
  thumbnailUrl?: string
  articleUrl: string
  itemId?: string
}

/** A "Did you know" hook from the daily featured feed. */
export interface HomeDidYouKnow {
  text: string
  enwikiTitle?: string
  title?: string
  thumbnailUrl?: string
  articleUrl?: string
  itemId?: string
}

/** A birthday entry from on-this-day births. */
export interface HomeBornOnThisDay {
  year: number
  text: string
  title: string
  enwikiTitle: string
  thumbnailUrl?: string
  articleUrl: string
  itemId?: string
}

export interface HomeFeaturedTab {
  article?: HomeFeatured
  didYouKnow: HomeDidYouKnow[]
  bornOnThisDay: HomeBornOnThisDay[]
}

/** A bookmarked item resolved to display + lookup metadata. */
export interface HomeSavedItem {
  id: string
  title: string
  enwikiTitle?: string
  description: string
  thumbnailUrl?: string
  savedAt: number
}

/** A "Help wanted" edit suggestion derived from a saved page. */
export interface HomeHelpWanted {
  itemId: string
  /** Suggestion label, e.g. "Find a reference". */
  suggestionLabel: string
  /** Article/page label. */
  title: string
  /** Suggestion copy. */
  body: string
  need: string
  thumbnailUrl?: string
}

/** A "Related reading" recommendation from a morelike query. */
export interface HomeRelated {
  title: string
  description: string
  thumbnailUrl?: string
  articleUrl: string
  itemId?: string
}

export type HomeRecentChangeFlag =
  | 'first-edit'
  | 'new-editor'
  | 'good-faith'
  | 'tone-issue'
  | 'high-revert-risk'
  | 'none'

/** The most recent change to a saved page, classified for review. */
export interface HomeRecentChange {
  enwikiTitle: string
  title: string
  editSummary: string
  thumbnailUrl?: string
  diffUrl: string
  flag: HomeRecentChangeFlag
}

export interface FetchMusicalGroupOptions {
  signal?: AbortSignal
}

export interface FetchMusicalGroupResult {
  data: MusicalGroupData
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}
