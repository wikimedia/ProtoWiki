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
}

export interface FetchMusicalGroupOptions {
  signal?: AbortSignal
}
