import type { RouteMeta } from 'vue-router'

export type PageCategory = 'prototype' | 'template' | 'example'

export interface GalleryEntry {
  path: string
  title: string
  description?: string
  category: PageCategory
  order: number
  spotlight: boolean
}

export interface GalleryLayout {
  hidePrimary?: boolean
  hideSecondary?: boolean
}

export interface GallerySections {
  primary: GalleryEntry[]
  secondary: GalleryEntry[]
  showDivider: boolean
  spotlightActive: boolean
}

const CATEGORY_ORDER: Record<PageCategory, number> = {
  prototype: 0,
  template: 1,
  example: 2,
}

const CATEGORY_LABEL: Partial<Record<PageCategory, string>> = {
  template: 'Template',
  example: 'Example',
}

/** Strip an existing category prefix so meta titles stay unprefixed in source. */
export function stripCategoryPrefix(title: string): string {
  return title.replace(/^(prototype|template|example)\s*:\s*/i, '').trim()
}

export function formatGalleryTitle(category: PageCategory, title: string): string {
  const base = stripCategoryPrefix(title)
  const label = CATEGORY_LABEL[category]
  return label ? `${label}: ${base}` : base
}

/** Mechanical fallback when meta.title is omitted — not a substitute for human-written copy. */
export function deriveTitleFromPath(path: string): string {
  return path
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Top-level prototype only (src/prototypes/name/index.vue), not nested subfolder indexes. */
export function isTopLevelPrototypePath(path: string): boolean {
  const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
  return segments.length === 1
}

function resolveCategory(meta: RouteMeta): PageCategory {
  const category = meta.category
  if (category === 'template' || category === 'example') return category
  return 'prototype'
}

export function parseGalleryEntry(meta: RouteMeta, path: string): GalleryEntry {
  const description =
    typeof meta.description === 'string' && meta.description.length > 0
      ? meta.description
      : undefined
  const rawTitle = meta.title ?? deriveTitleFromPath(path)
  const order = typeof meta.order === 'number' ? meta.order : Number.POSITIVE_INFINITY
  const category = resolveCategory(meta)

  return {
    path,
    title: formatGalleryTitle(category, rawTitle),
    description,
    category,
    order,
    spotlight: meta.spotlight === true,
  }
}

export function compareGalleryEntries(a: GalleryEntry, b: GalleryEntry): number {
  const cmpCategory = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
  if (cmpCategory !== 0) return cmpCategory

  const cmpOrder = a.order - b.order
  if (cmpOrder !== 0) return cmpOrder

  return stripCategoryPrefix(a.title).localeCompare(
    stripCategoryPrefix(b.title),
    undefined,
    { sensitivity: 'base' },
  )
}

export function applySpotlightFilter(entries: GalleryEntry[]): {
  entries: GalleryEntry[]
  spotlightActive: boolean
} {
  const spotlightActive = entries.some((entry) => entry.spotlight)
  if (!spotlightActive) {
    return { entries, spotlightActive: false }
  }
  return {
    entries: entries.filter((entry) => entry.spotlight),
    spotlightActive: true,
  }
}

export function buildGallerySections(
  entries: GalleryEntry[],
  layout: GalleryLayout = {},
  spotlightActive = false,
): GallerySections {
  const primary = entries
    .filter((entry) => entry.category === 'prototype')
    .sort(compareGalleryEntries)
  const secondary = entries
    .filter((entry) => entry.category === 'template' || entry.category === 'example')
    .sort(compareGalleryEntries)

  const hidePrimary = layout.hidePrimary === true
  const hideSecondary = layout.hideSecondary === true

  const visiblePrimary = hidePrimary ? [] : primary
  const visibleSecondary = hideSecondary ? [] : secondary

  return {
    primary: visiblePrimary,
    secondary: visibleSecondary,
    showDivider: visiblePrimary.length > 0 && visibleSecondary.length > 0,
    spotlightActive,
  }
}
