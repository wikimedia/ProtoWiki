import type { RouteMeta } from 'vue-router'

import type { ConfigDevice, PrototypePlatform } from '@/config'

export type PageCategory = 'prototype' | 'template' | 'example'

export type GalleryTab = PageCategory

export const GALLERY_TABS: { value: GalleryTab; label: string }[] = [
  { value: 'prototype', label: 'Prototypes' },
  { value: 'template', label: 'Templates' },
  { value: 'example', label: 'Examples' },
]

export const DEFAULT_PROTOTYPE_PLATFORM: PrototypePlatform = 'web'

export interface GalleryEntry {
  path: string
  title: string
  description?: string
  supportingText?: string
  platform: PrototypePlatform
  platformLabel: string
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

const PLATFORM_LABEL: Record<PrototypePlatform, string> = {
  web: 'Web',
  app: 'App',
}

/** Strip an existing category prefix so meta titles stay unprefixed in source. */
export function stripCategoryPrefix(title: string): string {
  return title.replace(/^(prototype|template|example)\s*:\s*/i, '').trim()
}

export function getPlatformLabel(platform: PrototypePlatform): string {
  return PLATFORM_LABEL[platform]
}

export function getCategorySupportingText(category: PageCategory): string | undefined {
  return CATEGORY_LABEL[category]
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

export function resolvePlatform(meta: RouteMeta): PrototypePlatform {
  if (meta.platform === 'web' || meta.platform === 'app') return meta.platform
  return DEFAULT_PROTOTYPE_PLATFORM
}

export function matchesPlatform(meta: RouteMeta, device: ConfigDevice): boolean {
  return resolvePlatform(meta) === device
}

export function parseGalleryEntry(meta: RouteMeta, path: string): GalleryEntry {
  const description =
    typeof meta.description === 'string' && meta.description.length > 0
      ? meta.description
      : undefined
  const rawTitle = meta.title ?? deriveTitleFromPath(path)
  const order = typeof meta.order === 'number' ? meta.order : Number.POSITIVE_INFINITY
  const category = resolveCategory(meta)
  const platform = resolvePlatform(meta)

  return {
    path,
    title: stripCategoryPrefix(rawTitle),
    description,
    supportingText: getCategorySupportingText(category),
    platform,
    platformLabel: getPlatformLabel(platform),
    category,
    order,
    spotlight: meta.spotlight === true,
  }
}

export function compareGalleryEntries(a: GalleryEntry, b: GalleryEntry): number {
  const cmpOrder = a.order - b.order
  if (cmpOrder !== 0) return cmpOrder

  return stripCategoryPrefix(a.title).localeCompare(
    stripCategoryPrefix(b.title),
    undefined,
    { sensitivity: 'base' },
  )
}

export function compareGalleryEntriesByCategory(a: GalleryEntry, b: GalleryEntry): number {
  const cmpCategory = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
  if (cmpCategory !== 0) return cmpCategory

  return compareGalleryEntries(a, b)
}

export function filterGalleryEntriesByTab(
  entries: GalleryEntry[],
  tab: GalleryTab,
): GalleryEntry[] {
  return entries.filter((entry) => entry.category === tab).sort(compareGalleryEntries)
}

export function filterGalleryEntriesByCategory(
  entries: GalleryEntry[],
  category: PageCategory,
): GalleryEntry[] {
  return entries.filter((entry) => entry.category === category).sort(compareGalleryEntries)
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
    .sort(compareGalleryEntriesByCategory)
  const secondary = entries
    .filter((entry) => entry.category === 'template' || entry.category === 'example')
    .sort(compareGalleryEntriesByCategory)

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
