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

export function hasImagesTab(data: MusicalGroupData): boolean {
  return data.isMusicPerformer || data.isLocation
}

export interface FetchMusicalGroupOptions {
  signal?: AbortSignal
}

export interface FetchMusicalGroupResult {
  data: MusicalGroupData
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}
