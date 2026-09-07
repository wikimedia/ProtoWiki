import { normalizeQid } from './wikidataApi'
import type {
  CarouselImage,
  EditIndicator,
  HomeRecentChange,
  HomeRecentChangeFlag,
  MusicalGroupData,
  MusicalGroupInfobox,
  MusicalGroupOverviewArticle,
  MusicalGroupOverviewData,
  MusicalGroupOverviewEditOpportunity,
  MusicalGroupOverviewImages,
  MusicalGroupOverviewRelated,
  WikidataExternalLink,
} from './types'

export const MUSICAL_GROUP_CACHE_VERSION = 39

const STORAGE_KEY = 'musical-group-page-cache'

export interface CachedCommonsPhotos {
  images: CarouselImage[]
  seenKeys: string[]
  hasMore: boolean
}

export interface CachedMusicalGroupEntry {
  version: number
  fetchedAt: number
  data: MusicalGroupData
  commonsImageCount?: number
  commonsImageCountCapped?: boolean
  overview?: MusicalGroupOverviewData
  externalLinks?: WikidataExternalLink[]
  articleHtml?: string
  commonsPhotos?: CachedCommonsPhotos
}

type MusicalGroupCacheStore = Record<string, CachedMusicalGroupEntry>

function cacheKey(id: string): string {
  return normalizeQid(id) ?? id.trim()
}

function isEditIndicator(value: unknown): value is EditIndicator {
  return value === 'history' || value === 'talk'
}

function isCarouselImage(value: unknown): value is CarouselImage {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Record<string, unknown>
  return (
    typeof record.url === 'string' &&
    typeof record.width === 'number' &&
    record.width > 0 &&
    typeof record.height === 'number' &&
    record.height > 0
  )
}

function isOverviewArticle(value: unknown): value is MusicalGroupOverviewArticle {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.title === 'string' &&
    typeof record.extractHtml === 'string' &&
    typeof record.articleUrl === 'string' &&
    typeof record.lastEditedTimestamp === 'string' &&
    typeof record.lastEditedLabel === 'string' &&
    typeof record.viewCount === 'number' &&
    typeof record.viewsLabel === 'string' &&
    typeof record.wordCount === 'number' &&
    typeof record.wordCountLabel === 'string' &&
    (record.thumbnailUrl === undefined || typeof record.thumbnailUrl === 'string')
  )
}

function isOverviewImages(value: unknown): value is MusicalGroupOverviewImages {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.itemCount === 'number' && typeof record.itemCountLabel === 'string'
}

function isOverviewRelated(value: unknown): value is MusicalGroupOverviewRelated {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.title === 'string' &&
    typeof record.description === 'string' &&
    (record.id === undefined || typeof record.id === 'string') &&
    typeof record.articleUrl === 'string' &&
    typeof record.lastEditedTimestamp === 'string' &&
    typeof record.lastEditedLabel === 'string' &&
    typeof record.viewCount === 'number' &&
    typeof record.viewsLabel === 'string' &&
    typeof record.relatedToTitle === 'string' &&
    (record.thumbnailUrl === undefined || typeof record.thumbnailUrl === 'string')
  )
}

function isOverviewEditOpportunity(value: unknown): value is MusicalGroupOverviewEditOpportunity {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.title === 'string' &&
    typeof record.body === 'string' &&
    typeof record.need === 'string' &&
    typeof record.score === 'number'
  )
}

function isHomeRecentChangeFlag(value: unknown): value is HomeRecentChangeFlag {
  return (
    value === 'first-edit' ||
    value === 'new-editor' ||
    value === 'good-faith' ||
    value === 'needs-reference' ||
    value === 'tone-issue' ||
    value === 'high-revert-risk' ||
    value === 'none'
  )
}

function isHomeRecentChange(value: unknown): value is HomeRecentChange {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.enwikiTitle === 'string' &&
    typeof record.title === 'string' &&
    typeof record.editSummary === 'string' &&
    typeof record.diffUrl === 'string' &&
    typeof record.revid === 'number' &&
    isHomeRecentChangeFlag(record.flag) &&
    typeof record.reverted === 'boolean' &&
    typeof record.isLatest === 'boolean' &&
    typeof record.editedTimestamp === 'string' &&
    typeof record.editedLabel === 'string' &&
    (record.thumbnailUrl === undefined || typeof record.thumbnailUrl === 'string')
  )
}

function isInfoboxValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.text !== 'string') return false
  return v.href === undefined || typeof v.href === 'string'
}

function isInfobox(value: unknown): value is MusicalGroupInfobox {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.rows)) return false
  return record.rows.every((row) => {
    if (typeof row !== 'object' || row === null) return false
    const r = row as Record<string, unknown>
    return (
      typeof r.label === 'string' &&
      Array.isArray(r.values) &&
      r.values.every(isInfoboxValue) &&
      (r.variant === undefined || r.variant === 'header' || r.variant === 'row')
    )
  })
}

function isOverviewData(value: unknown): value is MusicalGroupOverviewData {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (typeof record.fetchedAt !== 'number') return false
  if (record.noEnglishArticle !== undefined && typeof record.noEnglishArticle !== 'boolean') {
    return false
  }
  if (record.article !== undefined && !isOverviewArticle(record.article)) return false
  if (record.images !== undefined && !isOverviewImages(record.images)) return false
  if (record.editOpportunity !== undefined && !isOverviewEditOpportunity(record.editOpportunity)) {
    return false
  }
  if (record.related !== undefined && !isOverviewRelated(record.related)) return false
  if (record.latestEdit !== undefined && !isHomeRecentChange(record.latestEdit)) return false
  if (record.infobox !== undefined && !isInfobox(record.infobox)) return false
  return true
}

function isMusicalGroupData(value: unknown): value is MusicalGroupData {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || !record.id.length) return false
  if (typeof record.label !== 'string' || !record.label.length) return false
  if (typeof record.isMusicPerformer !== 'boolean') return false
  if (typeof record.isLocation !== 'boolean') return false
  if (typeof record.isPerson !== 'boolean') return false
  if (
    record.showImageCarousel !== undefined &&
    typeof record.showImageCarousel !== 'boolean'
  ) {
    return false
  }
  if (!Array.isArray(record.genres) || !record.genres.every((g) => typeof g === 'string')) {
    return false
  }
  if (!Array.isArray(record.images) || !record.images.every(isCarouselImage)) {
    return false
  }

  if (record.description !== undefined && typeof record.description !== 'string') return false
  if (record.typeLabel !== undefined && typeof record.typeLabel !== 'string') return false
  if (record.inceptionYear !== undefined && typeof record.inceptionYear !== 'number') return false
  if (
    record.yearKind !== undefined &&
    record.yearKind !== 'inception' &&
    record.yearKind !== 'birth'
  ) {
    return false
  }
  if (record.websiteUrl !== undefined && typeof record.websiteUrl !== 'string') return false
  if (record.websiteHost !== undefined && typeof record.websiteHost !== 'string') return false
  if (record.country !== undefined && typeof record.country !== 'string') return false
  if (record.population !== undefined && typeof record.population !== 'number') return false
  if (record.editIndicator !== undefined && !isEditIndicator(record.editIndicator)) return false
  if (record.enwikiTitle !== undefined && typeof record.enwikiTitle !== 'string') return false
  if (record.commonsCategory !== undefined && typeof record.commonsCategory !== 'string') return false
  if (record.imageFilename !== undefined && typeof record.imageFilename !== 'string') return false
  if (record.commonsImageCount !== undefined && typeof record.commonsImageCount !== 'number') {
    return false
  }
  if (
    record.commonsImageCountCapped !== undefined &&
    typeof record.commonsImageCountCapped !== 'boolean'
  ) {
    return false
  }

  return true
}

function isExternalLink(value: unknown): value is WikidataExternalLink {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.url === 'string' &&
    typeof record.displayText === 'string' &&
    (record.category === 'official' || record.category === 'social' || record.category === 'other')
  )
}

function isCommonsPhotos(value: unknown): value is CachedCommonsPhotos {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    Array.isArray(record.images) &&
    record.images.every(isCarouselImage) &&
    Array.isArray(record.seenKeys) &&
    record.seenKeys.every((key) => typeof key === 'string') &&
    typeof record.hasMore === 'boolean'
  )
}

function isValidEntry(entry: unknown): entry is CachedMusicalGroupEntry {
  if (typeof entry !== 'object' || entry === null) return false

  const record = entry as CachedMusicalGroupEntry
  if (record.version !== MUSICAL_GROUP_CACHE_VERSION) return false
  if (typeof record.fetchedAt !== 'number') return false
  if (!isMusicalGroupData(record.data)) return false
  if (record.commonsImageCount !== undefined && typeof record.commonsImageCount !== 'number') {
    return false
  }
  if (
    record.commonsImageCountCapped !== undefined &&
    typeof record.commonsImageCountCapped !== 'boolean'
  ) {
    return false
  }
  if (record.overview !== undefined && !isOverviewData(record.overview)) return false
  if (record.externalLinks !== undefined && !record.externalLinks.every(isExternalLink)) {
    return false
  }
  if (record.articleHtml !== undefined && typeof record.articleHtml !== 'string') return false
  if (record.commonsPhotos !== undefined && !isCommonsPhotos(record.commonsPhotos)) return false
  return true
}

function normalizeStore(raw: unknown): MusicalGroupCacheStore {
  if (typeof raw !== 'object' || raw === null) return {}

  const store: MusicalGroupCacheStore = {}

  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidEntry(entry)) continue

    const normalizedKey = cacheKey(entry.data.id) || cacheKey(key)
    if (!normalizedKey.length) continue

    const existing = store[normalizedKey]
    if (!existing || entry.fetchedAt >= existing.fetchedAt) {
      store[normalizedKey] = entry
    }
  }

  return store
}

function clearStoredCache(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

export function clearMusicalGroupCache(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.clear()
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function readRawStore(): { raw: unknown; corrupt: boolean } {
  if (typeof window === 'undefined') return { raw: null, corrupt: false }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { raw: null, corrupt: false }
    return { raw: JSON.parse(stored), corrupt: false }
  } catch {
    return { raw: null, corrupt: true }
  }
}

function readStore(): MusicalGroupCacheStore {
  const { raw, corrupt } = readRawStore()
  if (corrupt) {
    clearStoredCache()
    return {}
  }
  if (raw === null) return {}

  const normalized = normalizeStore(raw)
  if (JSON.stringify(normalized) !== JSON.stringify(raw)) {
    persistStore(normalized)
  }
  return normalized
}

function persistStore(store: MusicalGroupCacheStore): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeStore(store)

  try {
    if (Object.keys(normalized).length === 0) {
      clearStoredCache()
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function getCachedMusicalGroup(id: string): CachedMusicalGroupEntry | null {
  const key = cacheKey(id)
  if (!key.length) return null

  const store = readStore()
  return store[key] ?? null
}


export function setCachedMusicalGroup(
  id: string,
  data: MusicalGroupData,
): CachedMusicalGroupEntry {
  const key = cacheKey(id) || cacheKey(data.id)
  const store = readStore()
  const existing = key.length ? store[key] : undefined

  const entry: CachedMusicalGroupEntry = {
    version: MUSICAL_GROUP_CACHE_VERSION,
    fetchedAt: Date.now(),
    data,
    commonsImageCount: data.commonsImageCount ?? existing?.commonsImageCount,
    commonsImageCountCapped:
      data.commonsImageCountCapped ?? existing?.commonsImageCountCapped,
    overview: existing?.overview,
    externalLinks: existing?.externalLinks,
    articleHtml: existing?.articleHtml,
    commonsPhotos: existing?.commonsPhotos,
  }

  if (!key.length) return entry

  persistStore({ ...store, [key]: entry })
  return entry
}

export function setCachedMusicalGroupOverview(
  id: string,
  overview: MusicalGroupOverviewData,
): CachedMusicalGroupEntry | null {
  const key = cacheKey(id)
  if (!key.length) return null

  const store = readStore()
  const existing = store[key]
  if (!existing) return null

  const entry: CachedMusicalGroupEntry = {
    ...existing,
    overview,
  }

  persistStore({ ...store, [key]: entry })
  return entry
}

function updateCachedEntry(
  id: string,
  patch: Partial<
    Pick<
      CachedMusicalGroupEntry,
      'overview' | 'externalLinks' | 'articleHtml' | 'commonsPhotos'
    >
  >,
): CachedMusicalGroupEntry | null {
  const key = cacheKey(id)
  if (!key.length) return null

  const store = readStore()
  const existing = store[key]
  if (!existing) return null

  const entry: CachedMusicalGroupEntry = {
    ...existing,
    ...patch,
  }

  persistStore({ ...store, [key]: entry })
  return entry
}

export function setCachedMusicalGroupExternalLinks(
  id: string,
  externalLinks: WikidataExternalLink[],
): CachedMusicalGroupEntry | null {
  return updateCachedEntry(id, { externalLinks })
}

export function setCachedMusicalGroupArticleHtml(
  id: string,
  articleHtml: string,
): CachedMusicalGroupEntry | null {
  return updateCachedEntry(id, { articleHtml })
}

export function setCachedMusicalGroupCommonsPhotos(
  id: string,
  commonsPhotos: CachedCommonsPhotos,
): CachedMusicalGroupEntry | null {
  return updateCachedEntry(id, { commonsPhotos })
}
