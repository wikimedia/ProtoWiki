import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import {
  buildSavedArticleFromSearch,
  buildSavedChange,
  buildSavedImage,
  buildSavedItemFromPayload,
  buildSavedSuggestion,
  type SaveItemPayload,
} from './data/savedCardHelpers'
import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'
import { fetchWikitabPageSummary } from './data/fetchWikitabPageSummary'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import type { WikitabSearchContributeItem } from './data/fetchWikitabSearchContribute'
import {
  loadWikitabConfig,
  parseWikitabConfigJson,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
  type WikitabSavedArticleItem,
  type WikitabSavedItem,
} from './data/wikitabConfig'
import { cloneSavedItems } from './data/wikitabSavedItems'

export interface SaveSearchArticleInput {
  title: string
  thumbnailUrl?: string
  description?: string
}

/** Full saved list for the home module snapshot (paging is handled in the section). */
export function snapshotSavedModuleItems(): WikitabSavedItem[] {
  return cloneSavedItems(loadWikitabConfig().savedItems)
}

/** @deprecated Use snapshotSavedModuleItems */
export function snapshotSavedModuleCards(): WikitabSavedItem[] {
  return snapshotSavedModuleItems()
}

function searchItemNeedsSummary(saved: WikitabSavedArticleItem): boolean {
  if (!saved.id.startsWith('search:')) return false
  return !saved.description || !saved.thumbnailUrl
}

/** REST summary backfill for saved article items missing thumbnail/description. */
export async function enrichSavedModuleItems(
  items: WikitabSavedItem[],
  signal?: AbortSignal,
): Promise<WikitabSavedItem[]> {
  const articleItems = items.filter(
    (item): item is WikitabSavedArticleItem => item.type === 'article',
  )
  if (!articleItems.length) return items

  const enriched = cloneSavedItems(items)
  const indexById = new Map(enriched.map((saved, index) => [saved.id, index]))

  const patches = await mapWithConcurrency(
    articleItems,
    2,
    async (saved) => {
      const needsSummary = searchItemNeedsSummary(saved)
      if (!needsSummary) return { id: saved.id, description: undefined, thumbnailUrl: undefined }

      const summary = await fetchWikitabPageSummary(
        saved.articleTitle,
        signal,
        'wikitab-saved-module',
      )

      return {
        id: saved.id,
        description: summary?.description,
        thumbnailUrl: summary?.thumbnailUrl,
      }
    },
    signal,
  )

  for (const patch of patches) {
    const index = indexById.get(patch.id)
    if (index === undefined) continue
    const current = enriched[index]
    if (current.type !== 'article') continue

    enriched[index] = {
      ...current,
      description: current.description ?? patch.description,
      thumbnailUrl: current.thumbnailUrl ?? patch.thumbnailUrl,
      supportingSignals: undefined,
      supportingTextEnd: undefined,
    }
  }

  return enriched
}

/** @deprecated Use enrichSavedModuleItems */
export async function enrichSavedModuleCards(
  items: WikitabSavedItem[],
  signal?: AbortSignal,
): Promise<WikitabSavedItem[]> {
  return enrichSavedModuleItems(items, signal)
}

function mergeMetadataIntoSavedItems(
  enriched: WikitabSavedItem[],
  persistSavedItems: (items: WikitabSavedItem[], rollback: WikitabSavedItem[]) => boolean,
): void {
  const patchById = new Map(enriched.map((saved) => [saved.id, saved]))
  let changed = false

  const next = loadWikitabConfig().savedItems.map((saved) => {
    const patch = patchById.get(saved.id)
    if (!patch || saved.type !== 'article' || patch.type !== 'article') return saved

    const description = saved.description ?? patch.description
    const thumbnailUrl = saved.thumbnailUrl ?? patch.thumbnailUrl
    if (description === saved.description && thumbnailUrl === saved.thumbnailUrl) {
      return saved
    }

    changed = true
    return {
      ...saved,
      description,
      thumbnailUrl,
      supportingSignals: undefined,
      supportingTextEnd: undefined,
    }
  })

  if (!changed) return

  const rollback = cloneSavedItems(loadWikitabConfig().savedItems)
  persistSavedItems(next, rollback)
}

function prependSavedItem(
  items: WikitabSavedItem[],
  next: WikitabSavedItem,
): WikitabSavedItem[] {
  const existing = items.find((saved) => saved.id === next.id)
  if (existing) {
    next.savedAt = Date.now()
    if (next.type === 'article' && existing.type === 'article') {
      next.description = next.description ?? existing.description
      next.thumbnailUrl = next.thumbnailUrl ?? existing.thumbnailUrl
    }
    if (next.type === 'image' && existing.type === 'image') {
      next.description = next.description || existing.description
      next.thumbnailUrl = next.thumbnailUrl || existing.thumbnailUrl
      next.filePageUrl = next.filePageUrl || existing.filePageUrl
      next.licenseType = next.licenseType || existing.licenseType
      next.artistHtml = next.artistHtml || existing.artistHtml
    }
  }

  return [next, ...items.filter((saved) => saved.id !== next.id)]
}

export function useWikitabSavedArticles() {
  let lastAppliedRevision = 0

  const initialConfig = loadWikitabConfig()
  lastAppliedRevision = initialConfig.configRevision

  const savedItems = ref<WikitabSavedItem[]>(cloneSavedItems(initialConfig.savedItems))
  const savedCards = savedItems

  const savedIdSet = computed(() => new Set(savedItems.value.map((saved) => saved.id)))

  function syncFromStorage(items: WikitabSavedItem[]): void {
    savedItems.value = cloneSavedItems(items)
  }

  function persistSavedItems(
    items: WikitabSavedItem[],
    rollback: WikitabSavedItem[],
  ): boolean {
    const result = patchWikitabConfig({ savedItems: items })
    if (!result.persisted) {
      savedItems.value = rollback
      return false
    }
    lastAppliedRevision = result.config.configRevision
    savedItems.value = cloneSavedItems(result.config.savedItems)
    return true
  }

  function scheduleSavedItemsRetry(
    expected: WikitabSavedItem[],
    rollback: WikitabSavedItem[],
  ): void {
    queueMicrotask(() => {
      if (JSON.stringify(savedItems.value) !== JSON.stringify(expected)) return
      if (JSON.stringify(loadWikitabConfig().savedItems) === JSON.stringify(expected)) return
      if (!persistSavedItems(expected, rollback)) {
        savedItems.value = cloneSavedItems(loadWikitabConfig().savedItems)
      }
    })
  }

  function isSaved(id: string): boolean {
    return id ? savedIdSet.value.has(id) : false
  }

  /** @deprecated Use isSaved */
  function isCardSaved(id: string): boolean {
    return isSaved(id)
  }

  function saveItem(next: WikitabSavedItem): void {
    const rollback = cloneSavedItems(savedItems.value)
    const updated = prependSavedItem(savedItems.value, next)
    savedItems.value = updated

    if (!persistSavedItems(updated, rollback)) return
    scheduleSavedItemsRetry(updated, rollback)
  }

  function saveFromPayload(payload: SaveItemPayload): void {
    const next = buildSavedItemFromPayload(payload)
    if (!next) return
    saveItem(next)
  }

  function saveSearchArticle(input: SaveSearchArticleInput): void {
    const next = buildSavedArticleFromSearch(input)
    if (!next) return
    saveItem(next)
  }

  function saveSuggestion(item: WikitabSearchContributeItem): void {
    const next = buildSavedSuggestion(item)
    if (!next) return
    saveItem(next)
  }

  function saveChange(item: WikitabSearchActivityItem): void {
    const next = buildSavedChange(item)
    if (!next) return
    saveItem(next)
  }

  function saveImage(image: WikitabSearchImage): void {
    const next = buildSavedImage(image)
    if (!next) return
    saveItem(next)
  }

  function unsaveItem(id: string): void {
    if (!id || !savedIdSet.value.has(id)) return

    const rollback = cloneSavedItems(savedItems.value)
    const updated = savedItems.value.filter((saved) => saved.id !== id)
    savedItems.value = updated

    if (!persistSavedItems(updated, rollback)) return
    scheduleSavedItemsRetry(updated, rollback)
  }

  /** @deprecated Use unsaveItem */
  function unsaveCard(id: string): void {
    unsaveItem(id)
  }

  function toggleSaveFromPayload(payload: SaveItemPayload): void {
    const built = buildSavedItemFromPayload(payload)
    if (!built) return
    if (isSaved(built.id)) {
      unsaveItem(built.id)
    } else {
      saveItem(built)
    }
  }

  /** @deprecated Use toggleSaveFromPayload */
  function toggleSaveCard(payload: SaveItemPayload): void {
    toggleSaveFromPayload(payload)
  }

  function toggleSaveSearchArticle(input: SaveSearchArticleInput): void {
    const built = buildSavedArticleFromSearch(input)
    if (!built) return
    if (isSaved(built.id)) {
      unsaveItem(built.id)
    } else {
      saveSearchArticle(input)
    }
  }

  function toggleSaveSuggestion(item: WikitabSearchContributeItem): void {
    const built = buildSavedSuggestion(item)
    if (!built) return
    if (isSaved(built.id)) {
      unsaveItem(built.id)
    } else {
      saveSuggestion(item)
    }
  }

  function toggleSaveChange(item: WikitabSearchActivityItem): void {
    const built = buildSavedChange(item)
    if (!built) return
    if (isSaved(built.id)) {
      unsaveItem(built.id)
    } else {
      saveChange(item)
    }
  }

  function toggleSaveImage(image: WikitabSearchImage): void {
    const built = buildSavedImage(image)
    if (!built) return
    if (isSaved(built.id)) {
      unsaveItem(built.id)
    } else {
      saveImage(image)
    }
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY || !event.newValue) return

    try {
      const incoming = parseWikitabConfigJson(event.newValue)
      if (incoming.configRevision <= lastAppliedRevision) return
      lastAppliedRevision = incoming.configRevision
      syncFromStorage(incoming.savedItems)
    } catch {
      // ignore corrupt payloads
    }
  }

  onMounted(() => {
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage)
  })

  function persistEnrichedModuleItems(enriched: WikitabSavedItem[]): void {
    mergeMetadataIntoSavedItems(enriched, persistSavedItems)
  }

  /** @deprecated Use persistEnrichedModuleItems */
  function persistEnrichedModuleCards(enriched: WikitabSavedItem[]): void {
    persistEnrichedModuleItems(enriched)
  }

  return {
    savedItems,
    savedCards: savedItems,
    isSaved,
    isCardSaved,
    saveItem,
    saveFromPayload,
    saveSearchArticle,
    saveSuggestion,
    saveChange,
    saveImage,
    unsaveItem,
    unsaveCard,
    toggleSaveFromPayload,
    toggleSaveCard,
    toggleSaveSearchArticle,
    toggleSaveSuggestion,
    toggleSaveChange,
    toggleSaveImage,
    persistEnrichedModuleItems,
    persistEnrichedModuleCards,
  }
}
