/** Wikidata anchor classes for music performers (expanded via P31/P279* in SPARQL). */
export const MUSIC_PERFORMER_QIDS = [
  'Q215380', // musical group
  'Q639669', // musician
  'Q36834', // composer
  'Q177220', // singer
  'Q753110', // songwriter
] as const

export type YearKind = 'inception' | 'birth'

export const NOT_MUSIC_PERFORMER_ERROR = 'Not a music performer'

export type TabId = 'overview' | 'info' | 'article' | 'photos' | 'links' | 'members' | 'awards'

export type EditIndicator = 'history' | 'talk'

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

export interface MusicalGroupOverviewPhotos {
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
}

export interface MusicalGroupInfobox {
  rows: MusicalGroupInfoboxRow[]
}

export interface MusicalGroupOverviewData {
  article?: MusicalGroupOverviewArticle
  photos?: MusicalGroupOverviewPhotos
  editOpportunity?: MusicalGroupOverviewEditOpportunity
  related?: MusicalGroupOverviewRelated
  infobox?: MusicalGroupInfobox
  noEnglishArticle?: boolean
  fetchedAt: number
}

export interface MusicalGroupData {
  id: string
  label: string
  description?: string
  typeLabel?: string
  inceptionYear?: number
  yearKind?: YearKind
  genres: string[]
  websiteUrl?: string
  websiteHost?: string
  images: CarouselImage[]
  editIndicator?: EditIndicator
  enwikiTitle?: string
  commonsCategory?: string
}

export interface FetchMusicalGroupOptions {
  signal?: AbortSignal
}

export interface FetchMusicalGroupResult {
  data: MusicalGroupData
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
}
