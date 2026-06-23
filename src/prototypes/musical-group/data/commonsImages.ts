import type { CarouselImage, ImageOrientation } from './types'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const THUMB_WIDTH = 800

interface ImageDetails {
  url: string
  width: number
  height: number
}

interface CategoryBfsOptions {
  maxDepth?: number
  maxCategories?: number
  maxFiles?: number
  signal?: AbortSignal
}

function normalizeFileTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.startsWith('File:')) return trimmed
  return `File:${trimmed.replace(/^File:/i, '')}`
}

function stripFilePrefix(title: string): string {
  return title.replace(/^File:/i, '')
}

function classifyOrientation(width: number, height: number): ImageOrientation {
  if (width <= 0 || height <= 0) return 'landscape'
  const ratio = width / height
  if (ratio >= 1.25) return 'landscape'
  if (ratio >= 0.95 && ratio <= 1.05) return 'square'
  if (ratio >= 0.55) return 'portrait'
  return 'tall'
}

async function commonsGet(params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(COMMONS_API)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, { signal })
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

/** Files in category and all nested subcategories, search-ranked (relevance order). */
async function searchCommonsDeepCategory(categoryName: string, signal?: AbortSignal): Promise<string[]> {
  const data = (await commonsGet(
    {
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: `deepcat:"${categoryName.replace(/"/g, '')}"`,
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

async function fetchDirectCategoryFiles(categoryName: string, signal?: AbortSignal): Promise<string[]> {
  const data = (await commonsGet(
    {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${categoryName}`,
      cmtype: 'file',
      cmlimit: '50',
    },
    signal,
  )) as {
    query?: {
      categorymembers?: Array<{ title?: string }>
    }
  }

  return (data.query?.categorymembers ?? [])
    .map((member) => member.title)
    .filter((title): title is string => Boolean(title))
    .map(normalizeFileTitle)
}

async function fetchSubcategoryTitles(categoryName: string, signal?: AbortSignal): Promise<string[]> {
  const data = (await commonsGet(
    {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${categoryName}`,
      cmtype: 'subcat',
      cmlimit: '50',
    },
    signal,
  )) as {
    query?: {
      categorymembers?: Array<{ title?: string }>
    }
  }

  return (data.query?.categorymembers ?? [])
    .map((member) => member.title?.replace(/^Category:/i, '') ?? '')
    .filter(Boolean)
}

/** Walk nested subcategories and collect file titles (deduped, breadth-first). */
async function fetchCategoryFilesBfs(
  rootCategoryName: string,
  options: CategoryBfsOptions = {},
): Promise<string[]> {
  const { maxDepth = 5, maxCategories = 50, maxFiles = 100, signal } = options
  const seenCategories = new Set<string>()
  const seenFiles = new Set<string>()
  const orderedFiles: string[] = []

  type QueueItem = { name: string; depth: number }
  const queue: QueueItem[] = [{ name: rootCategoryName, depth: 0 }]

  while (queue.length > 0 && seenCategories.size < maxCategories && orderedFiles.length < maxFiles) {
    const item = queue.shift()
    if (!item) break

    const key = item.name.toLowerCase()
    if (seenCategories.has(key)) continue
    seenCategories.add(key)

    const files = await fetchDirectCategoryFiles(item.name, signal)
    for (const title of files) {
      const norm = normalizeFileTitle(title)
      if (seenFiles.has(norm)) continue
      seenFiles.add(norm)
      orderedFiles.push(norm)
      if (orderedFiles.length >= maxFiles) break
    }

    if (item.depth < maxDepth) {
      const subcats = await fetchSubcategoryTitles(item.name, signal)
      for (const sub of subcats) {
        queue.push({ name: sub, depth: item.depth + 1 })
      }
    }
  }

  return orderedFiles
}

/** deepcat list + set; BFS fallback if deepcat returns nothing. */
async function buildCategoryMembership(
  categoryName: string,
  signal?: AbortSignal,
): Promise<{ ordered: string[]; set: Set<string> }> {
  let ordered: string[] = []
  try {
    ordered = await searchCommonsDeepCategory(categoryName, signal)
  } catch {
    // fall through to BFS
  }

  if (ordered.length === 0) {
    ordered = await fetchCategoryFilesBfs(categoryName, {
      maxDepth: 5,
      maxCategories: 50,
      maxFiles: 100,
      signal,
    })
  } else {
    // Supplement deepcat with BFS files not already found (very deep nesting).
    const set = new Set(ordered.map(normalizeFileTitle))
    const bfsExtra = await fetchCategoryFilesBfs(categoryName, {
      maxDepth: 5,
      maxCategories: 50,
      maxFiles: 100,
      signal,
    })
    for (const title of bfsExtra) {
      const norm = normalizeFileTitle(title)
      if (!set.has(norm)) {
        set.add(norm)
        ordered.push(norm)
      }
    }
    return { ordered, set }
  }

  return { ordered, set: new Set(ordered.map(normalizeFileTitle)) }
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

  // P18 / first candidate always.
  selected.push(candidates[0])
  usedIndices.add(0)

  const orientations: ImageOrientation[] = ['landscape', 'square', 'portrait', 'tall']
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

export async function fetchCarouselImages({
  imageFilename,
  commonsCategory,
  label,
  signal,
}: FetchCarouselImagesOptions): Promise<CarouselImage[]> {
  const seen = new Set<string>()
  const relevanceOrder: string[] = []

  function queueTitle(title: string | null | undefined) {
    if (!title) return
    const normalized = normalizeFileTitle(title)
    if (seen.has(normalized)) return
    seen.add(normalized)
    relevanceOrder.push(normalized)
  }

  // 1. Wikidata P18 — always first.
  queueTitle(imageFilename ? stripFilePrefix(imageFilename) : null)

  let categoryMembership: { ordered: string[]; set: Set<string> } | null = null

  if (commonsCategory) {
    categoryMembership = await buildCategoryMembership(commonsCategory, signal)

    // 2. Label search hits cross-checked against full category tree (incl. deep subcats).
    if (label.trim()) {
      const labelHits = await searchCommonsFiles(label, signal)
      for (const title of labelHits) {
        if (categoryMembership.set.has(normalizeFileTitle(title))) {
          queueTitle(title)
        }
      }
    }

    // 3. deepcat-ranked files not already queued.
    for (const title of categoryMembership.ordered) {
      queueTitle(title)
    }

    // 4. Direct category members (may include files deepcat missed).
    const directFiles = await fetchDirectCategoryFiles(commonsCategory, signal)
    for (const title of directFiles) {
      queueTitle(title)
    }
  } else if (label.trim()) {
    // No Commons category — fall back to label search only.
    const labelHits = await searchCommonsFiles(label, signal)
    for (const title of labelHits) {
      queueTitle(title)
    }
  }

  if (relevanceOrder.length === 0) return []

  const detailsMap = await fetchImageDetails(relevanceOrder.slice(0, 30), signal)
  return selectCarouselImages(relevanceOrder, detailsMap, 5)
}
