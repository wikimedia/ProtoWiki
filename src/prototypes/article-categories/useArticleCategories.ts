import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'

import { wikiHostFromLang } from '@/lib/config'
import {
  FetchArticleCategoriesError,
  fetchArticleCategories,
} from '@/lib/fetchArticleCategories'
import {
  FetchCategoryMemberTitlesError,
  fetchCategoryMemberTitles,
} from '@/lib/fetchCategoryMemberTitles'
import {
  fetchPagePreviewMetadataBatch,
  type PagePreviewMetadata,
} from '@/lib/fetchUserEditedPageTitles'

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

/** Dedupe and rank by how many selected categories include each article. */
function rankArticleTitlesByCategoryMembership(
  categories: string[],
  byCategory: Record<string, string[]>,
): string[] {
  const membershipCount = new Map<string, number>()
  const canonicalTitle = new Map<string, string>()

  for (const category of categories) {
    for (const title of byCategory[category] ?? []) {
      const key = normalizeTitleKey(title)
      membershipCount.set(key, (membershipCount.get(key) ?? 0) + 1)
      if (!canonicalTitle.has(key)) {
        canonicalTitle.set(key, title)
      }
    }
  }

  return [...membershipCount.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1]
      if (countDiff !== 0) return countDiff
      const titleA = canonicalTitle.get(a[0]) ?? a[0]
      const titleB = canonicalTitle.get(b[0]) ?? b[0]
      return titleA.localeCompare(titleB)
    })
    .map(([key]) => canonicalTitle.get(key) ?? key)
}

function errorMessage(error: unknown): string {
  if (error instanceof FetchArticleCategoriesError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof FetchCategoryMemberTitlesError) {
    if (error.code === 'aborted') return ''
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Try again.'
}

export function useArticleCategories(): {
  article: Ref<string>
  categories: Ref<string[]>
  selectedCategories: Ref<string[]>
  previewsByTitle: Ref<Record<string, PagePreviewMetadata>>
  loadingCategories: Ref<boolean>
  loadingArticles: Ref<boolean>
  loadingMore: Ref<boolean>
  categoryError: Ref<string | null>
  articlesError: Ref<string | null>
  hasCategoryResults: ComputedRef<boolean>
  hasLoadedArticles: Ref<boolean>
  rankedArticleTitles: ComputedRef<string[]>
  articlesEmpty: ComputedRef<boolean>
  canLoadCategories: ComputedRef<boolean>
  canShowArticles: ComputedRef<boolean>
  canShowMore: ComputedRef<boolean>
  articleUrl: (title: string) => string
  onLoadCategories: () => Promise<void>
  onShowArticles: () => Promise<void>
  onShowMore: () => Promise<void>
  selectAllCategories: () => void
  clearCategories: () => void
} {
  const article = ref('Wet Leg')
  const categories = ref<string[]>([])
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

  const hasCategoryResults = computed(() => categories.value.length > 0)

  const rankedArticleTitles = computed(() =>
    rankArticleTitlesByCategoryMembership(
      selectedCategories.value,
      articlesByCategory.value,
    ),
  )

  const articlesEmpty = computed(
    () => hasLoadedArticles.value && rankedArticleTitles.value.length === 0,
  )

  const canLoadCategories = computed(
    () =>
      article.value.trim().length > 0 &&
      !loadingCategories.value &&
      !loadingArticles.value,
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

  function resetCategoryResults(): void {
    categories.value = []
    selectedCategories.value = []
    resetArticleResults()
    categoryError.value = null
  }

  watch(article, () => {
    resetCategoryResults()
  })

  async function fetchArticlesForCategories(
    categoryList: string[],
    limit: number,
    signal: AbortSignal,
    resetPreviews: boolean,
  ): Promise<void> {
    const sourceTitle = article.value.trim()

    const pairs = await Promise.all(
      categoryList.map(async (category) => {
        const titles = await fetchCategoryMemberTitles(category, {
          lang: LANG,
          limit,
          excludeTitle: sourceTitle,
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

  async function onLoadCategories(): Promise<void> {
    const title = article.value.trim()
    if (!title.length || loadingCategories.value) return

    categoryAbort?.abort()
    articlesAbort?.abort()

    const controller = new AbortController()
    categoryAbort = controller

    loadingCategories.value = true
    categoryError.value = null
    resetCategoryResults()

    try {
      const results = await fetchArticleCategories(title, {
        lang: LANG,
        signal: controller.signal,
      })
      categories.value = results
      selectedCategories.value = [...results]
    } catch (error) {
      if (controller.signal.aborted) return
      categoryError.value = errorMessage(error) || 'Could not load categories.'
    } finally {
      if (categoryAbort === controller) {
        loadingCategories.value = false
      }
    }
  }

  async function onShowArticles(): Promise<void> {
    const categoryList = [...selectedCategories.value]
    if (!categoryList.length || loadingArticles.value || loadingMore.value) return

    articlesAbort?.abort()
    const controller = new AbortController()
    articlesAbort = controller

    loadingArticles.value = true
    articlesError.value = null
    limitPerCategory.value = INITIAL_LIMIT_PER_CATEGORY

    try {
      await fetchArticlesForCategories(
        categoryList,
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
    const categoryList = [...selectedCategories.value]
    if (!categoryList.length || !canShowMore.value) return

    articlesAbort?.abort()
    const controller = new AbortController()
    articlesAbort = controller

    const previousCount = rankedArticleTitles.value.length
    const previousLimit = limitPerCategory.value
    const nextLimit = Math.min(previousLimit + LIMIT_INCREMENT, MAX_LIMIT_PER_CATEGORY)

    loadingMore.value = true
    articlesError.value = null
    limitPerCategory.value = nextLimit

    try {
      await fetchArticlesForCategories(categoryList, nextLimit, controller.signal, false)
      if (rankedArticleTitles.value.length === previousCount) {
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
    selectedCategories.value = [...categories.value]
  }

  function clearCategories(): void {
    selectedCategories.value = []
    resetArticleResults()
  }

  onMounted(() => {
    void onLoadCategories()
  })

  return {
    article,
    categories,
    selectedCategories,
    previewsByTitle,
    loadingCategories,
    loadingArticles,
    loadingMore,
    categoryError,
    articlesError,
    hasCategoryResults,
    hasLoadedArticles,
    rankedArticleTitles,
    articlesEmpty,
    canLoadCategories,
    canShowArticles,
    canShowMore,
    articleUrl: wikiArticleUrl,
    onLoadCategories,
    onShowArticles,
    onShowMore,
    selectAllCategories,
    clearCategories,
  }
}
