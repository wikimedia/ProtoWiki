import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'
import type { CarouselImage } from './types'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const THUMB_WIDTH = 800
const GRID_THUMB_WIDTH = 320
const MAX_CAROUSEL_IMAGES = 5
const SEARCH_LIMIT = 20
const CATEGORY_MEMBER_LIMIT = 50
/** How many candidate titles to resolve image details for in one request. */
const CANDIDATE_LIMIT = 30
const BATCH_TITLE_LIMIT = 24
/** Images resolved per infinite-scroll batch in the photos grid. */
const GRID_BATCH_TITLE_LIMIT = 12

export interface CommonsCategoryCount {
  /** Number of files directly in the category. */
  files: number
  /** Number of top-level subcategories ("collections"). */
  subcats: number
}

interface CommonsImage {
  title: string
  url: string
  width: number
  height: number
}

const countInFlight = new Map<string, Promise<CommonsCategoryCount>>()
const countResolved = new Map<string, CommonsCategoryCount>()

export function clearCommonsImageCache(): void {
  countInFlight.clear()
  countResolved.clear()
}

function normalizeCategoryKey(name: string): string {
  return name.replace(/^Category:/i, '').trim().toLowerCase()
}

/**
 * Canonical `File:` title. MediaWiki treats spaces and underscores as
 * equivalent, so normalise underscores to spaces for reliable dedup + lookup
 * (e.g. matching a Wikidata P18 value against an API response title).
 */
function normalizeFileTitle(title: string): string {
  const withoutPrefix = title.trim().replace(/^File:/i, '').replace(/_/g, ' ').trim()
  return `File:${withoutPrefix}`
}

async function commonsGet(params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(COMMONS_API)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetchWithTimeout(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-commons'),
  })
  if (!response.ok) {
    throw new Error(`Commons API error: ${response.status}`)
  }
  return response.json()
}

interface ImageInfoEntry {
  thumburl?: string
  url?: string
  width?: number
  height?: number
  mime?: string
}

interface ImageInfoPage {
  title?: string
  imageinfo?: ImageInfoEntry[]
}

function isRasterImage(info: ImageInfoEntry): boolean {
  const mime = info.mime?.toLowerCase() ?? ''
  if (!mime.startsWith('image/')) return false
  return (info.width ?? 0) > 0 && (info.height ?? 0) > 0
}

function imageFromPage(page: ImageInfoPage): CommonsImage | null {
  const info = page.imageinfo?.[0]
  if (!page.title || !info || !isRasterImage(info)) return null

  const url = info.thumburl ?? info.url
  if (!url || url.includes('/file-type-icons/')) return null

  return {
    title: normalizeFileTitle(page.title),
    url,
    width: info.width ?? 0,
    height: info.height ?? 0,
  }
}

/** Resolve url + size for a list of file titles, preserving the requested order. */
async function fetchImageDetails(
  titles: string[],
  thumbWidth: number,
  signal?: AbortSignal,
): Promise<CommonsImage[]> {
  if (titles.length === 0) return []

  const data = (await commonsGet(
    {
      action: 'query',
      titles: titles.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: String(thumbWidth),
    },
    signal,
  )) as { query?: { pages?: Record<string, ImageInfoPage> } }

  const byTitle = new Map<string, CommonsImage>()
  for (const page of Object.values(data.query?.pages ?? {})) {
    const image = imageFromPage(page)
    if (image) byTitle.set(image.title, image)
  }

  return titles
    .map((title) => byTitle.get(normalizeFileTitle(title)))
    .filter((image): image is CommonsImage => Boolean(image))
}

interface SearchPageResult {
  titles: string[]
  nextOffset?: number
}

/** Relevance-ordered file-title search across Commons (one page). */
async function searchCommonsFilesPage(
  query: string,
  offset: number,
  signal?: AbortSignal,
): Promise<SearchPageResult> {
  if (!query.trim()) return { titles: [] }

  const params: Record<string, string> = {
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: query,
    gsrlimit: String(SEARCH_LIMIT),
    gsrsort: 'relevance',
    prop: 'info',
  }
  if (offset > 0) params.gsroffset = String(offset)

  const data = (await commonsGet(params, signal)) as {
    query?: { pages?: Record<string, { title?: string; index?: number }> }
    continue?: { gsroffset?: string }
  }

  const titles = Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => page.title)
    .filter((title): title is string => Boolean(title))
    .map(normalizeFileTitle)

  const nextOffset = data.continue?.gsroffset
    ? Number.parseInt(data.continue.gsroffset, 10)
    : undefined

  return { titles, nextOffset }
}

interface CategoryMembersPageResult {
  titles: string[]
  continueToken?: string
}

/** Direct file members of a category (alphabetical) — one page. */
async function fetchCategoryMemberTitlesPage(
  categoryName: string,
  continueToken?: string,
  signal?: AbortSignal,
): Promise<CategoryMembersPageResult> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${categoryName}`,
    cmtype: 'file',
    cmlimit: String(CATEGORY_MEMBER_LIMIT),
  }
  if (continueToken) params.cmcontinue = continueToken

  const data = (await commonsGet(params, signal)) as {
    query?: { categorymembers?: Array<{ title?: string }> }
    continue?: { cmcontinue?: string }
  }

  const titles = (data.query?.categorymembers ?? [])
    .map((member) => member.title)
    .filter((title): title is string => Boolean(title))
    .map(normalizeFileTitle)

  return {
    titles,
    continueToken: data.continue?.cmcontinue,
  }
}

async function resolveCommonsCategoryCount(
  categoryName: string,
  signal?: AbortSignal,
): Promise<CommonsCategoryCount> {
  const data = (await commonsGet(
    {
      action: 'query',
      prop: 'categoryinfo',
      titles: `Category:${categoryName}`,
    },
    signal,
  )) as { query?: { pages?: Record<string, { categoryinfo?: { files?: number; subcats?: number } }> } }

  const page = Object.values(data.query?.pages ?? {})[0]
  const info = page?.categoryinfo
  return {
    files: info?.files ?? 0,
    subcats: info?.subcats ?? 0,
  }
}

/** Memoized, fault-tolerant direct file count for a Commons category. */
export function getCommonsCategoryCount(
  categoryName: string,
  signal?: AbortSignal,
): Promise<CommonsCategoryCount> {
  const key = normalizeCategoryKey(categoryName)
  const cached = countResolved.get(key)
  if (cached) return Promise.resolve(cached)

  let pending = countInFlight.get(key)
  if (!pending) {
    pending = resolveCommonsCategoryCount(categoryName, signal)
      .then((result) => {
        countResolved.set(key, result)
        return result
      })
      .catch(() => ({ files: 0, subcats: 0 }))
      .finally(() => {
        countInFlight.delete(key)
      })
    countInFlight.set(key, pending)
  }

  return pending
}

/**
 * Photos count label. Categories with subcategories are described by their
 * top-level "collections" ("N+ collections"); flat categories show their direct
 * file count ("N items").
 */
export function formatCommonsPhotosLabel(files: number, subcats: number): string {
  if (subcats > 0) return `${subcats.toLocaleString()}+ collections`
  return `${files.toLocaleString()} ${files === 1 ? 'item' : 'items'}`
}

export function commonsImageCountFromCategory(
  info: CommonsCategoryCount,
): { count: number; capped: boolean } | undefined {
  if (info.files === 0 && info.subcats === 0) return undefined
  const capped = info.subcats > 0
  return {
    count: capped ? info.subcats : info.files,
    capped,
  }
}

export function formatCarouselOverflowCount(count: number, capped: boolean): string {
  return capped ? `${count.toLocaleString()}+` : count.toLocaleString()
}

/** P373 claim, else entity label — same fallback as the overview Images card. */
export function resolveCommonsCategory(data: {
  commonsCategory?: string
  label: string
}): string | undefined {
  const fromClaim = data.commonsCategory?.trim()
  if (fromClaim) return fromClaim
  const fromLabel = data.label.trim()
  return fromLabel.length ? fromLabel : undefined
}

export interface CommonsPhotosFeedSource {
  imageFilename: string | null
  commonsCategory: string | null
  label: string
}

export type CommonsPhotosFeedPhase =
  | 'inCategory'
  | 'deepCategory'
  | 'general'
  | 'categoryMembers'
  | 'done'

export interface CommonsPhotosFeedCursor {
  phase: CommonsPhotosFeedPhase
  /** Titles queued during cursor init, consumed before paginated phases. */
  bufferedTitles: string[]
  bufferedIndex: number
  inCategoryOffset: number
  deepCategoryOffset: number
  generalOffset: number
  categoryContinue?: string
  category: string
  labelQuery: string
  inCategoryQuery: string
  deepCategoryQuery: string
  generalQuery: string
  /** When true, skip unrestricted label search (Images tab — category files only). */
  categoryOnly: boolean
}

function escapeSearchTerm(value: string): string {
  return value.replace(/"/g, '')
}

function initialPhotosFeedPhase(
  category: string,
  labelQuery: string,
  inCategoryQuery: string,
  deepCategoryQuery: string,
  categoryOnly: boolean,
): CommonsPhotosFeedPhase {
  if (inCategoryQuery) return 'inCategory'
  if (!categoryOnly && labelQuery) return 'general'
  if (deepCategoryQuery) return 'deepCategory'
  if (category) return 'categoryMembers'
  return 'done'
}

export function createCommonsPhotosFeedCursor(
  source: CommonsPhotosFeedSource,
  options: { categoryOnly?: boolean } = {},
): CommonsPhotosFeedCursor {
  const categoryOnly = options.categoryOnly ?? false
  const category =
    resolveCommonsCategory({
      commonsCategory: source.commonsCategory ?? undefined,
      label: source.label,
    }) ?? ''
  const labelQuery = source.label.trim()
  const inCategoryQuery =
    category && labelQuery ? `${labelQuery} incategory:"${escapeSearchTerm(category)}"` : ''
  const deepCategoryQuery = category ? `deepcategory:"${escapeSearchTerm(category)}"` : ''

  const bufferedTitles: string[] = []
  if (source.imageFilename) {
    bufferedTitles.push(normalizeFileTitle(source.imageFilename))
  }

  return {
    phase: initialPhotosFeedPhase(
      category,
      labelQuery,
      inCategoryQuery,
      deepCategoryQuery,
      categoryOnly,
    ),
    bufferedTitles,
    bufferedIndex: 0,
    inCategoryOffset: 0,
    deepCategoryOffset: 0,
    generalOffset: 0,
    categoryContinue: undefined,
    category,
    labelQuery,
    inCategoryQuery,
    deepCategoryQuery,
    generalQuery: labelQuery,
    categoryOnly,
  }
}

function advancePhotosFeedPhase(cursor: CommonsPhotosFeedCursor): CommonsPhotosFeedPhase {
  if (cursor.phase === 'inCategory') {
    if (!cursor.categoryOnly && cursor.generalQuery) return 'general'
    if (cursor.deepCategoryQuery) return 'deepCategory'
    if (cursor.category) return 'categoryMembers'
    return 'done'
  }
  if (cursor.phase === 'general') {
    if (cursor.deepCategoryQuery) return 'deepCategory'
    if (cursor.category) return 'categoryMembers'
    return 'done'
  }
  return 'done'
}

function cursorHasPendingTitles(cursor: CommonsPhotosFeedCursor): boolean {
  return cursor.bufferedIndex < cursor.bufferedTitles.length || cursor.phase !== 'done'
}

async function pullCommonsPhotoTitles(
  cursor: CommonsPhotosFeedCursor,
  seenTitles: ReadonlySet<string>,
  count: number,
  signal?: AbortSignal,
): Promise<{ titles: string[]; cursor: CommonsPhotosFeedCursor }> {
  const titles: string[] = []
  const batchSeen = new Set<string>()
  let next = { ...cursor }

  function tryQueue(title: string) {
    const normalized = normalizeFileTitle(title)
    if (seenTitles.has(normalized) || batchSeen.has(normalized)) return
    batchSeen.add(normalized)
    titles.push(normalized)
  }

  while (titles.length < count && cursorHasPendingTitles(next)) {
    while (next.bufferedIndex < next.bufferedTitles.length && titles.length < count) {
      tryQueue(next.bufferedTitles[next.bufferedIndex])
      next = { ...next, bufferedIndex: next.bufferedIndex + 1 }
    }

    if (titles.length >= count) break
    if (next.phase === 'done') break

    if (next.phase === 'inCategory') {
      const page = await searchCommonsFilesPage(next.inCategoryQuery, next.inCategoryOffset, signal)
      for (const title of page.titles) tryQueue(title)
      if (page.nextOffset !== undefined) {
        next = { ...next, inCategoryOffset: page.nextOffset }
      } else {
        next = { ...next, phase: advancePhotosFeedPhase(next) }
      }
      continue
    }

    if (next.phase === 'general') {
      const page = await searchCommonsFilesPage(next.generalQuery, next.generalOffset, signal)
      for (const title of page.titles) tryQueue(title)
      if (page.nextOffset !== undefined) {
        next = { ...next, generalOffset: page.nextOffset }
      } else {
        next = { ...next, phase: advancePhotosFeedPhase(next) }
      }
      continue
    }

    if (next.phase === 'deepCategory') {
      const page = await searchCommonsFilesPage(
        next.deepCategoryQuery,
        next.deepCategoryOffset,
        signal,
      )
      for (const title of page.titles) tryQueue(title)
      if (page.nextOffset !== undefined) {
        next = { ...next, deepCategoryOffset: page.nextOffset }
      } else {
        next = { ...next, phase: 'done' }
      }
      continue
    }

    if (next.phase === 'categoryMembers') {
      const page = await fetchCategoryMemberTitlesPage(
        next.category,
        next.categoryContinue,
        signal,
      )
      for (const title of page.titles) tryQueue(title)
      if (page.continueToken) {
        next = { ...next, categoryContinue: page.continueToken }
      } else {
        next = { ...next, phase: 'done' }
      }
    }
  }

  return { titles, cursor: next }
}

function commonsImageToCarousel(image: CommonsImage): CarouselImage {
  return {
    url: image.url,
    width: image.width,
    height: image.height,
    title: image.title,
  }
}

export interface FetchCommonsPhotosBatchOptions {
  seenTitles: ReadonlySet<string>
  thumbWidth?: number
  batchTitleLimit?: number
  signal?: AbortSignal
}

export interface FetchCommonsPhotosBatchResult {
  images: CarouselImage[]
  cursor: CommonsPhotosFeedCursor
  hasMore: boolean
}

export async function fetchCommonsPhotosBatch(
  source: CommonsPhotosFeedSource,
  cursor: CommonsPhotosFeedCursor,
  options: FetchCommonsPhotosBatchOptions,
): Promise<FetchCommonsPhotosBatchResult> {
  const {
    seenTitles,
    thumbWidth = GRID_THUMB_WIDTH,
    batchTitleLimit = GRID_BATCH_TITLE_LIMIT,
    signal,
  } = options

  if (!cursorHasPendingTitles(cursor)) {
    return { images: [], cursor, hasMore: false }
  }

  const { titles, cursor: nextCursor } = await pullCommonsPhotoTitles(
    cursor,
    seenTitles,
    batchTitleLimit,
    signal,
  )

  if (titles.length === 0) {
    return {
      images: [],
      cursor: nextCursor,
      hasMore: cursorHasPendingTitles(nextCursor),
    }
  }

  const details = await fetchImageDetails(titles, thumbWidth, signal).catch(() => [] as CommonsImage[])

  const images = details.map(commonsImageToCarousel)

  return {
    images,
    cursor: nextCursor,
    hasMore: cursorHasPendingTitles(nextCursor),
  }
}

export interface FetchCarouselImagesOptions {
  imageFilename: string | null
  commonsCategory: string | null
  label: string
  signal?: AbortSignal
}

export interface FetchCarouselImagesResult {
  images: CarouselImage[]
}

function selectCarouselImages(candidates: CommonsImage[]): CarouselImage[] {
  const images: CarouselImage[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    if (images.length >= MAX_CAROUSEL_IMAGES) break
    if (candidate.width <= 0 || candidate.height <= 0) continue
    if (seen.has(candidate.title)) continue
    seen.add(candidate.title)
    images.push(commonsImageToCarousel(candidate))
  }

  return images
}

export async function fetchCarouselImages({
  imageFilename,
  commonsCategory,
  label,
  signal,
}: FetchCarouselImagesOptions): Promise<FetchCarouselImagesResult> {
  const source: CommonsPhotosFeedSource = { imageFilename, commonsCategory, label }
  let cursor = createCommonsPhotosFeedCursor(source)
  const seen = new Set<string>()
  const candidates: CommonsImage[] = []

  while (candidates.length < CANDIDATE_LIMIT) {
    const batch = await fetchCommonsPhotosBatch(source, cursor, {
      seenTitles: seen,
      thumbWidth: THUMB_WIDTH,
      batchTitleLimit: BATCH_TITLE_LIMIT,
      signal,
    })
    cursor = batch.cursor

    for (const image of batch.images) {
      if (!image.title || seen.has(image.title)) continue
      seen.add(image.title)
      candidates.push({
        title: image.title,
        url: image.url,
        width: image.width,
        height: image.height,
      })
      if (candidates.length >= CANDIDATE_LIMIT) break
    }

    if (!batch.hasMore) break
  }

  return {
    images: selectCarouselImages(candidates),
  }
}

/** Build a Commons file page URL from a canonical `File:` title. */
export function commonsFilePageUrl(title: string): string {
  const name = title.replace(/^File:/i, '').trim().replace(/ /g, '_')
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name)}`
}

/** Stable dedupe key for a carousel/grid image (title, or parsed from Commons URL). */
export function carouselImageDedupeKey(image: CarouselImage): string {
  if (image.title) return normalizeFileTitle(image.title)

  try {
    const decoded = decodeURIComponent(image.url)
    const thumbMatch = decoded.match(/\/commons\/thumb\/(?:[^/]+\/){2}([^/]+)\/\d+px-/i)
    if (thumbMatch) return normalizeFileTitle(`File:${thumbMatch[1]}`)

    const fileMatch = decoded.match(/\/commons\/([a-f0-9]\/[a-f0-9]{2}\/[^/?#]+)/i)
    if (fileMatch) {
      const filename = fileMatch[1].split('/').pop() ?? fileMatch[1]
      return normalizeFileTitle(`File:${filename}`)
    }
  } catch {
    // decodeURIComponent can throw on malformed URLs
  }

  return image.url
}

export { GRID_THUMB_WIDTH, MAX_CAROUSEL_IMAGES, normalizeFileTitle }
