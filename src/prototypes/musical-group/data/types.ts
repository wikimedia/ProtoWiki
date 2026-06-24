export const MUSICAL_GROUP_QID = 'Q215380'

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
