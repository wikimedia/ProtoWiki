<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import tabularWordmark from './assets/tabular-wikipedia-wordmark.svg'
import './wikitab-surface.css'

import WikitabColorThemeButton from './WikitabColorThemeButton.vue'
import WikitabColorThemePicker from './WikitabColorThemePicker.vue'
import WikitabPotdAttribution from './WikitabPotdAttribution.vue'
import WikitabConfigureButton from './WikitabConfigureButton.vue'
import WikitabConfigurePanel from './WikitabConfigurePanel.vue'
import WikitabSavedArticlesButton from './WikitabSavedArticlesButton.vue'
import WikitabSavedArticlesPanel from './WikitabSavedArticlesPanel.vue'
import WikitabDailyReadsSection from './WikitabDailyReadsSection.vue'
import WikitabSuggestedEditsSection from './WikitabSuggestedEditsSection.vue'
import WikitabReviewChangesSection from './WikitabReviewChangesSection.vue'
import WikitabSavedSection from './WikitabSavedSection.vue'
import WikitabSearch from './WikitabSearch.vue'
import WikitabSearchPage from './WikitabSearchPage.vue'
import WikitabSection from './WikitabSection.vue'
import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'
import type { WikitabSearchArticle } from './data/fetchWikitabSearchArticles'
import {
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SECTIONS,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  type WikitabCardData,
  type WikitabModuleId,
  type WikitabSectionId,
} from './sections'
import type { WikitabSectionState } from './useWikitabFeed'
import {
  colorThemeCycleId,
  colorThemeIsAccentOnWhite,
  colorThemeRemapsCardProgressive,
  colorThemeUsesLightCards,
  colorThemeUsesTintedPageSubtle,
  DEFAULT_COLOR_THEME_ID,
  isDefaultColorTheme,
  isPotdColorTheme,
  type WikitabColorThemeId,
} from './data/wikitabColorThemes'
import { useWikitabColorTheme } from './useWikitabColorTheme'
import { useWikitabPotdBackground } from './useWikitabPotdBackground'
import { useWikitabFeed } from './useWikitabFeed'
import { useWikitabHiddenArticles } from './useWikitabHiddenArticles'
import { useWikitabHiddenSections } from './useWikitabHiddenSections'
import { useWikitabDailyReads } from './useWikitabDailyReads'
import { useWikitabSuggestedEdits } from './useWikitabSuggestedEdits'
import { useWikitabReviewChanges } from './useWikitabReviewChanges'
import { useWikitabPinned } from './useWikitabPinned'
import { buildEffectiveHomeOrder, useWikitabModuleOrder } from './useWikitabModuleOrder'
import { loadWikitabConfig, type WikitabSavedItem } from './data/wikitabConfig'
import type { SaveItemPayload } from './data/savedCardHelpers'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import type { WikitabSearchContributeItem } from './data/fetchWikitabSearchContribute'
import {
  enrichSavedModuleItems,
  snapshotSavedModuleItems,
  useWikitabSavedArticles,
} from './useWikitabSavedArticles'
import { bumpWikitabSearchMountKey, useWikitabSearchMountKey } from './useWikitabSearchMount'
import { useWikitabSearchTab } from './useWikitabSearchTab'
import { cdxIconLogoWikipedia } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Wikitab',
    description: 'New tab home',
    platform: 'web',
    icon: cdxIconLogoWikipedia,
  },
})

const route = useRoute()

const searchQuery = computed(() => String(route.query.search ?? '').trim())
const searchMountKey = useWikitabSearchMountKey()
const isSearchMode = computed(() => searchQuery.value.length > 0)
const feedEnabled = computed(() => !isSearchMode.value)

const CUSTOM_MODULE_IDS = new Set<WikitabModuleId>([
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
])

const { hiddenIds, isHidden, hideSection, showSection } = useWikitabHiddenSections()
const feedHiddenSectionIds = computed(() =>
  hiddenIds.value.filter((id): id is WikitabSectionId => !CUSTOM_MODULE_IDS.has(id)),
)
const {
  sections,
  error,
  isSectionLoading,
  prepareForOrderedLoad,
  loadSection: loadFeedSection,
  reloadSection: reloadFeedSection,
} = useWikitabFeed({
  enabled: feedEnabled,
  hiddenSectionIds: feedHiddenSectionIds,
  autoLoad: false,
})
const { pinnedIds, isPinned, togglePin, orderSections } = useWikitabPinned()
const { resolvedOrder, setModuleOrder } = useWikitabModuleOrder()
const { filterCards, filterActivityItems, hideArticle } = useWikitabHiddenArticles()
const {
  savedItems,
  isCardSaved,
  toggleSaveFromPayload,
  toggleSaveSearchArticle,
  toggleSaveSuggestion,
  toggleSaveChange,
  toggleSaveImage,
  unsaveItem,
  persistEnrichedModuleItems,
} = useWikitabSavedArticles()
const {
  items: dailyReadsItems,
  loading: dailyReadsLoading,
  fillingInitial: dailyReadsFillingInitial,
  loadingMore: dailyReadsLoadingMore,
  hasMore: dailyReadsHasMore,
  error: dailyReadsError,
  refresh: refreshDailyReads,
  loadMore: loadMoreDailyReads,
  abort: abortDailyReads,
} = useWikitabDailyReads()
const {
  items: suggestedEditsItems,
  loading: suggestedEditsLoading,
  fillingInitial: suggestedEditsFillingInitial,
  loadingMore: suggestedEditsLoadingMore,
  hasMore: suggestedEditsHasMore,
  error: suggestedEditsError,
  isLoaded: suggestedEditsLoaded,
  refresh: refreshSuggestedEdits,
  loadMore: loadMoreSuggestedEdits,
  abort: abortSuggestedEdits,
} = useWikitabSuggestedEdits()
const {
  items: reviewChangesItems,
  loading: reviewChangesLoading,
  fillingInitial: reviewChangesFillingInitial,
  loadingMore: reviewChangesLoadingMore,
  hasMore: reviewChangesHasMore,
  error: reviewChangesError,
  isLoaded: reviewChangesLoaded,
  refresh: refreshReviewChanges,
  loadMore: loadMoreReviewChanges,
  dismissActivity: dismissReviewChange,
  abort: abortReviewChanges,
} = useWikitabReviewChanges()

/** Skeleton before Suggested edits refresh starts (saved snapshot ready, load queued). */
const suggestedEditsPending = ref(false)
/** Skeleton before Review changes refresh starts (saved snapshot ready, load queued). */
const reviewChangesPending = ref(false)

const dailyReadsPendingOnHome = computed(
  () => isPinned(WIKITAB_DAILY_READS_MODULE_ID) && savedModuleLoading.value,
)

const suggestedEditsPendingOnHome = computed(
  () => suggestedEditsPending.value || savedModuleLoading.value,
)

const reviewChangesPendingOnHome = computed(
  () => reviewChangesPending.value || savedModuleLoading.value,
)

/** Home Saved module cards — empty until enrich finishes so skeletons can reserve slots. */
const savedModuleItems = ref<WikitabSavedItem[]>([])
const savedModuleLoading = ref(loadWikitabConfig().savedItems.length > 0)
let savedModuleAbort: AbortController | null = null

async function refreshSavedModule(): Promise<void> {
  savedModuleAbort?.abort()
  savedModuleAbort = new AbortController()
  const { signal } = savedModuleAbort

  const snapshot = snapshotSavedModuleItems()
  if (!snapshot.length) {
    savedModuleItems.value = []
    savedModuleLoading.value = false
    return
  }

  savedModuleLoading.value = true
  savedModuleItems.value = []

  try {
    const enriched = await enrichSavedModuleItems(snapshot, signal)
    if (signal.aborted) return
    savedModuleItems.value = enriched
    persistEnrichedModuleItems(enriched)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return
    savedModuleItems.value = snapshot
  } finally {
    if (!signal.aborted) savedModuleLoading.value = false
  }
}

const FEED_SECTION_IDS = new Set<WikitabSectionId>(
  WIKITAB_SECTIONS.map((section) => section.id),
)

function isFeedSectionId(id: WikitabModuleId): id is WikitabSectionId {
  return FEED_SECTION_IDS.has(id as WikitabSectionId)
}

/** Load order from pin state + configured order — skips hidden and saved-gated modules. */
function computeHomeModuleLoadOrder(): WikitabModuleId[] {
  const hasSaved = loadWikitabConfig().savedItems.length > 0
  const order: WikitabModuleId[] = []

  for (const id of buildEffectiveHomeOrder(pinnedIds.value, resolvedOrder.value)) {
    if (isHidden(id)) continue
    if (
      (id === WIKITAB_SAVED_MODULE_ID ||
        id === WIKITAB_DAILY_READS_MODULE_ID ||
        id === WIKITAB_SUGGESTED_EDITS_MODULE_ID ||
        id === WIKITAB_REVIEW_CHANGES_MODULE_ID) &&
      !hasSaved
    ) {
      continue
    }
    order.push(id)
  }

  return order
}

let homeLoadGeneration = 0

function isSavedAdjacentModuleId(id: WikitabModuleId): boolean {
  return (
    id === WIKITAB_DAILY_READS_MODULE_ID ||
    id === WIKITAB_SUGGESTED_EDITS_MODULE_ID ||
    id === WIKITAB_REVIEW_CHANGES_MODULE_ID
  )
}

async function refreshSavedAdjacentModules(
  batch: readonly WikitabModuleId[],
): Promise<void> {
  const runsSuggestedEdits = batch.includes(WIKITAB_SUGGESTED_EDITS_MODULE_ID)
  const runsReviewChanges = batch.includes(WIKITAB_REVIEW_CHANGES_MODULE_ID)
  if (runsSuggestedEdits) suggestedEditsPending.value = true
  if (runsReviewChanges) reviewChangesPending.value = true

  try {
    await Promise.all(
      batch.map((moduleId) => {
        if (moduleId === WIKITAB_DAILY_READS_MODULE_ID) {
          return refreshDailyReads(savedModuleItems.value)
        }
        if (moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
          return refreshSuggestedEdits(savedModuleItems.value)
        }
        return refreshReviewChanges(savedModuleItems.value)
      }),
    )
  } finally {
    if (runsSuggestedEdits) suggestedEditsPending.value = false
    if (runsReviewChanges) reviewChangesPending.value = false
  }
}

/** Refresh visible home modules top-to-bottom (respects pin + hide). */
async function refreshHomeModulesInOrder(): Promise<void> {
  if (isSearchMode.value) return

  const generation = ++homeLoadGeneration
  suggestedEditsPending.value = false
  reviewChangesPending.value = false
  prepareForOrderedLoad()

  const order = computeHomeModuleLoadOrder()

  const needsSavedSnapshot = order.some(
    (moduleId) =>
      moduleId === WIKITAB_DAILY_READS_MODULE_ID ||
      moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID ||
      moduleId === WIKITAB_REVIEW_CHANGES_MODULE_ID,
  )

  if (needsSavedSnapshot && !order.includes(WIKITAB_SAVED_MODULE_ID)) {
    await refreshSavedModule()
    if (generation !== homeLoadGeneration) return
  }

  for (let index = 0; index < order.length; index++) {
    if (generation !== homeLoadGeneration) return

    const id = order[index]

    if (id === WIKITAB_SAVED_MODULE_ID) {
      await refreshSavedModule()
      continue
    }

    if (isSavedAdjacentModuleId(id)) {
      const batch: WikitabModuleId[] = []
      while (index < order.length && isSavedAdjacentModuleId(order[index])) {
        batch.push(order[index])
        index++
      }
      index--

      await refreshSavedAdjacentModules(batch)
      continue
    }

    if (isFeedSectionId(id)) {
      await loadFeedSection(id)
    }
  }
}

/** Refresh one home module from its section menu. */
async function refreshHomeModule(moduleId: WikitabModuleId): Promise<void> {
  if (isSearchMode.value) return

  if (moduleId === WIKITAB_SAVED_MODULE_ID) {
    await refreshSavedModule()
    return
  }

  if (moduleId === WIKITAB_DAILY_READS_MODULE_ID) {
    await refreshDailyReads(savedModuleItems.value, { force: true })
    return
  }

  if (moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
    suggestedEditsPending.value = true
    try {
      await refreshSuggestedEdits(savedModuleItems.value, { force: true })
    } finally {
      suggestedEditsPending.value = false
    }
    return
  }

  if (moduleId === WIKITAB_REVIEW_CHANGES_MODULE_ID) {
    reviewChangesPending.value = true
    try {
      await refreshReviewChanges(savedModuleItems.value, { force: true })
    } finally {
      reviewChangesPending.value = false
    }
    return
  }

  if (isFeedSectionId(moduleId)) {
    await reloadFeedSection(moduleId)
  }
}

const { potd, potdImageUrl } = useWikitabPotdBackground()
const { colorThemeId, themeStyle, setColorTheme } = useWikitabColorTheme(potdImageUrl)
const { activeTab: searchTab } = useWikitabSearchTab()

const colorPickerOpen = ref(false)
const configureOpen = ref(false)
const savedPanelOpen = ref(false)
const colorThemeButton = ref<InstanceType<typeof WikitabColorThemeButton> | null>(null)
const configureButton = ref<InstanceType<typeof WikitabConfigureButton> | null>(null)
const savedArticlesButton = ref<InstanceType<typeof WikitabSavedArticlesButton> | null>(null)

async function openColorPicker(): Promise<void> {
  colorPickerOpen.value = true
}

async function closeColorPicker(): Promise<void> {
  colorPickerOpen.value = false
  await nextTick()
  colorThemeButton.value?.focusPalette()
}

async function openConfigure(): Promise<void> {
  configureOpen.value = true
}

async function closeConfigure(): Promise<void> {
  configureOpen.value = false
  await nextTick()
  configureButton.value?.focusButton()
}

async function openSavedPanel(): Promise<void> {
  savedPanelOpen.value = true

  const snapshot = snapshotSavedModuleItems()
  if (!snapshot.length) return

  try {
    const enriched = await enrichSavedModuleItems(snapshot)
    persistEnrichedModuleItems(enriched)
    if (savedModuleItems.value.length) {
      savedModuleItems.value = enriched
    }
  } catch {
    // Panel still opens with the last persisted stats.
  }
}

async function closeSavedPanel(): Promise<void> {
  savedPanelOpen.value = false
  await nextTick()
  savedArticlesButton.value?.focusButton()
}

function toggleSaveFromCard(payload: SaveItemPayload): void {
  toggleSaveFromPayload(payload)
}

function toggleSaveFromSavedModule(id: string): void {
  if (!id || !isCardSaved(id)) return

  unsaveItem(id)
  savedModuleItems.value = savedModuleItems.value.filter((saved) => saved.id !== id)
}

function toggleSaveFromActivity(item: WikitabSearchActivityItem): void {
  toggleSaveChange(item)
}

function toggleSaveFromContribute(item: WikitabSearchContributeItem): void {
  toggleSaveSuggestion(item)
}

function toggleSaveFromSearch(article: WikitabSearchArticle): void {
  toggleSaveSearchArticle({
    title: article.title,
    thumbnailUrl: article.thumbnailUrl,
    description: article.description ?? article.extract,
  })
}

function toggleSaveFromSearchImage(image: WikitabSearchImage): void {
  toggleSaveImage(image)
}

function selectColorTheme(id: WikitabColorThemeId): void {
  setColorTheme(id)
}

function cycleColorTheme(direction: 'prev' | 'next'): void {
  setColorTheme(colorThemeCycleId(colorThemeId.value, direction))
}

const overlayOpen = computed(
  () => colorPickerOpen.value || configureOpen.value || savedPanelOpen.value,
)

const showConfigureButton = computed(() => !overlayOpen.value)
const showSavedArticlesButton = computed(() => !overlayOpen.value)

const showColorThemeButton = computed(
  () => !overlayOpen.value && (!isSearchMode.value || searchTab.value !== 'images'),
)

const showPotdBackground = computed(
  () => !isSearchMode.value && isPotdColorTheme(colorThemeId.value),
)

const showPotdAttribution = computed(
  () => !overlayOpen.value && showPotdBackground.value,
)

const potdAttributionOpen = ref(false)

const potdAttributionFocus = computed(
  () => potdAttributionOpen.value && showPotdBackground.value,
)

const visibleSections = computed(() =>
  orderSections(sections.value, resolvedOrder.value)
    .filter((section) => !isHidden(section.spec.id))
    .map((section) => ({
      ...section,
      items: filterCards(section.items),
    })),
)

const showSavedModule = computed(
  () =>
    !isHidden(WIKITAB_SAVED_MODULE_ID) &&
    (savedModuleLoading.value || savedModuleItems.value.length > 0),
)

const visibleDailyReadsItems = computed(() => filterCards(dailyReadsItems.value))

const hasSavedArticlesForModules = computed(
  () => savedItems.value.length > 0 || savedModuleItems.value.length > 0,
)

const showDailyReadsModule = computed(
  () =>
    !isHidden(WIKITAB_DAILY_READS_MODULE_ID) &&
    hasSavedArticlesForModules.value &&
    (dailyReadsPendingOnHome.value ||
      dailyReadsLoading.value ||
      dailyReadsFillingInitial.value ||
      visibleDailyReadsItems.value.length > 0),
)

const visibleSuggestedEditsItems = computed(() => filterCards(suggestedEditsItems.value))

const showSuggestedEditsModule = computed(
  () =>
    !isHidden(WIKITAB_SUGGESTED_EDITS_MODULE_ID) &&
    (savedModuleLoading.value || savedModuleItems.value.length > 0) &&
    (suggestedEditsPendingOnHome.value ||
      suggestedEditsLoading.value ||
      suggestedEditsFillingInitial.value ||
      visibleSuggestedEditsItems.value.length > 0 ||
      suggestedEditsError.value ||
      suggestedEditsLoaded.value),
)

const visibleReviewChangesItems = computed(() => filterActivityItems(reviewChangesItems.value))

const showReviewChangesModule = computed(
  () =>
    !isHidden(WIKITAB_REVIEW_CHANGES_MODULE_ID) &&
    (savedModuleLoading.value || savedModuleItems.value.length > 0) &&
    (reviewChangesPendingOnHome.value ||
      reviewChangesLoading.value ||
      reviewChangesFillingInitial.value ||
      visibleReviewChangesItems.value.length > 0 ||
      reviewChangesError.value ||
      reviewChangesLoaded.value),
)

type HomeModuleEntry =
  | { kind: 'saved' }
  | { kind: 'daily-reads' }
  | { kind: 'suggested-edits' }
  | { kind: 'review-changes' }
  | { kind: 'feed'; section: WikitabSectionState & { items: WikitabCardData[] } }

const orderedHomeModules = computed((): HomeModuleEntry[] => {
  const modules: HomeModuleEntry[] = []

  function appendModule(id: WikitabModuleId): void {
    if (id === WIKITAB_SAVED_MODULE_ID) {
      if (showSavedModule.value) modules.push({ kind: 'saved' })
      return
    }

    if (id === WIKITAB_DAILY_READS_MODULE_ID) {
      if (showDailyReadsModule.value) modules.push({ kind: 'daily-reads' })
      return
    }

    if (id === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
      if (showSuggestedEditsModule.value) modules.push({ kind: 'suggested-edits' })
      return
    }

    if (id === WIKITAB_REVIEW_CHANGES_MODULE_ID) {
      if (showReviewChangesModule.value) modules.push({ kind: 'review-changes' })
      return
    }

    const section = visibleSections.value.find((entry) => entry.spec.id === id)
    if (section) modules.push({ kind: 'feed', section })
  }

  for (const id of buildEffectiveHomeOrder(pinnedIds.value, resolvedOrder.value)) {
    appendModule(id)
  }

  return modules
})

watch(
  () => savedItems.value.length,
  (next) => {
    if (next === 0) {
      savedModuleItems.value = []
      savedModuleLoading.value = false
      suggestedEditsPending.value = false
      reviewChangesPending.value = false
      void refreshDailyReads([])
      void refreshSuggestedEdits([])
      void refreshReviewChanges([])
    }
  },
)

onMounted(() => {
  void refreshHomeModulesInOrder()
})

onUnmounted(() => {
  savedModuleAbort?.abort()
  abortDailyReads()
  abortSuggestedEdits()
  abortReviewChanges()
})

watch(isSearchMode, (searchMode, wasSearchMode) => {
  if (wasSearchMode && !searchMode) {
    void refreshHomeModulesInOrder()
  }
})

watch(overlayOpen, (open, wasOpen) => {
  if (wasOpen && !open) {
    void refreshHomeModulesInOrder()
  }
})

watch(searchQuery, (next, prev) => {
  if (prev.length > 0 && next.length === 0) {
    bumpWikitabSearchMountKey()
  }
})
</script>

<template>
  <div
    class="wikitab"
    :class="{
      'wikitab--search': isSearchMode,
      'wikitab--themed': !isDefaultColorTheme(colorThemeId),
      'wikitab--potd-background': showPotdBackground,
      'wikitab--potd-attribution-open': potdAttributionFocus,
      'wikitab--accent-on-white': colorThemeIsAccentOnWhite(colorThemeId),
      'wikitab--light-cards':
        colorThemeId != null && colorThemeUsesLightCards(colorThemeId),
      'wikitab--tinted-subtle':
        colorThemeId != null && colorThemeUsesTintedPageSubtle(colorThemeId),
      'wikitab--remaps-card-progressive':
        colorThemeId != null && colorThemeRemapsCardProgressive(colorThemeId),
    }"
    :style="themeStyle"
  >
    <div
      v-show="!overlayOpen && !potdAttributionFocus"
      v-if="showConfigureButton || showSavedArticlesButton"
      class="wikitab__page-chrome"
    >
      <WikitabConfigureButton
        v-if="showConfigureButton"
        ref="configureButton"
        :aria-expanded="configureOpen"
        @open="openConfigure"
      />
      <WikitabSavedArticlesButton
        v-if="showSavedArticlesButton"
        ref="savedArticlesButton"
        :aria-expanded="savedPanelOpen"
        @open="openSavedPanel"
      />
    </div>

    <div
      v-show="!overlayOpen && !potdAttributionFocus"
      class="wikitab__main"
      :aria-hidden="overlayOpen || potdAttributionFocus"
    >
      <header class="wikitab__hero">
        <div class="wikitab__hero-top">
          <h1 class="wikitab__wordmark">
            <RouterLink class="wikitab__wordmark-link" :to="{ path: route.path, query: {} }">
              <img
                class="wikitab__wordmark-img"
                :src="tabularWordmark"
                alt="Tabular Wikipedia"
                width="150"
                height="33"
              />
            </RouterLink>
          </h1>
          <WikitabSearch
            :key="searchMountKey"
            class="wikitab__search"
            :initial-query="searchQuery"
            :search-mode="isSearchMode"
          />
        </div>
        <WikitabSearchPage
          v-if="isSearchMode"
          class="wikitab__search-page"
          :search-query="searchQuery"
          :is-card-saved="isCardSaved"
          @toggle-save-article="toggleSaveFromSearch"
          @toggle-save-activity="toggleSaveFromActivity"
          @toggle-save-contribute="toggleSaveFromContribute"
          @toggle-save-image="toggleSaveFromSearchImage"
        />
      </header>

      <div v-if="!isSearchMode" class="wikitab__sections">
        <template
          v-for="entry in orderedHomeModules"
          :key="
            entry.kind === 'saved'
              ? 'saved'
              : entry.kind === 'daily-reads'
                ? 'daily-reads'
                : entry.kind === 'suggested-edits'
                  ? 'suggested-edits'
                  : entry.kind === 'review-changes'
                    ? 'review-changes'
                    : entry.section.spec.id
          "
        >
          <WikitabSavedSection
            v-if="entry.kind === 'saved'"
            :saved-items="savedModuleItems"
            :loading="savedModuleLoading"
            :pinned="isPinned(WIKITAB_SAVED_MODULE_ID)"
            :is-card-saved="isCardSaved"
            @toggle-pin="togglePin(WIKITAB_SAVED_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_SAVED_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_SAVED_MODULE_ID)"
            @toggle-save="toggleSaveFromSavedModule"
          />
          <WikitabDailyReadsSection
            v-else-if="entry.kind === 'daily-reads'"
            :items="visibleDailyReadsItems"
            :loading="dailyReadsLoading || dailyReadsPendingOnHome"
            :filling-initial="dailyReadsFillingInitial"
            :loading-more="dailyReadsLoadingMore"
            :has-more="dailyReadsHasMore"
            :error="dailyReadsError"
            :pinned="isPinned(WIKITAB_DAILY_READS_MODULE_ID)"
            :is-card-saved="isCardSaved"
            @toggle-pin="togglePin(WIKITAB_DAILY_READS_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_DAILY_READS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_DAILY_READS_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @load-more="loadMoreDailyReads"
          />
          <WikitabSuggestedEditsSection
            v-else-if="entry.kind === 'suggested-edits'"
            :items="visibleSuggestedEditsItems"
            :loading="suggestedEditsLoading || suggestedEditsPendingOnHome"
            :filling-initial="suggestedEditsFillingInitial"
            :pending="suggestedEditsPendingOnHome"
            :loading-more="suggestedEditsLoadingMore"
            :has-more="suggestedEditsHasMore"
            :error="suggestedEditsError"
            :pinned="isPinned(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            :is-card-saved="isCardSaved"
            @toggle-pin="togglePin(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @load-more="loadMoreSuggestedEdits"
          />
          <WikitabReviewChangesSection
            v-else-if="entry.kind === 'review-changes'"
            :items="visibleReviewChangesItems"
            :loading="reviewChangesLoading || reviewChangesPendingOnHome"
            :filling-initial="reviewChangesFillingInitial"
            :pending="reviewChangesPendingOnHome"
            :loading-more="reviewChangesLoadingMore"
            :has-more="reviewChangesHasMore"
            :error="reviewChangesError"
            :pinned="isPinned(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @toggle-pin="togglePin(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @load-more="loadMoreReviewChanges"
            :is-card-saved="isCardSaved"
            @dismiss="dismissReviewChange"
            @toggle-save="toggleSaveFromActivity"
          />
          <WikitabSection
            v-else
            :spec="entry.section.spec"
            :items="entry.section.items"
            :loading="isSectionLoading(entry.section.spec.id)"
            :error="error"
            :pinned="isPinned(entry.section.spec.id)"
            :is-card-saved="isCardSaved"
            @toggle-pin="togglePin(entry.section.spec.id)"
            @refresh-section="refreshHomeModule(entry.section.spec.id)"
            @hide-section="hideSection(entry.section.spec.id)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
          />
        </template>
      </div>
    </div>

    <WikitabPotdAttribution
      v-if="showPotdAttribution"
      :potd="potd"
      @open-change="potdAttributionOpen = $event"
    />

    <WikitabColorThemeButton
      v-if="showColorThemeButton && !potdAttributionFocus"
      ref="colorThemeButton"
      :aria-expanded="colorPickerOpen"
      @open="openColorPicker"
      @prev="cycleColorTheme('prev')"
      @next="cycleColorTheme('next')"
    />

    <WikitabConfigurePanel
      v-if="configureOpen && !potdAttributionFocus"
      :module-order="resolvedOrder"
      :is-hidden="isHidden"
      @close="closeConfigure"
      @show="showSection"
      @hide="hideSection"
      @reorder="setModuleOrder"
    />

    <WikitabColorThemePicker
      v-if="colorPickerOpen && !potdAttributionFocus"
      :selected-id="colorThemeId ?? DEFAULT_COLOR_THEME_ID"
      :potd-image-url="potdImageUrl"
      @close="closeColorPicker"
      @select="selectColorTheme"
    />

    <WikitabSavedArticlesPanel
      v-if="savedPanelOpen && !potdAttributionFocus"
      :saved-items="savedItems"
      :is-card-saved="isCardSaved"
      @close="closeSavedPanel"
      @toggle-save="toggleSaveFromSavedModule"
    />
  </div>
</template>

<style scoped>
.wikitab {
  --wikitab-page-gutter: var(--spacing-100);
  --wikitab-chrome-inset: var(--spacing-100);

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  padding-inline: var(--wikitab-page-gutter);
  padding-bottom: calc(var(--spacing-400) + var(--spacing-100));
  background-color: var(--background-color-base);
}

/* Mobile + compact desktop (≤767px): tighter corner inset. */
@media (max-width: 767px) {
  .wikitab {
    --wikitab-chrome-inset: var(--spacing-50);
  }
}

.wikitab__main {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/*
 * Top chrome (configure, saved) sits in document flow at the page top and scrolls
 * away. Sibling of __main (not inside it) so desktop `align-items: center` on
 * __main cannot shrink this row. Full-bleed to the viewport; tight corner inset.
 */
.wikitab__page-chrome {
  display: flex;
  flex-shrink: 0;
  align-self: stretch;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  width: calc(100% + 2 * var(--wikitab-page-gutter));
  margin-inline: calc(-1 * var(--wikitab-page-gutter));
  padding-top: var(--wikitab-chrome-inset);
  padding-inline: var(--wikitab-chrome-inset);
}

[data-skin='desktop'] .wikitab__main {
  align-self: stretch;
  align-items: center;
}

.wikitab__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50);
}

.wikitab__hero-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-100);
  width: 100%;
}

/* Elevate the whole hero while search is open so the menu covers section links. */
.wikitab__hero:has(.wikitab-search--expanded) {
  position: relative;
  z-index: 10;
}

.wikitab__wordmark {
  margin: 0;
}

.wikitab__wordmark-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.wikitab__wordmark-link:hover,
.wikitab__wordmark-link:focus-visible {
  text-decoration: none;
  opacity: 0.85;
}

.wikitab__wordmark-img {
  display: block;
  height: 33px;
  width: auto;
}

[data-theme='dark'] .wikitab__wordmark-img {
  filter: brightness(0) invert(1);
}

.wikitab--potd-background {
  isolation: isolate;
}

.wikitab--potd-background::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--wikitab-potd-background-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: var(--wikitab-potd-background-opacity, 0.5);
  transition: opacity 0.2s ease;
}

.wikitab--potd-background.wikitab--potd-attribution-open::before {
  opacity: var(--wikitab-potd-background-opacity-expanded, 0.85);
}

@media (min-width: 640px) {
  .wikitab--potd-background::before {
    position: fixed;
  }
}

.wikitab--potd-background > .wikitab__page-chrome,
.wikitab--potd-background > .wikitab__main {
  position: relative;
  z-index: 1;
}

.wikitab__search {
  width: 100%;
}

.wikitab__search-page {
  width: 100%;
}

.wikitab__sections {
  display: flex;
  flex-direction: column;
}

/*
 * Desktop layout (grid, Show more) applies from 640px via `[data-skin]`, but the
 * column width and gutter vary:
 *
 * - Compact (640–767px): full-width column, 16px page gutter — the band between
 *   mobile carousel and the centred wide-desktop column.
 * - Wide (768px+): centred 640px column, 64px page gutter.
 *
 * Typography: compact scale on home feed cards only (`.wikitab-section__cards`).
 * Hero search, section headings, and search results keep Codex defaults (16px body).
 */
[data-skin='desktop'] .wikitab {
  align-items: center;
}

[data-skin='desktop'] .wikitab__hero,
[data-skin='desktop'] .wikitab__sections {
  width: 100%;
}

[data-skin='desktop'] .wikitab__hero {
  padding-bottom: calc(var(--spacing-400) + var(--spacing-200));
}

[data-skin='desktop'] .wikitab__hero-top {
  padding-top: calc(var(--spacing-400) + var(--spacing-200));
}

[data-skin='desktop'] .wikitab__sections {
  gap: var(--spacing-300);
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab {
    --wikitab-page-gutter: var(--spacing-400);
  }

  [data-skin='desktop'] .wikitab__hero,
  [data-skin='desktop'] .wikitab__sections {
    max-width: 640px;
  }
}

[data-skin='mobile'] .wikitab__hero {
  padding-bottom: calc(var(--spacing-400) + var(--spacing-200));
}

[data-skin='mobile'] .wikitab__hero-top {
  padding-top: var(--spacing-300);
}

[data-skin='mobile'] .wikitab__sections {
  gap: var(--spacing-300);
}

/*
 * Search mode — keep hero top padding so the search bar stays put; only tighten
 * spacing below the results. Layout inherits the centred 640px column.
 */
[data-skin='desktop'] .wikitab--search .wikitab__hero {
  gap: var(--spacing-150);
  padding-bottom: var(--spacing-400);
}

[data-skin='mobile'] .wikitab--search .wikitab__hero {
  gap: var(--spacing-100);
  padding-bottom: var(--spacing-100);
}

/*
 * Flat overlay chrome — strip stock Codex drop shadows from popovers on stock Codex.
 * Menus stay on-Codex in both modes (stock border + shadow; patched 1px outline).
 */
:global(html:not([data-codex-patched])) .wikitab :deep(.cdx-popover) {
  box-shadow: none;
}

/* CdxDialog teleports to <body>; scope via page root presence. */
:global(html:not([data-codex-patched]):has(.wikitab) .cdx-dialog) {
  box-shadow: none;
}

/*
 * Section-heading ⋯ menus. Codex caps MenuButton menus at 16rem and pins the footer
 * row (position:absolute), so width:max-content never sees "About …" labels. Unpin
 * the footer and drop the cap; positioning stays on Floating UI.
 */
.wikitab :deep(.wikitab-section__menu .cdx-menu),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu),
.wikitab :deep(.wikitab-review-changes-section__menu .cdx-menu) {
  width: max-content !important;
  min-width: 12rem;
  max-width: none !important;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-review-changes-section__menu .cdx-menu-item__text__label) {
  white-space: nowrap;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-review-changes-section__menu .cdx-menu--has-footer .cdx-menu__listbox) {
  margin-bottom: 0 !important;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-review-changes-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type) {
  position: static;
  width: auto;
}

/*
 * Page chrome on tinted backgrounds — headings/pins use --wikitab-theme-fg (dark on
 * light / lightCards themes, inverted on neutral dark themes). Page-scope progressive
 * (Show more, tab underline) uses --color-progressive — white on lightCards tints.
 * lightCards remap card link tokens below.
 */
.wikitab--themed :deep(.wikitab-section__heading) {
  color: var(--wikitab-theme-fg);
}

/*
 * Page-surface subtle text — hue-tinted on colored backgrounds only. Neutral
 * themes (Dark, Off black, Gray) keep Codex subtle. White card surfaces keep
 * neutral Codex subtle.
 */
.wikitab--themed.wikitab--tinted-subtle,
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-search-page),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section) {
  --color-subtle: var(--wikitab-theme-subtle);
}

/*
 * Articles-tab body copy follows CdxCard description/supporting tokens (subtle on
 * stock, base on patched). On hue-tinted pages remap both so card-equivalent text
 * stays theme-subtle.
 */
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-search-result-card) {
  --color-subtle: var(--wikitab-theme-subtle);
  --color-base: var(--wikitab-theme-subtle);
}

/*
 * lightCards tints (Blue bold, Purple bold) — article description, extract, and
 * supporting line all use near-black for contrast on the saturated page tint.
 */
.wikitab--themed.wikitab--light-cards :deep(.wikitab-search-result-card) {
  --color-subtle: var(--wikitab-theme-fg);
  --color-base: var(--wikitab-theme-fg);
}

/*
 * lightCards feed cards (Blue bold, Purple bold) — patched hover aliases on
 * .wikitab inherit the white page progressive; card shells need the card accent.
 */
.wikitab--themed.wikitab--light-cards :deep(.wikitab-card) {
  --wikitab-card-border-color--hover: var(--wikitab-theme-card-progressive);
  --wikitab-card-box-shadow--hover: 0 0 0 1px var(--wikitab-theme-card-progressive);
  --wikitab-card-border-color--active: var(
    --wikitab-theme-card-progressive--active,
    var(--wikitab-theme-card-progressive)
  );
  --wikitab-card-box-shadow--active: inset 0 0 0 1px var(--wikitab-theme-card-progressive);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section__empty) {
  color: var(--wikitab-theme-subtle);
}

.wikitab--themed :deep(.wikitab-card),
.wikitab--themed :deep(.wikitab-search-activity-card),
.wikitab--themed :deep(.wikitab-search-contribute-card),
.wikitab--themed :deep(.wikitab-potd-attribution__card) {
  --color-subtle: var(--wikitab-codex-subtle);
}

.wikitab--themed :deep(.wikitab-section__pin) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed :deep(.wikitab-color-theme-picker__close .cdx-icon),
.wikitab--themed :deep(.wikitab-configure-panel__close .cdx-icon),
.wikitab--themed :deep(.wikitab-saved-articles-panel__close .cdx-icon) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed :deep(.wikitab-saved-section__heading),
.wikitab--themed :deep(.wikitab-daily-reads-section__heading),
.wikitab--themed :deep(.wikitab-suggested-edits-section__heading),
.wikitab--themed :deep(.wikitab-review-changes-section__heading) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed :deep(.wikitab-saved-section__pin),
.wikitab--themed :deep(.wikitab-daily-reads-section__pin),
.wikitab--themed :deep(.wikitab-suggested-edits-section__pin),
.wikitab--themed :deep(.wikitab-review-changes-section__pin) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-saved-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-suggested-edits-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-review-changes-section) {
  --color-subtle: var(--wikitab-theme-subtle);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section__empty),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-suggested-edits-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-review-changes-section__error) {
  color: var(--wikitab-theme-subtle);
}


/*
 * Themed borders on tinted page surfaces (Red light, Blue bold, …) — not accent-on-white
 * swatches (Default, Red, Orange, … on a white page). Home feed cards + Articles /
 * Images search surfaces share --wikitab-theme-border; Activity / Contribute search
 * cards and the typeahead keep Codex defaults.
 */
.wikitab--themed:not(.wikitab--accent-on-white) :deep(.wikitab-card .cdx-card) {
  border-color: var(--wikitab-theme-border, var(--border-color-subtle));
}

.wikitab--themed:not(.wikitab--accent-on-white) :deep(.wikitab-search-image-card) {
  border-color: var(--wikitab-theme-border, var(--border-color-subtle));
}

.wikitab--themed:not(.wikitab--accent-on-white)
  :deep(.wikitab-search-result-card .cdx-thumbnail__placeholder) {
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
  --color-placeholder: var(--wikitab-theme-skeleton-icon, var(--color-placeholder));
}

/*
 * Card link accent + full Codex progressive tokens (⋯ menu focus ring, etc.).
 * lightCards themes: card accent differs from white page progressive.
 * Search result cards are excluded — transparent on the page tint (Articles tab),
 * so they inherit page-scope progressive (white on Blue bold, Purple bold, etc.).
 */
.wikitab--themed.wikitab--remaps-card-progressive :deep(.wikitab-card),
.wikitab--themed.wikitab--remaps-card-progressive :deep(.wikitab-search-activity-card),
.wikitab--themed.wikitab--remaps-card-progressive :deep(.wikitab-search-contribute-card),
.wikitab--themed.wikitab--remaps-card-progressive :deep(.wikitab-search-image-card) {
  --color-progressive: var(--wikitab-theme-card-progressive, var(--color-progressive));
  --color-progressive--hover: var(
    --wikitab-theme-card-progressive--hover,
    var(--color-progressive--hover)
  );
  --color-progressive--active: var(
    --wikitab-theme-card-progressive--active,
    var(--color-progressive--active)
  );
  --color-link: var(--wikitab-theme-card-progressive, var(--color-link));
  --color-link--hover: var(--wikitab-theme-card-progressive--hover, var(--color-link--hover));
  --color-link--active: var(--wikitab-theme-card-progressive--active, var(--color-link--active));
  --color-visited: var(--wikitab-theme-card-progressive, var(--color-visited));
  --color-visited--hover: var(--wikitab-theme-card-progressive--hover, var(--color-visited--hover));
  --color-visited--active: var(
    --wikitab-theme-card-progressive--active,
    var(--color-visited--active)
  );
  --border-color-progressive: var(
    --wikitab-theme-card-progressive,
    var(--border-color-progressive)
  );
  --border-color-progressive--hover: var(
    --wikitab-theme-card-progressive--hover,
    var(--border-color-progressive--hover)
  );
  --border-color-progressive--active: var(
    --wikitab-theme-card-progressive--active,
    var(--border-color-progressive--active)
  );
  --border-color-progressive--focus: var(
    --wikitab-theme-card-progressive,
    var(--border-color-progressive--focus)
  );
  --box-shadow-color-progressive--focus: var(
    --wikitab-theme-card-progressive,
    var(--box-shadow-color-progressive--focus)
  );
  --background-color-progressive: var(
    --wikitab-theme-card-progressive,
    var(--background-color-progressive)
  );
  --background-color-progressive--hover: var(
    --wikitab-theme-card-progressive--hover,
    var(--background-color-progressive--hover)
  );
  --background-color-progressive--active: var(
    --wikitab-theme-card-progressive--active,
    var(--background-color-progressive--active)
  );
  --background-color-progressive-subtle: var(
    --wikitab-theme-card-progressive-subtle,
    var(--background-color-progressive-subtle)
  );
  --background-color-progressive-subtle--hover: var(
    --wikitab-theme-card-progressive-subtle--hover,
    var(--background-color-progressive-subtle--hover)
  );
  --background-color-progressive-subtle--active: var(
    --wikitab-theme-card-progressive-subtle--active,
    var(--background-color-progressive-subtle--active)
  );
}

</style>
