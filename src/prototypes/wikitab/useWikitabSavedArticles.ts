import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import {
  buildSavedArticleFromSearch,
  buildSavedChange,
  buildSavedImage,
  buildSavedItemFromPayload,
  buildSavedItemFromPayloadAsync,
  buildSavedSuggestion,
  savedIdFromPayload,
  saveItemPayloadNeedsFeaturedImageFetch,
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
import type { WikitabCardLoading } from './sections'

export interface SaveSearchArticleInput {
  title: string
  thumbnailUrl?: string
  description?: string
}

/** Full saved list for the home module snapshot (paging is handled in the section). */
export function snapshotSavedModuleItems(): WikitabSavedItem[] {
  return cloneSavedItems(loadWikitabConfig().savedItems)
}

function savedArticleNeedsSummary(saved: WikitabSavedArticleItem): boolean {
  return !saved.description || !saved.thumbnailUrl
}

/** Saved article cards in the home module never show a supporting row. */
export function savedModuleDisplayItems(items: WikitabSavedItem[]): WikitabSavedItem[] {
  return cloneSavedItems(items).map((saved) =>
    saved.type === 'article'
      ? {
          ...saved,
          supportingText: undefined,
          supportingHtml: undefined,
          supportingTextEnd: undefined,
        }
      : saved,
  )
}

/** Fields `enrichSavedModuleItems` will still fill for this item, or `false`. */
export function savedModuleItemPendingLoading(saved: WikitabSavedItem): WikitabCardLoading {
  if (saved.type !== 'article' || !savedArticleNeedsSummary(saved)) return false
  return {
    ...(saved.description ? {} : { description: true }),
    ...(saved.thumbnailUrl ? {} : { thumbnail: true }),
  }
}

/**
 * REST summary backfill for saved article items missing thumbnail/description.
 * `onItem` reports each article as soon as its own summary lands.
 */
export async function enrichSavedModuleItems(
  items: WikitabSavedItem[],
  signal?: AbortSignal,
  onItem?: (saved: WikitabSavedItem) => void,
): Promise<WikitabSavedItem[]> {
  const enriched = savedModuleDisplayItems(items)
  const indexById = new Map(enriched.map((saved, index) => [saved.id, index]))
  const pending = enriched.filter(
    (saved): saved is WikitabSavedArticleItem =>
      saved.type === 'article' && savedArticleNeedsSummary(saved),
  )
  if (!pending.length) return enriched

  await mapWithConcurrency(
    pending,
    2,
    async (saved) => {
      const summary = await fetchWikitabPageSummary(
        saved.articleTitle,
        signal,
        'wikitab-saved-module',
      )
      const index = indexById.get(saved.id)
      if (index === undefined) return

      const next: WikitabSavedArticleItem = {
        ...saved,
        description: saved.description ?? summary?.description,
        thumbnailUrl: saved.thumbnailUrl ?? summary?.thumbnailUrl,
      }
      enriched[index] = next
      if (!signal?.aborted) onItem?.(next)
    },
    signal,
  )

  return enriched
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
      supportingText: undefined,
      supportingHtml: undefined,
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

  async function toggleSaveFromPayload(payload: SaveItemPayload): Promise<void> {
    const idHint = savedIdFromPayload(payload)
    if (idHint && isSaved(idHint)) {
      unsaveItem(idHint)
      return
    }

    const built = saveItemPayloadNeedsFeaturedImageFetch(payload)
      ? await buildSavedItemFromPayloadAsync(payload)
      : buildSavedItemFromPayload(payload)
    if (!built) return
    if (isSaved(built.id)) {
      unsaveItem(built.id)
    } else {
      saveItem(built)
    }
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

  return {
    savedItems,
    isSaved,
    isCardSaved,
    saveItem,
    saveFromPayload,
    saveSearchArticle,
    saveSuggestion,
    saveChange,
    saveImage,
    unsaveItem,
    toggleSaveFromPayload,
    toggleSaveSearchArticle,
    toggleSaveSuggestion,
    toggleSaveChange,
    toggleSaveImage,
    persistEnrichedModuleItems,
  }
}
