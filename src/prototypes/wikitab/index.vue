<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import tabularWordmark from './assets/tabular-wikipedia-wordmark.svg'

import WikitabColorThemeButton from './WikitabColorThemeButton.vue'
import WikitabColorThemePicker from './WikitabColorThemePicker.vue'
import WikitabConfigureButton from './WikitabConfigureButton.vue'
import WikitabConfigurePanel from './WikitabConfigurePanel.vue'
import WikitabSavedArticlesButton from './WikitabSavedArticlesButton.vue'
import WikitabSavedArticlesPanel from './WikitabSavedArticlesPanel.vue'
import WikitabDailyReadsSection from './WikitabDailyReadsSection.vue'
import WikitabSuggestedEditsSection from './WikitabSuggestedEditsSection.vue'
import WikitabSavedSection from './WikitabSavedSection.vue'
import WikitabSearch from './WikitabSearch.vue'
import WikitabSearchPage from './WikitabSearchPage.vue'
import WikitabSection from './WikitabSection.vue'
import type { WikitabSearchArticle } from './data/fetchWikitabSearchArticles'
import {
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_HOME_MODULE_ORDER,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SECTIONS,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  type WikitabCardData,
  type WikitabModuleId,
  type WikitabSectionId,
} from './sections'
import type { WikitabSectionState } from './useWikitabFeed'
import {
  colorThemeCycleId,
  colorThemeIsAccentOnWhite,
  colorThemeUsesTintedPageSubtle,
  DEFAULT_COLOR_THEME_ID,
  isDefaultColorTheme,
  type WikitabColorThemeId,
} from './data/wikitabColorThemes'
import { useWikitabColorTheme } from './useWikitabColorTheme'
import { useWikitabFeed } from './useWikitabFeed'
import { useWikitabHiddenArticles } from './useWikitabHiddenArticles'
import { useWikitabHiddenSections } from './useWikitabHiddenSections'
import { useWikitabDailyReads } from './useWikitabDailyReads'
import { useWikitabSuggestedEdits } from './useWikitabSuggestedEdits'
import { useWikitabPinned } from './useWikitabPinned'
import {
  loadWikitabConfig,
  type WikitabSavedArticle,
} from './data/wikitabConfig'
import {
  enrichSavedModuleArticles,
  snapshotSavedModuleArticles,
  useWikitabSavedArticles,
} from './useWikitabSavedArticles'
import { articleTitleKey } from './data/wikitabHtml'
import { bumpWikitabSearchMountKey, useWikitabSearchMountKey } from './useWikitabSearchMount'
import { useWikitabSearchTab } from './useWikitabSearchTab'

definePage({
  meta: {
    title: 'Wikitab',
    description: 'New tab home',
    platform: 'web',
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
} = useWikitabFeed({
  enabled: feedEnabled,
  hiddenSectionIds: feedHiddenSectionIds,
  autoLoad: false,
})
const { pinnedIds, isPinned, togglePin, orderSections } = useWikitabPinned()
const { filterCards, hideArticle } = useWikitabHiddenArticles()
const { savedArticles, isSaved, toggleSave, unsaveArticle, persistEnrichedModuleArticles } =
  useWikitabSavedArticles()
const {
  items: dailyReadsItems,
  loading: dailyReadsLoading,
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
  refresh: refreshSuggestedEdits,
  loadMore: loadMoreSuggestedEdits,
  abort: abortSuggestedEdits,
} = useWikitabSuggestedEdits()

/** Skeleton before Suggested edits refresh starts (saved snapshot ready, load queued). */
const suggestedEditsPending = ref(false)

/** Home Saved module cards — empty until enrich finishes so skeletons can reserve slots. */
const savedModuleArticles = ref<WikitabSavedArticle[]>([])
const savedModuleLoading = ref(loadWikitabConfig().savedArticles.length > 0)
let savedModuleAbort: AbortController | null = null

async function refreshSavedModule(): Promise<void> {
  savedModuleAbort?.abort()
  savedModuleAbort = new AbortController()
  const { signal } = savedModuleAbort

  const snapshot = snapshotSavedModuleArticles()
  if (!snapshot.length) {
    savedModuleArticles.value = []
    savedModuleLoading.value = false
    return
  }

  savedModuleLoading.value = true
  savedModuleArticles.value = []

  try {
    const enriched = await enrichSavedModuleArticles(snapshot, signal)
    if (signal.aborted) return
    savedModuleArticles.value = enriched
    persistEnrichedModuleArticles(enriched)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return
    savedModuleArticles.value = snapshot
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

/** Load order from pin state + registry — skips hidden and saved-gated modules. */
function computeHomeModuleLoadOrder(): WikitabModuleId[] {
  const pinnedSet = new Set<WikitabModuleId>(pinnedIds.value)
  const hasSaved = loadWikitabConfig().savedArticles.length > 0
  const order: WikitabModuleId[] = []

  function consider(id: WikitabModuleId): void {
    if (isHidden(id)) return
    if (
      (id === WIKITAB_SAVED_MODULE_ID ||
        id === WIKITAB_DAILY_READS_MODULE_ID ||
        id === WIKITAB_SUGGESTED_EDITS_MODULE_ID) &&
      !hasSaved
    ) {
      return
    }
    order.push(id)
  }

  for (const id of pinnedIds.value) {
    consider(id)
  }

  for (const id of WIKITAB_HOME_MODULE_ORDER) {
    if (!pinnedSet.has(id)) consider(id)
  }

  return order
}

let homeLoadGeneration = 0

function isSavedAdjacentModuleId(id: WikitabModuleId): boolean {
  return id === WIKITAB_DAILY_READS_MODULE_ID || id === WIKITAB_SUGGESTED_EDITS_MODULE_ID
}

async function refreshSavedAdjacentModules(
  batch: readonly WikitabModuleId[],
): Promise<void> {
  const runsSuggestedEdits = batch.includes(WIKITAB_SUGGESTED_EDITS_MODULE_ID)
  if (runsSuggestedEdits) suggestedEditsPending.value = true

  try {
    await Promise.all(
      batch.map((moduleId) => {
        if (moduleId === WIKITAB_DAILY_READS_MODULE_ID) {
          return refreshDailyReads(savedModuleArticles.value)
        }
        return refreshSuggestedEdits(savedModuleArticles.value)
      }),
    )
  } finally {
    if (runsSuggestedEdits) suggestedEditsPending.value = false
  }
}

/** Refresh visible home modules top-to-bottom (respects pin + hide). */
async function refreshHomeModulesInOrder(): Promise<void> {
  if (isSearchMode.value) return

  const generation = ++homeLoadGeneration
  suggestedEditsPending.value = false
  prepareForOrderedLoad()

  const order = computeHomeModuleLoadOrder()

  const needsSavedSnapshot = order.some(
    (moduleId) =>
      moduleId === WIKITAB_DAILY_READS_MODULE_ID ||
      moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID,
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

const { colorThemeId, themeStyle, setColorTheme } = useWikitabColorTheme()
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
}

async function closeSavedPanel(): Promise<void> {
  savedPanelOpen.value = false
  await nextTick()
  savedArticlesButton.value?.focusButton()
}

function toggleSaveFromCard(card: WikitabCardData): void {
  const title = card.title ?? card.linkTitle ?? ''
  if (!title) return
  toggleSave({
    title,
    thumbnailUrl: card.thumbnailUrl,
    description: card.description,
  })
}

function toggleSaveFromSavedModule(card: WikitabCardData): void {
  const title = card.linkTitle ?? card.title ?? ''
  if (!title) return
  const key = articleTitleKey(title)
  if (!key || !isSaved(title)) return

  unsaveArticle(title)
  savedModuleArticles.value = savedModuleArticles.value.filter((article) => article.titleKey !== key)
}

function toggleSaveFromSearch(article: WikitabSearchArticle): void {
  toggleSave({
    title: article.title,
    thumbnailUrl: article.thumbnailUrl,
    description: article.description ?? article.extract,
  })
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

const visibleSections = computed(() =>
  orderSections(sections.value)
    .filter((section) => !isHidden(section.spec.id))
    .map((section) => ({
      ...section,
      items: filterCards(section.items),
    })),
)

const showSavedModule = computed(
  () =>
    !isHidden(WIKITAB_SAVED_MODULE_ID) &&
    (savedModuleLoading.value || savedModuleArticles.value.length > 0),
)

const visibleDailyReadsItems = computed(() => filterCards(dailyReadsItems.value))

const showDailyReadsModule = computed(
  () =>
    !isHidden(WIKITAB_DAILY_READS_MODULE_ID) &&
    savedModuleArticles.value.length > 0 &&
    (dailyReadsLoading.value || visibleDailyReadsItems.value.length > 0),
)

const visibleSuggestedEditsItems = computed(() => filterCards(suggestedEditsItems.value))

const showSuggestedEditsModule = computed(
  () =>
    !isHidden(WIKITAB_SUGGESTED_EDITS_MODULE_ID) &&
    savedModuleArticles.value.length > 0 &&
    (suggestedEditsPending.value ||
      suggestedEditsLoading.value ||
      suggestedEditsFillingInitial.value ||
      visibleSuggestedEditsItems.value.length > 0),
)

type HomeModuleEntry =
  | { kind: 'saved' }
  | { kind: 'daily-reads' }
  | { kind: 'suggested-edits' }
  | { kind: 'feed'; section: WikitabSectionState & { items: WikitabCardData[] } }

const orderedHomeModules = computed((): HomeModuleEntry[] => {
  const modules: HomeModuleEntry[] = []
  const pinnedSet = new Set<WikitabModuleId>(pinnedIds.value)

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

    const section = visibleSections.value.find((entry) => entry.spec.id === id)
    if (section) modules.push({ kind: 'feed', section })
  }

  for (const id of pinnedIds.value) {
    appendModule(id)
  }

  for (const id of WIKITAB_HOME_MODULE_ORDER) {
    if (!pinnedSet.has(id)) appendModule(id)
  }

  return modules
})

watch(
  () => savedArticles.value.length,
  (next) => {
    if (next === 0) {
      savedModuleArticles.value = []
      savedModuleLoading.value = false
      suggestedEditsPending.value = false
      void refreshDailyReads([])
      void refreshSuggestedEdits([])
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
      'wikitab--accent-on-white': colorThemeIsAccentOnWhite(colorThemeId),
      'wikitab--tinted-subtle':
        colorThemeId != null && colorThemeUsesTintedPageSubtle(colorThemeId),
    }"
    :style="themeStyle"
  >
    <div
      v-show="!overlayOpen"
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

    <div v-show="!overlayOpen" class="wikitab__main" :aria-hidden="overlayOpen">
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
          :is-article-saved="isSaved"
          @toggle-save-article="toggleSaveFromSearch"
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
                  : entry.section.spec.id
          "
        >
          <WikitabSavedSection
            v-if="entry.kind === 'saved'"
            :saved-articles="savedModuleArticles"
            :loading="savedModuleLoading"
            :pinned="isPinned(WIKITAB_SAVED_MODULE_ID)"
            :is-article-saved="isSaved"
            @toggle-pin="togglePin(WIKITAB_SAVED_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_SAVED_MODULE_ID)"
            @toggle-save="toggleSaveFromSavedModule"
          />
          <WikitabDailyReadsSection
            v-else-if="entry.kind === 'daily-reads'"
            :items="visibleDailyReadsItems"
            :loading="dailyReadsLoading"
            :loading-more="dailyReadsLoadingMore"
            :has-more="dailyReadsHasMore"
            :error="dailyReadsError"
            :pinned="isPinned(WIKITAB_DAILY_READS_MODULE_ID)"
            :is-article-saved="isSaved"
            @toggle-pin="togglePin(WIKITAB_DAILY_READS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_DAILY_READS_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @load-more="loadMoreDailyReads"
          />
          <WikitabSuggestedEditsSection
            v-else-if="entry.kind === 'suggested-edits'"
            :items="visibleSuggestedEditsItems"
            :loading="suggestedEditsLoading"
            :filling-initial="suggestedEditsFillingInitial"
            :pending="suggestedEditsPending"
            :loading-more="suggestedEditsLoadingMore"
            :has-more="suggestedEditsHasMore"
            :error="suggestedEditsError"
            :pinned="isPinned(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            :is-article-saved="isSaved"
            @toggle-pin="togglePin(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @load-more="loadMoreSuggestedEdits"
          />
          <WikitabSection
            v-else
            :spec="entry.section.spec"
            :items="entry.section.items"
            :loading="isSectionLoading(entry.section.spec.id)"
            :error="error"
            :pinned="isPinned(entry.section.spec.id)"
            :is-article-saved="isSaved"
            @toggle-pin="togglePin(entry.section.spec.id)"
            @hide-section="hideSection(entry.section.spec.id)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
          />
        </template>
      </div>
    </div>

    <WikitabColorThemeButton
      v-if="showColorThemeButton"
      ref="colorThemeButton"
      :aria-expanded="colorPickerOpen"
      @open="openColorPicker"
      @prev="cycleColorTheme('prev')"
      @next="cycleColorTheme('next')"
    />

    <WikitabConfigurePanel
      v-if="configureOpen"
      :is-hidden="isHidden"
      @close="closeConfigure"
      @show="showSection"
      @hide="hideSection"
    />

    <WikitabColorThemePicker
      v-if="colorPickerOpen"
      :selected-id="colorThemeId ?? DEFAULT_COLOR_THEME_ID"
      @close="closeColorPicker"
      @select="selectColorTheme"
    />

    <WikitabSavedArticlesPanel
      v-if="savedPanelOpen"
      :saved-articles="savedArticles"
      :is-article-saved="isSaved"
      @close="closeSavedPanel"
      @toggle-save="toggleSaveFromCard"
    />
  </div>
</template>

<style scoped>
.wikitab {
  --wikitab-page-gutter: var(--spacing-100);
  --wikitab-chrome-inset: var(--spacing-50);

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  padding-inline: var(--wikitab-page-gutter);
  padding-bottom: calc(var(--spacing-400) + var(--spacing-100));
  background-color: var(--background-color-base);
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
 * Section-heading ⋯ menus. Codex caps MenuButton menus at 16rem and pins the footer
 * row (position:absolute), so width:max-content never sees "About …" labels. Unpin
 * the footer and drop the cap; positioning stays on Floating UI.
 */
.wikitab :deep(.wikitab-section__menu .cdx-menu),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu) {
  width: max-content !important;
  min-width: 12rem;
  max-width: none !important;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu-item__text__label) {
  white-space: nowrap;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu--has-footer .cdx-menu__listbox),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu--has-footer .cdx-menu__listbox) {
  margin-bottom: 0 !important;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type) {
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
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-search-result-card),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section) {
  --color-subtle: var(--wikitab-theme-subtle);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-section__empty) {
  color: var(--wikitab-theme-subtle);
}

.wikitab--themed :deep(.wikitab-card),
.wikitab--themed :deep(.wikitab-search-activity-card),
.wikitab--themed :deep(.wikitab-search-contribute-card) {
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
.wikitab--themed :deep(.wikitab-suggested-edits-section__heading) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed :deep(.wikitab-saved-section__pin),
.wikitab--themed :deep(.wikitab-daily-reads-section__pin),
.wikitab--themed :deep(.wikitab-suggested-edits-section__pin) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-saved-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-suggested-edits-section) {
  --color-subtle: var(--wikitab-theme-subtle);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section__empty),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-suggested-edits-section__error) {
  color: var(--wikitab-theme-subtle);
}

/* Section ⋯, configure, saved, and palette — same quiet icon color (Codex neutral, not theme-subtle). */
.wikitab--themed :deep(.wikitab-section__menu .cdx-icon),
.wikitab--themed :deep(.wikitab-saved-section__menu .cdx-icon),
.wikitab--themed :deep(.wikitab-daily-reads-section__menu .cdx-icon),
.wikitab--themed :deep(.wikitab-suggested-edits-section__menu .cdx-icon),
.wikitab--themed :deep(.wikitab-configure-button .cdx-icon),
.wikitab--themed :deep(.wikitab-saved-articles-button .cdx-icon),
.wikitab--themed :deep(.wikitab-color-theme-button .cdx-icon) {
  color: var(--color-neutral);
}

/*
 * Page-chrome quiet buttons (section ⋯, Show more, palette, picker close): Codex hover
 * uses multiply blend + gray/blue subtle fill — replace with theme washes from
 * --wikitab-theme-quiet-* (colorThemePageStyle). No background-color transition.
 */
.wikitab--themed :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-section__more-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-saved-section__menu .cdx-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-saved-section__more-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-daily-reads-section__menu .cdx-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-daily-reads-section__more-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-suggested-edits-section__menu .cdx-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-suggested-edits-section__more-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-saved-articles-panel__more-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-configure-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-saved-articles-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-configure-panel__close.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-saved-articles-panel__close.cdx-button--weight-quiet),
.wikitab--themed :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet) {
  mix-blend-mode: normal;
  background-color: transparent;
  border-color: transparent;
  transition-property: color, border-color, box-shadow;
}

.wikitab--themed :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-section__more-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-saved-section__menu .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-saved-section__more-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-daily-reads-section__menu .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-daily-reads-section__more-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-suggested-edits-section__menu .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-suggested-edits-section__more-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-saved-articles-panel__more-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-configure-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-saved-articles-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-configure-panel__close.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-saved-articles-panel__close.cdx-button--weight-quiet:hover),
.wikitab--themed :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet:hover) {
  background-color: var(--wikitab-theme-quiet-hover-bg);
}

.wikitab--themed :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-section__menu .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-section__more-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-section__more-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-saved-section__menu .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-saved-section__menu .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-saved-section__more-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-saved-section__more-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-daily-reads-section__menu .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-daily-reads-section__menu .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-daily-reads-section__more-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-daily-reads-section__more-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-suggested-edits-section__menu .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-suggested-edits-section__menu .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-suggested-edits-section__more-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-suggested-edits-section__more-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-saved-articles-panel__more-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-saved-articles-panel__more-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-configure-button.cdx-button--weight-quiet:active),
.wikitab--themed :deep(.wikitab-configure-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-saved-articles-button.cdx-button--weight-quiet:active),
.wikitab--themed :deep(.wikitab-saved-articles-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet:active),
.wikitab--themed :deep(.wikitab-color-theme-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-configure-panel__close.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-configure-panel__close.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-saved-articles-panel__close.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-saved-articles-panel__close.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-color-theme-picker__close.cdx-button--weight-quiet.cdx-button--is-active) {
  background-color: var(--wikitab-theme-quiet-active-bg);
}

/*
 * Themed thumbnail borders on tinted page surfaces only (Articles + Images tabs).
 * White cards (feed, Activity, Contribute) and the search typeahead keep Codex defaults.
 */
.wikitab--themed:not(.wikitab--accent-on-white)
  :deep(.wikitab-search-result-card .cdx-thumbnail__image),
.wikitab--themed:not(.wikitab--accent-on-white)
  :deep(.wikitab-search-result-card .cdx-thumbnail__placeholder) {
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
.wikitab--themed :deep(.wikitab-card),
.wikitab--themed :deep(.wikitab-search-activity-card),
.wikitab--themed :deep(.wikitab-search-contribute-card) {
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

/* Card ⋯ menus — theme focus ring + open/active wash (Codex quiet defaults to blue). */
.wikitab--themed :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet),
.wikitab--themed
  :deep(.wikitab-search-result-card__menu-button .cdx-button.cdx-button--weight-quiet),
.wikitab--themed
  :deep(.wikitab-search-activity-card__menu-button .cdx-button.cdx-button--weight-quiet) {
  mix-blend-mode: normal;
  background-color: transparent;
  border-color: transparent;
  transition-property: color, border-color, box-shadow;
}

.wikitab--themed :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed
  :deep(.wikitab-search-result-card__menu-button .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed
  :deep(.wikitab-search-activity-card__menu-button .cdx-button.cdx-button--weight-quiet:hover),
.wikitab--themed
  :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet[aria-expanded='true']),
.wikitab--themed
  :deep(
    .wikitab-search-result-card__menu-button
      .cdx-button.cdx-button--weight-quiet[aria-expanded='true']
  ),
.wikitab--themed
  :deep(
    .wikitab-search-activity-card__menu-button
      .cdx-button.cdx-button--weight-quiet[aria-expanded='true']
  ) {
  background-color: var(--wikitab-theme-quiet-hover-bg);
}

.wikitab--themed :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-search-result-card__menu-button .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-search-activity-card__menu-button .cdx-button.cdx-button--weight-quiet:active),
.wikitab--themed
  :deep(.wikitab-card__menu-button .cdx-button.cdx-button--weight-quiet.cdx-button--is-active),
.wikitab--themed
  :deep(
    .wikitab-search-result-card__menu-button
      .cdx-button.cdx-button--weight-quiet.cdx-button--is-active
  ),
.wikitab--themed
  :deep(
    .wikitab-search-activity-card__menu-button
      .cdx-button.cdx-button--weight-quiet.cdx-button--is-active
  ) {
  background-color: var(--wikitab-theme-quiet-active-bg);
}
</style>
