import { wikimediaApiFetchHeaders } from '@/config'

import { fetchWithTimeout } from './fetchWithTimeout'
import type { CarouselImage } from './types'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const THUMB_WIDTH = 800
const MAX_CAROUSEL_IMAGES = 5
const SEARCH_LIMIT = 20
/** How many candidate titles to resolve image details for in one request. */
const CANDIDATE_LIMIT = 30

export interface CommonsCategoryCount {
  /** Number of files directly in the category. */
  count: number
  /** Category has subcategories, so the direct count is a lower bound. */
  hasSubcats: boolean
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

interface ImageInfoPage {
  title?: string
  imageinfo?: Array<{ thumburl?: string; url?: string; thumbwidth?: number; thumbheight?: number }>
}

function imageFromPage(page: ImageInfoPage): CommonsImage | null {
  const info = page.imageinfo?.[0]
  const url = info?.thumburl ?? info?.url
  if (!page.title || !url) return null
  return {
    title: normalizeFileTitle(page.title),
    url,
    width: info?.thumbwidth ?? 0,
    height: info?.thumbheight ?? 0,
  }
}

/** Resolve url + size for a list of file titles, preserving the requested order. */
async function fetchImageDetails(titles: string[], signal?: AbortSignal): Promise<CommonsImage[]> {
  if (titles.length === 0) return []

  const data = (await commonsGet(
    {
      action: 'query',
      titles: titles.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size',
      iiurlwidth: String(THUMB_WIDTH),
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

/** Relevance-ordered file-title search across Commons. */
async function searchCommonsFiles(query: string, signal?: AbortSignal): Promise<string[]> {
  if (!query.trim()) return []

  const data = (await commonsGet(
    {
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: query,
      gsrlimit: String(SEARCH_LIMIT),
      gsrsort: 'relevance',
      prop: 'info',
    },
    signal,
  )) as { query?: { pages?: Record<string, { title?: string; index?: number }> } }

  // The search generator returns pages keyed arbitrarily; `index` preserves the
  // relevance ranking.
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => page.title)
    .filter((title): title is string => Boolean(title))
    .map(normalizeFileTitle)
}

/** Direct file members of a category (alphabetical) — a last-resort backfill. */
async function fetchCategoryMemberTitles(
  categoryName: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const data = (await commonsGet(
    {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${categoryName}`,
      cmtype: 'file',
      cmlimit: String(CANDIDATE_LIMIT),
    },
    signal,
  )) as { query?: { categorymembers?: Array<{ title?: string }> } }

  return (data.query?.categorymembers ?? [])
    .map((member) => member.title)
    .filter((title): title is string => Boolean(title))
    .map(normalizeFileTitle)
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
    count: info?.files ?? 0,
    hasSubcats: (info?.subcats ?? 0) > 0,
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
      .catch(() => ({ count: 0, hasSubcats: false }))
      .finally(() => {
        countInFlight.delete(key)
      })
    countInFlight.set(key, pending)
  }

  return pending
}

function formatItemCount(count: number, capped: boolean): string {
  if (capped) return `${count.toLocaleString()}+ items`
  return `${count.toLocaleString()} items`
}

export function formatCommonsItemCountLabel(count: number, capped = false): string {
  return formatItemCount(count, capped)
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
    images.push({
      url: candidate.url,
      width: candidate.width,
      height: candidate.height,
    })
  }

  return images
}

function escapeSearchTerm(value: string): string {
  return value.replace(/"/g, '')
}

export async function fetchCarouselImages({
  imageFilename,
  commonsCategory,
  label,
  signal,
}: FetchCarouselImagesOptions): Promise<FetchCarouselImagesResult> {
  const orderedTitles: string[] = []
  const seen = new Set<string>()

  function queue(title: string | null | undefined) {
    if (!title) return
    const normalized = normalizeFileTitle(title)
    if (seen.has(normalized)) return
    seen.add(normalized)
    orderedTitles.push(normalized)
  }

  // The Wikidata image (P18) is always the first, most representative slide.
  queue(imageFilename)

  const category = commonsCategory?.trim() ?? ''
  const labelQuery = label.trim()

  // We want enough candidates that ~5 reliably resolve to valid images.
  const enough = () => orderedTitles.length >= MAX_CAROUSEL_IMAGES + 1

  if (labelQuery) {
    // Relevance-ranked AND scoped to the group's category — the most relevant.
    if (category) {
      const inCategory = await searchCommonsFiles(
        `${labelQuery} incategory:"${escapeSearchTerm(category)}"`,
        signal,
      ).catch(() => [] as string[])
      inCategory.forEach(queue)
    }

    // Relevance-ranked across all of Commons — also catches images nested in
    // subcategories. Used when the in-category search is sparse.
    if (!enough()) {
      const relevant = await searchCommonsFiles(labelQuery, signal).catch(() => [] as string[])
      relevant.forEach(queue)
    }
  }

  // Last resort: plain category members (alphabetical) so we still show photos.
  if (category && !enough()) {
    const members = await fetchCategoryMemberTitles(category, signal).catch(() => [] as string[])
    members.forEach(queue)
  }

  const details = await fetchImageDetails(orderedTitles.slice(0, CANDIDATE_LIMIT), signal).catch(
    () => [] as CommonsImage[],
  )

  return {
    images: selectCarouselImages(details),
  }
}
