import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'

import { fetchWikitabPageSummary } from './data/fetchWikitabPageSummary'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
  type WikitabSavedArticle,
} from './data/wikitabConfig'
import { articleTitleKey } from './data/wikitabHtml'

export interface SaveArticleInput {
  title: string
  thumbnailUrl?: string
  description?: string
}

function displayTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

/** Full saved list for the home module snapshot (paging is handled in the section). */
export function snapshotSavedModuleArticles(): WikitabSavedArticle[] {
  return loadWikitabConfig().savedArticles.map((article) => ({ ...article }))
}

/** REST `/page/summary/` for module slots missing description and/or thumbnail. */
export async function enrichSavedModuleArticles(
  articles: WikitabSavedArticle[],
  signal?: AbortSignal,
): Promise<WikitabSavedArticle[]> {
  const needsFetch = articles.filter((article) => !article.description || !article.thumbnailUrl)
  if (!needsFetch.length) return articles

  const enriched = articles.map((article) => ({ ...article }))
  const indexByKey = new Map(enriched.map((article, index) => [article.titleKey, index]))

  const patches = await mapWithConcurrency(
    needsFetch,
    2,
    async (article) => {
      const summary = await fetchWikitabPageSummary(article.title, signal, 'wikitab-saved-module')
      if (!summary) return null
      return {
        titleKey: article.titleKey,
        description: summary.description,
        thumbnailUrl: summary.thumbnailUrl,
      }
    },
    signal,
  )

  for (const patch of patches) {
    if (!patch) continue
    const index = indexByKey.get(patch.titleKey)
    if (index === undefined) continue
    enriched[index] = {
      ...enriched[index],
      description: enriched[index].description ?? patch.description,
      thumbnailUrl: enriched[index].thumbnailUrl ?? patch.thumbnailUrl,
    }
  }

  return enriched
}

function mergeMetadataIntoSavedArticles(enriched: WikitabSavedArticle[]): WikitabSavedArticle[] {
  const patchByKey = new Map(enriched.map((article) => [article.titleKey, article]))
  let changed = false

  const next = loadWikitabConfig().savedArticles.map((article) => {
    const patch = patchByKey.get(article.titleKey)
    if (!patch) return article

    const description = article.description ?? patch.description
    const thumbnailUrl = article.thumbnailUrl ?? patch.thumbnailUrl
    if (description === article.description && thumbnailUrl === article.thumbnailUrl) return article

    changed = true
    return { ...article, description, thumbnailUrl }
  })

  if (changed) patchWikitabConfig({ savedArticles: next })
  return next
}

export function useWikitabSavedArticles() {
  const savedArticles = ref<WikitabSavedArticle[]>(loadWikitabConfig().savedArticles)

  const savedKeySet = computed(() => new Set(savedArticles.value.map((article) => article.titleKey)))

  function syncFromStorage(): void {
    savedArticles.value = loadWikitabConfig().savedArticles
  }

  function isSaved(title: string): boolean {
    const key = articleTitleKey(title)
    return key ? savedKeySet.value.has(key) : false
  }

  function saveArticle(input: SaveArticleInput): void {
    const title = displayTitle(input.title)
    const titleKey = articleTitleKey(title)
    if (!titleKey) return

    const existing = savedArticles.value.find((article) => article.titleKey === titleKey)
    const next: WikitabSavedArticle = {
      titleKey,
      title,
      savedAt: Date.now(),
      thumbnailUrl: input.thumbnailUrl ?? existing?.thumbnailUrl,
      description: input.description ?? existing?.description,
    }

    savedArticles.value = [next, ...savedArticles.value.filter((article) => article.titleKey !== titleKey)]
    patchWikitabConfig({ savedArticles: savedArticles.value })
  }

  function unsaveArticle(title: string): void {
    const key = articleTitleKey(title)
    if (!key || !savedKeySet.value.has(key)) return

    savedArticles.value = savedArticles.value.filter((article) => article.titleKey !== key)
    patchWikitabConfig({ savedArticles: savedArticles.value })
  }

  function toggleSave(input: SaveArticleInput): void {
    if (isSaved(input.title)) {
      unsaveArticle(input.title)
    } else {
      saveArticle(input)
    }
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY) return
    syncFromStorage()
  }

  onMounted(() => {
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage)
  })

  function persistEnrichedModuleArticles(enriched: WikitabSavedArticle[]): void {
    savedArticles.value = mergeMetadataIntoSavedArticles(enriched)
  }

  return {
    savedArticles,
    isSaved,
    saveArticle,
    unsaveArticle,
    toggleSave,
    persistEnrichedModuleArticles,
  }
}
