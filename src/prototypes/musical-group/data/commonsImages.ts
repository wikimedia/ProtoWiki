import { wikimediaApiFetchHeaders } from '@/config'

import type { CarouselImage, CarouselImageOrientation } from './types'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const THUMB_WIDTH = 800
const DEEPCAT_PAGE_SIZE = 500
const CATEGORY_PAGE_SIZE = 500
const MAX_CATEGORY_FILES = 10_000

export interface CommonsCategoryFiles {
  ordered: string[]
  totalCount: number
  capped: boolean
}

interface ImageDetails {
  url: string
  width: number
  height: number
}

interface CategoryBfsOptions {
  maxDepth?: number
  maxCategories?: number
  signal?: AbortSignal
}

const categoryInFlight = new Map<string, Promise<CommonsCategoryFiles>>()
const categoryResolved = new Map<string, CommonsCategoryFiles>()

function normalizeCategoryKey(name: string): string {
  return name.replace(/^Category:/i, '').trim().toLowerCase()
}

function normalizeFileTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.startsWith('File:')) return trimmed
  return `File:${trimmed.replace(/^File:/i, '')}`
}

function stripFilePrefix(title: string): string {
  return title.replace(/^File:/i, '')
}

function classifyOrientation(width: number, height: number): CarouselImageOrientation {
  if (width <= 0 || height <= 0) return 'landscape'
  const ratio = width / height
  if (ratio >= 1.25) return 'landscape'
  if (ratio >= 0.95 && ratio <= 1.05) return 'square'
  if (ratio >= 0.55) return 'portrait'
  return 'tall'
}

function mergeContinueParams(
  base: Record<string, string>,
  continueBlock: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!continueBlock) return base
  const merged = { ...base }
  for (const [key, value] of Object.entries(continueBlock)) {
    if (typeof value === 'string') merged[key] = value
  }
  return merged
}

async function commonsGet(params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(COMMONS_API)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    signal,
    headers: wikimediaApiFetchHeaders('musical-group-commons'),
  })
  if (!response.ok) {
    throw new Error(`Commons API error: ${response.status}`)
  }
  return response.json()
}

async function fetchImageDetails(titles: string[], signal?: AbortSignal): Promise<Map<string, ImageDetails>> {
  const map = new Map<string, ImageDetails>()
  if (titles.length === 0) return map

  const data = (await commonsGet(
    {
      action: 'query',
      titles: titles.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size',
      iiurlwidth: String(THUMB_WIDTH),
    },
    signal,
  )) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string
          imageinfo?: Array<{ thumburl?: string; url?: string; thumbwidth?: number; thumbheight?: number }>
        }
      >
    }
  }

  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0]
    const url = info?.thumburl ?? info?.url
    if (!page.title || !url) continue
    map.set(normalizeFileTitle(page.title), {
      url,
      width: info?.thumbwidth ?? 0,
      height: info?.thumbheight ?? 0,
    })
  }

  return map
}

async function searchCommonsFiles(query: string, signal?: AbortSignal): Promise<string[]> {
  const data = (await commonsGet(
    {
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: query,
      gsrlimit: '50',
      prop: 'info',
    },
    signal,
  )) as {
    query?: {
      pages?: Record<string, { title?: string }>
    }
  }

  return Object.values(data.query?.pages ?? {})
    .map((page) => page.title)
    .filter((title): title is string => Boolean(title))
    .map(normalizeFileTitle)
}

function addFileTitle(
  ordered: string[],
  seen: Set<string>,
  title: string,
): boolean {
  const norm = normalizeFileTitle(title)
  if (seen.has(norm)) return false
  seen.add(norm)
  ordered.push(norm)
  return true
}

/** Paginated deepcat file search — recursive category membership. */
async function enumerateDeepcatFiles(
  categoryName: string,
  ordered: string[],
  seen: Set<string>,
  signal?: AbortSignal,
): Promise<{ capped: boolean }> {
  const escaped = categoryName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  let continueBlock: Record<string, unknown> | undefined
  let capped = false

  do {
    const params = mergeContinueParams(
      {
        action: 'query',
        generator: 'search',
        gsrnamespace: '6',
        gsrsearch: `deepcat:"${escaped}"`,
        gsrlimit: String(DEEPCAT_PAGE_SIZE),
        prop: 'info',
      },
      continueBlock,
    )

    const data = (await commonsGet(params, signal)) as {
      query?: { pages?: Record<string, { title?: string }> }
      continue?: Record<string, unknown>
    }

    for (const page of Object.values(data.query?.pages ?? {})) {
      if (!page.title) continue
      addFileTitle(ordered, seen, page.title)
      if (seen.size >= MAX_CATEGORY_FILES) {
        capped = true
        return { capped }
      }
    }

    continueBlock = data.continue
  } while (continueBlock)

  return { capped }
}

async function fetchDirectCategoryFilesPage(
  categoryName: string,
  continueToken: string | undefined,
  signal?: AbortSignal,
): Promise<{ titles: string[]; nextContinue?: string }> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${categoryName}`,
    cmtype: 'file',
    cmlimit: String(CATEGORY_PAGE_SIZE),
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

  return { titles, nextContinue: data.continue?.cmcontinue }
}

async function fetchSubcategoryTitlesPage(
  categoryName: string,
  continueToken: string | undefined,
  signal?: AbortSignal,
): Promise<{ titles: string[]; nextContinue?: string }> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${categoryName}`,
    cmtype: 'subcat',
    cmlimit: String(CATEGORY_PAGE_SIZE),
  }
  if (continueToken) params.cmcontinue = continueToken

  const data = (await commonsGet(params, signal)) as {
    query?: { categorymembers?: Array<{ title?: string }> }
    continue?: { cmcontinue?: string }
  }

  const titles = (data.query?.categorymembers ?? [])
    .map((member) => member.title?.replace(/^Category:/i, '') ?? '')
    .filter(Boolean)

  return { titles, nextContinue: data.continue?.cmcontinue }
}

async function enumerateCategoryFilesPaginated(
  categoryName: string,
  ordered: string[],
  seen: Set<string>,
  signal?: AbortSignal,
): Promise<{ capped: boolean }> {
  let cmcontinue: string | undefined
  let capped = false

  do {
    const page = await fetchDirectCategoryFilesPage(categoryName, cmcontinue, signal)
    for (const title of page.titles) {
      addFileTitle(ordered, seen, title)
      if (seen.size >= MAX_CATEGORY_FILES) {
        capped = true
        return { capped }
      }
    }
    cmcontinue = page.nextContinue
  } while (cmcontinue)

  return { capped }
}

/** Walk nested subcategories and collect file titles (deduped, breadth-first). */
async function fetchCategoryFilesBfs(
  rootCategoryName: string,
  ordered: string[],
  seen: Set<string>,
  options: CategoryBfsOptions = {},
): Promise<{ capped: boolean }> {
  const { maxDepth = 5, maxCategories = 200, signal } = options
  const seenCategories = new Set<string>()
  let capped = false

  type QueueItem = { name: string; depth: number }
  const queue: QueueItem[] = [{ name: rootCategoryName, depth: 0 }]

  while (queue.length > 0 && seenCategories.size < maxCategories) {
    const item = queue.shift()
    if (!item) break

    const key = item.name.toLowerCase()
    if (seenCategories.has(key)) continue
    seenCategories.add(key)

    const direct = await enumerateCategoryFilesPaginated(item.name, ordered, seen, signal)
    if (direct.capped) return { capped: true }

    if (seen.size >= MAX_CATEGORY_FILES) {
      capped = true
      return { capped }
    }

    if (item.depth < maxDepth) {
      let subContinue: string | undefined
      do {
        const subPage = await fetchSubcategoryTitlesPage(item.name, subContinue, signal)
        for (const sub of subPage.titles) {
          queue.push({ name: sub, depth: item.depth + 1 })
        }
        subContinue = subPage.nextContinue
      } while (subContinue)
    }
  }

  return { capped }
}

async function resolveCommonsCategoryFiles(
  categoryName: string,
  signal?: AbortSignal,
): Promise<CommonsCategoryFiles> {
  const ordered: string[] = []
  const seen = new Set<string>()
  let capped = false

  try {
    const deepcat = await enumerateDeepcatFiles(categoryName, ordered, seen, signal)
    capped = deepcat.capped
  } catch {
    // fall through to BFS
  }

  if (ordered.length === 0) {
    const bfs = await fetchCategoryFilesBfs(categoryName, ordered, seen, { signal })
    capped = bfs.capped
  }

  await enumerateCategoryFilesPaginated(categoryName, ordered, seen, signal)

  return {
    ordered,
    totalCount: seen.size,
    capped,
  }
}

export function getCommonsCategoryFiles(
  categoryName: string,
  signal?: AbortSignal,
): Promise<CommonsCategoryFiles> {
  const key = normalizeCategoryKey(categoryName)
  const cached = categoryResolved.get(key)
  if (cached) return Promise.resolve(cached)

  let pending = categoryInFlight.get(key)
  if (!pending) {
    pending = resolveCommonsCategoryFiles(categoryName, signal)
      .then((result) => {
        categoryResolved.set(key, result)
        return result
      })
      .finally(() => {
        categoryInFlight.delete(key)
      })
    categoryInFlight.set(key, pending)
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

/**
 * Pick carousel images: P18 first, then highest-relevance titles while
 * preferring one of each orientation from the earliest (most relevant) match.
 */
function selectCarouselImages(
  relevanceOrderedTitles: string[],
  detailsMap: Map<string, ImageDetails>,
  maxImages: number,
): CarouselImage[] {
  const candidates: CarouselImage[] = []
  for (const title of relevanceOrderedTitles) {
    const details = detailsMap.get(normalizeFileTitle(title))
    if (!details) continue
    candidates.push({
      url: details.url,
      orientation: classifyOrientation(details.width, details.height),
    })
  }

  if (candidates.length === 0) return []
  if (candidates.length <= maxImages) return candidates

  const selected: CarouselImage[] = []
  const usedIndices = new Set<number>()

  selected.push(candidates[0])
  usedIndices.add(0)

  const orientations: CarouselImageOrientation[] = ['landscape', 'square', 'portrait', 'tall']
  for (const orientation of orientations) {
    if (selected.length >= maxImages) break
    const idx = candidates.findIndex((c, i) => !usedIndices.has(i) && c.orientation === orientation)
    if (idx >= 0) {
      selected.push(candidates[idx])
      usedIndices.add(idx)
    }
  }

  for (let i = 0; i < candidates.length && selected.length < maxImages; i++) {
    if (usedIndices.has(i)) continue
    selected.push(candidates[i])
    usedIndices.add(i)
  }

  return selected
}

export interface FetchCarouselImagesOptions {
  imageFilename: string | null
  commonsCategory: string | null
  label: string
  signal?: AbortSignal
}

export interface FetchCarouselImagesResult {
  images: CarouselImage[]
  totalCount?: number
  itemCountCapped?: boolean
}

export async function fetchCarouselImages({
  imageFilename,
  commonsCategory,
  label,
  signal,
}: FetchCarouselImagesOptions): Promise<FetchCarouselImagesResult> {
  const seen = new Set<string>()
  const relevanceOrder: string[] = []

  function queueTitle(title: string | null | undefined) {
    if (!title) return
    const normalized = normalizeFileTitle(title)
    if (seen.has(normalized)) return
    seen.add(normalized)
    relevanceOrder.push(normalized)
  }

  queueTitle(imageFilename ? stripFilePrefix(imageFilename) : null)

  let totalCount: number | undefined
  let itemCountCapped = false

  if (commonsCategory) {
    const membership = await getCommonsCategoryFiles(commonsCategory, signal)
    totalCount = membership.totalCount
    itemCountCapped = membership.capped

    if (label.trim()) {
      const labelHits = await searchCommonsFiles(label, signal)
      for (const title of labelHits) {
        if (membership.ordered.some((t) => normalizeFileTitle(t) === normalizeFileTitle(title))) {
          queueTitle(title)
        }
      }
    }

    for (const title of membership.ordered) {
      queueTitle(title)
    }
  } else if (label.trim()) {
    const labelHits = await searchCommonsFiles(label, signal)
    for (const title of labelHits) {
      queueTitle(title)
    }
  }

  if (relevanceOrder.length === 0) {
    return { images: [], totalCount, itemCountCapped }
  }

  const detailsMap = await fetchImageDetails(relevanceOrder.slice(0, 30), signal)
  const images = selectCarouselImages(relevanceOrder, detailsMap, 5)

  return { images, totalCount, itemCountCapped }
}
