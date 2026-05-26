import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import { wikiHostFromLang } from '@/lib/config'
import {
  fetchPagePreviewMetadataBatch,
  type PagePreviewMetadata,
} from '@/lib/fetchUserEditedPageTitles'
import {
  FetchMicrotaskCategorySuggestionsError,
  fetchMicrotaskCategorySuggestions,
} from '@/lib/fetchMicrotaskCategorySuggestions'
import {
  FetchMicrotaskRelatedArticlesError,
  fetchMicrotaskRelatedArticles,
} from '@/lib/fetchMicrotaskRelatedArticles'

const LANG = 'en'
const INITIAL_LIMIT_PER_CATEGORY = 10
const LIMIT_INCREMENT = 10
const MAX_LIMIT_PER_CATEGORY = 50

function wikiArticleUrl(title: string, lang = LANG): string {
  const slug = encodeURIComponent(title.trim().replace(/ /g, '_'))
  return `https://${wikiHostFromLang(lang)}/wiki/${slug}`
}

function normalizeTitleKey(title: string): string {
  return title.trim().replace(/_/g, ' ').toLowerCase()
}

/** Round-robin merge of category lists with deduplication. */
function mixArticleTitles(
  categories: string[],
  byCategory: Record<string, string[]>,
): string[] {
  const lists = categories.map((category) => byCategory[category] ?? [])
  const mixed: string[] = []
  const seen = new Set<string>()
  let index = 0
  let hasMore = true

  while (hasMore) {
    hasMore = false
    for (const list of lists) {
      if (index >= list.length) continue
      hasMore = true
      const title = list[index]
      const key = normalizeTitleKey(title)
      if (!seen.has(key)) {
        seen.add(key)
        mixed.push(title)
      }
    }
    index += 1
  }

  return mixed
}

function errorMessage(error: unknown): string {
  if (error instanceof FetchMicrotaskCategorySuggestionsError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof FetchMicrotaskRelatedArticlesError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Try again.'
}

export function useTopicPicker(): {
  topic: Ref<string>
  categorySuggestions: Ref<string[]>
  selectedCategories: Ref<string[]>
  previewsByTitle: Ref<Record<string, PagePreviewMetadata>>
  loadingCategories: Ref<boolean>
  loadingArticles: Ref<boolean>
  loadingMore: Ref<boolean>
  categoryError: Ref<string | null>
  articlesError: Ref<string | null>
  hasCategoryResults: ComputedRef<boolean>
  hasLoadedArticles: Ref<boolean>
  mixedArticleTitles: ComputedRef<string[]>
  articlesEmpty: ComputedRef<boolean>
  canFindSubtopics: ComputedRef<boolean>
  canShowArticles: ComputedRef<boolean>
  canShowMore: ComputedRef<boolean>
  articleUrl: (title: string) => string
  onFindSubtopics: () => Promise<void>
  onShowArticles: () => Promise<void>
  onShowMore: () => Promise<void>
  selectAllCategories: () => void
  clearCategories: () => void
} {
  const topic = ref('cats')
  const categorySuggestions = ref<string[]>([])
  const selectedCategories = ref<string[]>([])
  const articlesByCategory = ref<Record<string, string[]>>({})
  const previewsByTitle = ref<Record<string, PagePreviewMetadata>>({})
  const limitPerCategory = ref(INITIAL_LIMIT_PER_CATEGORY)
  const loadingCategories = ref(false)
  const loadingArticles = ref(false)
  const loadingMore = ref(false)
  const categoryError = ref<string | null>(null)
  const articlesError = ref<string | null>(null)
  const hasLoadedArticles = ref(false)

  let categoryAbort: AbortController | null = null
  let articlesAbort: AbortController | null = null

  const hasCategoryResults = computed(() => categorySuggestions.value.length > 0)

  const mixedArticleTitles = computed(() =>
    mixArticleTitles(selectedCategories.value, articlesByCategory.value),
  )

  const articlesEmpty = computed(
    () => hasLoadedArticles.value && mixedArticleTitles.value.length === 0,
  )

  const canFindSubtopics = computed(
    () => topic.value.trim().length > 0 && !loadingCategories.value && !loadingArticles.value,
  )

  const canShowArticles = computed(
    () =>
      selectedCategories.value.length > 0 &&
      !loadingCategories.value &&
      !loadingArticles.value &&
      !loadingMore.value,
  )

  const canShowMore = computed(() => {
    if (!hasLoadedArticles.value || articlesEmpty.value) return false
    if (loadingArticles.value || loadingMore.value) return false
    if (limitPerCategory.value >= MAX_LIMIT_PER_CATEGORY) return false

    return selectedCategories.value.some((category) => {
      const titles = articlesByCategory.value[category] ?? []
      return titles.length >= limitPerCategory.value
    })
  })

  function resetArticleResults(): void {
    articlesByCategory.value = {}
    previewsByTitle.value = {}
    limitPerCategory.value = INITIAL_LIMIT_PER_CATEGORY
    hasLoadedArticles.value = false
    articlesError.value = null
  }

  function resetSubtopicResults(): void {
    categorySuggestions.value = []
    selectedCategories.value = []
    resetArticleResults()
    categoryError.value = null
  }

  watch(topic, () => {
    resetSubtopicResults()
  })

  async function fetchArticlesForCategories(
    categories: string[],
    limit: number,
    signal: AbortSignal,
    resetPreviews: boolean,
  ): Promise<void> {
    const pairs = await Promise.all(
      categories.map(async (category) => {
        const titles = await fetchMicrotaskRelatedArticles(category, {
          lang: LANG,
          limit,
          signal,
        })
        return [category, titles] as const
      }),
    )

    const byCategory: Record<string, string[]> = {}
    const uniqueTitles = new Set<string>()

    for (const [category, titles] of pairs) {
      byCategory[category] = titles
      for (const title of titles) {
        uniqueTitles.add(title)
      }
    }

    articlesByCategory.value = byCategory

    const titlesToPreview = resetPreviews
      ? [...uniqueTitles]
      : [...uniqueTitles].filter((title) => !previewsByTitle.value[title])

    if (titlesToPreview.length) {
      const batch = await fetchPagePreviewMetadataBatch(titlesToPreview, {
        lang: LANG,
        signal,
      })
      previewsByTitle.value = resetPreviews ? batch : { ...previewsByTitle.value, ...batch }
    } else if (resetPreviews) {
      previewsByTitle.value = {}
    }

    hasLoadedArticles.value = true
  }

  async function onFindSubtopics(): Promise<void> {
    const query = topic.value.trim()
    if (!query.length || loadingCategories.value) return

    categoryAbort?.abort()
    articlesAbort?.abort()

    const controller = new AbortController()
    categoryAbort = controller

    loadingCategories.value = true
    categoryError.value = null
    resetSubtopicResults()

    try {
      const results = await fetchMicrotaskCategorySuggestions(query, {
        lang: LANG,
        signal: controller.signal,
      })
      categorySuggestions.value = results
      selectedCategories.value = results.length ? [results[0]] : []
    } catch (error) {
      if (controller.signal.aborted) return
      categoryError.value = errorMessage(error) || 'Could not load subtopics.'
    } finally {
      if (categoryAbort === controller) {
        loadingCategories.value = false
      }
    }
  }

  async function onShowArticles(): Promise<void> {
    const categories = [...selectedCategories.value]
    if (!categories.length || loadingArticles.value || loadingMore.value) return

    articlesAbort?.abort()
    const controller = new AbortController()
    articlesAbort = controller

    loadingArticles.value = true
    articlesError.value = null
    limitPerCategory.value = INITIAL_LIMIT_PER_CATEGORY

    try {
      await fetchArticlesForCategories(
        categories,
        limitPerCategory.value,
        controller.signal,
        true,
      )
    } catch (error) {
      if (controller.signal.aborted) return
      articlesError.value = errorMessage(error) || 'Could not load articles.'
      hasLoadedArticles.value = false
    } finally {
      if (articlesAbort === controller) {
        loadingArticles.value = false
      }
    }
  }

  async function onShowMore(): Promise<void> {
    const categories = [...selectedCategories.value]
    if (!categories.length || !canShowMore.value) return

    articlesAbort?.abort()
    const controller = new AbortController()
    articlesAbort = controller

    const previousCount = mixedArticleTitles.value.length
    const previousLimit = limitPerCategory.value
    const nextLimit = Math.min(previousLimit + LIMIT_INCREMENT, MAX_LIMIT_PER_CATEGORY)

    loadingMore.value = true
    articlesError.value = null
    limitPerCategory.value = nextLimit

    try {
      await fetchArticlesForCategories(categories, nextLimit, controller.signal, false)
      if (mixedArticleTitles.value.length === previousCount) {
        limitPerCategory.value = MAX_LIMIT_PER_CATEGORY
      }
    } catch (error) {
      if (controller.signal.aborted) return
      articlesError.value = errorMessage(error) || 'Could not load more articles.'
      limitPerCategory.value = previousLimit
    } finally {
      if (articlesAbort === controller) {
        loadingMore.value = false
      }
    }
  }

  function selectAllCategories(): void {
    selectedCategories.value = [...categorySuggestions.value]
  }

  function clearCategories(): void {
    selectedCategories.value = []
    resetArticleResults()
  }

  return {
    topic,
    categorySuggestions,
    selectedCategories,
    previewsByTitle,
    loadingCategories,
    loadingArticles,
    loadingMore,
    categoryError,
    articlesError,
    hasCategoryResults,
    hasLoadedArticles,
    mixedArticleTitles,
    articlesEmpty,
    canFindSubtopics,
    canShowArticles,
    canShowMore,
    articleUrl: wikiArticleUrl,
    onFindSubtopics,
    onShowArticles,
    onShowMore,
    selectAllCategories,
    clearCategories,
  }
}
