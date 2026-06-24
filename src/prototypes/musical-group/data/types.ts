export const MUSICAL_GROUP_QID = 'Q215380'

export type TabId = 'overview' | 'article' | 'photos' | 'links' | 'members' | 'awards'

export type EditIndicator = 'history' | 'talk'

export interface MusicalGroupSearchResult {
  id: string
  label: string
  description?: string
}

export type CarouselImageOrientation = 'landscape' | 'square' | 'portrait' | 'tall'

export interface CarouselImage {
  url: string
  orientation: CarouselImageOrientation
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

export interface MusicalGroupOverviewData {
  article?: MusicalGroupOverviewArticle
  photos?: MusicalGroupOverviewPhotos
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
