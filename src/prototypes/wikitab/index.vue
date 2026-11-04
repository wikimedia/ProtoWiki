<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import './wikitab-surface.css'

import WikitabWordmark from './WikitabWordmark.vue'
import WikitabColorThemeButton from './WikitabColorThemeButton.vue'
import WikitabColorThemePicker from './WikitabColorThemePicker.vue'
import WikitabPotdAttribution from './WikitabPotdAttribution.vue'
import WikitabConfigureButton from './WikitabConfigureButton.vue'
import WikitabConfigurePanel from './WikitabConfigurePanel.vue'
import WikitabSavedArticlesButton from './WikitabSavedArticlesButton.vue'
import WikitabSavedArticlesPanel from './WikitabSavedArticlesPanel.vue'
import WikitabFeaturedSection from './WikitabFeaturedSection.vue'
import WikitabDailyReadsSection from './WikitabDailyReadsSection.vue'
import WikitabNearbySection from './WikitabNearbySection.vue'
import WikitabSuggestedEditsSection from './WikitabSuggestedEditsSection.vue'
import WikitabReviewChangesSection from './WikitabReviewChangesSection.vue'
import WikitabReviewChangesConfigurePanel from './WikitabReviewChangesConfigurePanel.vue'
import WikitabActiveDiscussionsSection from './WikitabActiveDiscussionsSection.vue'
import WikitabActiveDiscussionsConfigurePanel from './WikitabActiveDiscussionsConfigurePanel.vue'
import WikitabSavedSection from './WikitabSavedSection.vue'
import WikitabSearch from './WikitabSearch.vue'
import WikitabSearchPage from './WikitabSearchPage.vue'
import WikitabSection from './WikitabSection.vue'
import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'
import type { WikitabSearchArticle } from './data/fetchWikitabSearchArticles'
import {
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_DISCUSSIONS_MODULE_ID,
  WIKITAB_FEATURED_MODULE_ID,
  WIKITAB_NEARBY_MODULE_ID,
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_SECTIONS,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  type WikitabCardData,
  type WikitabCardLoading,
  type WikitabFeaturedSpotlight,
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
import { useWikitabFeatured } from './useWikitabFeatured'
import { useWikitabDailyReads } from './useWikitabDailyReads'
import { useWikitabNearby } from './useWikitabNearby'
import { useWikitabSuggestedEdits } from './useWikitabSuggestedEdits'
import { useWikitabReviewChanges } from './useWikitabReviewChanges'
import { useWikitabReviewChangesSettings } from './useWikitabReviewChangesSettings'
import { useWikitabActiveDiscussions } from './useWikitabActiveDiscussions'
import { useWikitabActiveDiscussionsSettings } from './useWikitabActiveDiscussionsSettings'
import { useWikitabPinned } from './useWikitabPinned'
import { buildEffectiveHomeOrder, useWikitabModuleOrder } from './useWikitabModuleOrder'
import {
  loadWikitabConfig,
  resetWikitabModuleConfigure,
  type WikitabSavedItem,
} from './data/wikitabConfig'
import { wikitabCardDescriptionText } from './data/wikitabCardDescription'
import { buildDailyReadsSavedFingerprint } from './data/dailyReadsCache'
import { uniqueArticleSeedsFromSavedItems, type SaveItemPayload } from './data/savedCardHelpers'
import { savedItemSeedArticle } from './data/wikitabSavedItems'
import type { WikitabSearchActivityItem } from './data/fetchWikitabSearchActivity'
import { REVIEW_CHANGES_MAX_SEEDS } from './data/fetchWikitabReviewChanges'
import type { WikitabSearchContributeItem } from './data/fetchWikitabSearchContribute'
import {
  enrichSavedModuleItems,
  savedModuleDisplayItems,
  savedModuleItemPendingLoading,
  snapshotSavedModuleItems,
  useWikitabSavedArticles,
} from './useWikitabSavedArticles'
import { articleUrl } from './data/wikitabHtml'
import { bumpWikitabSearchMountKey, useWikitabSearchMountKey } from './useWikitabSearchMount'
import { useWikitabOverlayNavigation } from './useWikitabOverlayNavigation'
import { useWikitabOverlayScrollLock } from './useWikitabOverlayScrollLock'
import { useWikitabSearchTab } from './useWikitabSearchTab'
import { cdxIconLogoWikipedia } from '@wikimedia/codex-icons'

const mainPageUrl = articleUrl('Main Page')

definePage({
  meta: {
    title: 'New tab',
    description: 'New tab home',
    platform: 'web',
    icon: cdxIconLogoWikipedia,
    favicon: 'images/wikitab-favicon.svg',
  },
})

const route = useRoute()

const searchQuery = computed(() => String(route.query.search ?? '').trim())
const searchMountKey = useWikitabSearchMountKey()
const isSearchMode = computed(() => searchQuery.value.length > 0)
const feedEnabled = computed(() => !isSearchMode.value)

const CUSTOM_MODULE_IDS = new Set<WikitabModuleId>([
  WIKITAB_SAVED_MODULE_ID,
  WIKITAB_FEATURED_MODULE_ID,
  WIKITAB_NEARBY_MODULE_ID,
  WIKITAB_DAILY_READS_MODULE_ID,
  WIKITAB_SUGGESTED_EDITS_MODULE_ID,
  WIKITAB_DISCUSSIONS_MODULE_ID,
  WIKITAB_REVIEW_CHANGES_MODULE_ID,
])

const { hiddenIds, isHidden, hideSection, showSection, reloadFromStorage: reloadHiddenSections } =
  useWikitabHiddenSections()
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
const {
  pinnedIds,
  isPinned,
  togglePin,
  orderSections,
  reloadFromStorage: reloadPinned,
} = useWikitabPinned()
const { resolvedOrder, setModuleOrder, reloadFromStorage: reloadModuleOrder } =
  useWikitabModuleOrder()
const { filterCards, filterActivityItems, hideArticle } = useWikitabHiddenArticles()
const {
  savedItems,
  isCardSaved,
  saveArticleMenuLookup,
  toggleSaveFromPayload,
  toggleSaveSearchArticle,
  toggleSaveArticleFromSeed,
  toggleSaveSuggestion,
  toggleSaveChange,
  toggleSaveImage,
  unsaveItem,
  persistEnrichedModuleItems,
} = useWikitabSavedArticles()
const {
  items: dailyReadsItems,
  pendingByKey: dailyReadsPendingByKey,
  loading: dailyReadsLoading,
  fillingInitial: dailyReadsFillingInitial,
  loadingMore: dailyReadsLoadingMore,
  hasMore: dailyReadsHasMore,
  error: dailyReadsError,
  fetchedSavedFingerprint: dailyReadsFetchedSavedFingerprint,
  refresh: refreshDailyReads,
  loadMore: loadMoreDailyReads,
  abort: abortDailyReads,
} = useWikitabDailyReads()
const {
  items: nearbyItems,
  pendingByKey: nearbyPendingByKey,
  consentPhase: nearbyConsentPhase,
  promptError: nearbyPromptError,
  loading: nearbyLoading,
  fillingInitial: nearbyFillingInitial,
  loadingMore: nearbyLoadingMore,
  hasMore: nearbyHasMore,
  error: nearbyError,
  refresh: refreshNearby,
  requestNearby,
  loadMore: loadMoreNearby,
  abort: abortNearby,
} = useWikitabNearby()
const {
  items: featuredItems,
  loadingByKind: featuredLoadingByKind,
  loading: featuredLoading,
  error: featuredError,
  loaded: featuredLoaded,
  refresh: refreshFeatured,
  abortFeatured,
} = useWikitabFeatured()
const {
  items: suggestedEditsItems,
  pendingByKey: suggestedEditsPendingByKey,
  loading: suggestedEditsLoading,
  fillingInitial: suggestedEditsFillingInitial,
  loadingMore: suggestedEditsLoadingMore,
  hasMore: suggestedEditsHasMore,
  error: suggestedEditsError,
  isLoaded: suggestedEditsLoaded,
  fetchedSavedFingerprint: suggestedEditsFetchedSavedFingerprint,
  refresh: refreshSuggestedEdits,
  loadMore: loadMoreSuggestedEdits,
  abort: abortSuggestedEdits,
} = useWikitabSuggestedEdits()
const {
  items: reviewChangesItems,
  editorKindPending: reviewChangesEditorKindPending,
  loading: reviewChangesLoading,
  fillingInitial: reviewChangesFillingInitial,
  loadingMore: reviewChangesLoadingMore,
  hasMore: reviewChangesHasMore,
  error: reviewChangesError,
  isLoaded: reviewChangesLoaded,
  fetchedSavedFingerprint: reviewChangesFetchedSavedFingerprint,
  refresh: refreshReviewChanges,
  loadMore: loadMoreReviewChanges,
  dismissActivity: dismissReviewChange,
  abort: abortReviewChanges,
} = useWikitabReviewChanges()

const {
  showSavedEdits: reviewChangesShowSavedEdits,
  showRecentRiskyEdits: reviewChangesShowRecentRiskyEdits,
  setShowSavedEdits: setReviewChangesShowSavedEdits,
  setShowRecentRiskyEdits: setReviewChangesShowRecentRiskyEdits,
} = useWikitabReviewChangesSettings()

const {
  noticeboardItems: activeDiscussionsNoticeboardItems,
  articleItems: activeDiscussionsArticleItems,
  loading: activeDiscussionsLoading,
  loadingMore: activeDiscussionsLoadingMore,
  hasMore: activeDiscussionsHasMore,
  error: activeDiscussionsError,
  isLoaded: activeDiscussionsLoaded,
  fetchedSavedFingerprint: activeDiscussionsFetchedSavedFingerprint,
  refresh: refreshActiveDiscussions,
  loadMore: loadMoreActiveDiscussions,
  abort: abortActiveDiscussions,
} = useWikitabActiveDiscussions()

const {
  showNoticeboards: discussionsShowNoticeboards,
  showSavedTalk: discussionsShowSavedTalk,
  setShowNoticeboards: setDiscussionsShowNoticeboards,
  setShowSavedTalk: setDiscussionsShowSavedTalk,
} = useWikitabActiveDiscussionsSettings()

/** Skeleton before Daily reads refresh starts (saved snapshot ready, load queued). */
const dailyReadsPending = ref(false)
/** Skeleton before Suggested edits refresh starts (saved snapshot ready, load queued). */
const suggestedEditsPending = ref(false)
/** Skeleton before Recent edits refresh starts (saved snapshot ready, load queued). */
const reviewChangesPending = ref(false)
/** Skeleton before Active discussions refresh starts (saved snapshot ready, load queued). */
const activeDiscussionsPending = ref(false)

/** Home Saved module cards — shown from the snapshot at once; enrich patches them in place. */
const savedModuleItems = ref<WikitabSavedItem[]>([])
/** Saved ids whose description / thumbnail summary is still in flight. */
const savedEnrichPending = ref(new Map<string, WikitabCardLoading>())
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

  const display = savedModuleDisplayItems(snapshot)
  savedModuleLoading.value = true
  savedModuleItems.value = display
  savedEnrichPending.value = new Map(
    display.flatMap((saved) => {
      const pending = savedModuleItemPendingLoading(saved)
      return pending ? [[saved.id, pending] as const] : []
    }),
  )

  try {
    const enriched = await enrichSavedModuleItems(snapshot, signal, (saved) => {
      savedModuleItems.value = savedModuleItems.value.map((item) =>
        item.id === saved.id ? saved : item,
      )
      const pending = new Map(savedEnrichPending.value)
      pending.delete(saved.id)
      savedEnrichPending.value = pending
    })
    if (signal.aborted) return
    savedModuleItems.value = enriched
    persistEnrichedModuleItems(enriched)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return
    savedModuleItems.value = display
  } finally {
    if (!signal.aborted) {
      savedModuleLoading.value = false
      savedEnrichPending.value = new Map()
    }
  }
}

const FEED_SECTION_IDS = new Set<WikitabSectionId>(
  WIKITAB_SECTIONS.map((section) => section.id),
)

function isFeedSectionId(id: WikitabModuleId): id is WikitabSectionId {
  return FEED_SECTION_IDS.has(id as WikitabSectionId)
}

/** Load order from pin state + configured order — skips hidden modules only. */
function computeHomeModuleLoadOrder(): WikitabModuleId[] {
  const order: WikitabModuleId[] = []

  for (const id of buildEffectiveHomeOrder(pinnedIds.value, resolvedOrder.value)) {
    if (isHidden(id)) continue
    order.push(id)
  }

  return order
}

let homeLoadGeneration = 0

function isSavedAdjacentModuleId(id: WikitabModuleId): boolean {
  return (
    id === WIKITAB_DAILY_READS_MODULE_ID ||
    id === WIKITAB_SUGGESTED_EDITS_MODULE_ID ||
    id === WIKITAB_DISCUSSIONS_MODULE_ID ||
    id === WIKITAB_REVIEW_CHANGES_MODULE_ID
  )
}

function configHasSavedSeedArticles(): boolean {
  return uniqueArticleSeedsFromSavedItems(loadWikitabConfig().savedItems).length > 0
}

function moduleNeedsSavedSnapshot(moduleId: WikitabModuleId): boolean {
  // Daily reads / Suggested edits only need the snapshot when there are seed articles to fetch.
  if (moduleId === WIKITAB_DAILY_READS_MODULE_ID || moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
    return configHasSavedSeedArticles()
  }
  // Active discussions / Recent edits seed from config saves directly — they do
  // not need the enriched Saved-module snapshot (that wait was flashing
  // skeletons on every load).
  if (moduleId === WIKITAB_DISCUSSIONS_MODULE_ID) return false
  if (moduleId === WIKITAB_REVIEW_CHANGES_MODULE_ID) return false
  return false
}

async function refreshSavedAdjacentModule(
  moduleId: WikitabModuleId,
): Promise<void> {
  const hasSeeds = configHasSavedSeedArticles()

  if (moduleId === WIKITAB_DAILY_READS_MODULE_ID) {
    if (hasSeeds) dailyReadsPending.value = true
    try {
      await refreshDailyReads(hasSeeds ? savedModuleItems.value : [])
    } finally {
      if (hasSeeds) dailyReadsPending.value = false
    }
    return
  }

  if (moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
    if (hasSeeds) suggestedEditsPending.value = true
    try {
      await refreshSuggestedEdits(hasSeeds ? savedModuleItems.value : [])
    } finally {
      if (hasSeeds) suggestedEditsPending.value = false
    }
    return
  }

  if (moduleId === WIKITAB_DISCUSSIONS_MODULE_ID) {
    const needsPending =
      !activeDiscussionsLoaded.value &&
      activeDiscussionsNoticeboardItems.value.length === 0 &&
      activeDiscussionsArticleItems.value.length === 0
    if (needsPending) activeDiscussionsPending.value = true
    try {
      // Seed from authoritative saves — no need to wait for Saved-module enrich.
      await refreshActiveDiscussions(savedItems.value)
    } finally {
      activeDiscussionsPending.value = false
    }
    return
  }

  // Same as discussions — config seeds, not Saved-module enrich.
  reviewChangesPending.value = true
  try {
    await refreshReviewChanges(savedItems.value)
  } finally {
    reviewChangesPending.value = false
  }
}

/** Refresh visible home modules top-to-bottom (respects pin + hide). */
async function refreshHomeModulesInOrder(): Promise<void> {
  if (isSearchMode.value) return

  const generation = ++homeLoadGeneration
  // Keep seed-dependent modules in a pending/skeleton state from the start of
  // the home load — otherwise they flash the "save some articles" placeholder
  // while earlier modules (Featured, etc.) are still loading.
  const hasSeedsAtLoadStart = configHasSavedSeedArticles()
  dailyReadsPending.value = showDailyReadsModule.value && hasSeedsAtLoadStart
  suggestedEditsPending.value = showSuggestedEditsModule.value && hasSeedsAtLoadStart
  activeDiscussionsPending.value = false
  reviewChangesPending.value = false
  prepareForOrderedLoad()

  const order = computeHomeModuleLoadOrder()

  // Saved enrich is network — only on Saved's own slot. Seed modules only need
  // a sync snapshot so Daily reads / Help wanted do not block Trending above.
  let savedModuleRefreshed = false
  let savedSnapshotApplied = false

  /** Sync config → `savedModuleItems` — no network. Skip if enrich already ran. */
  function ensureSavedModuleSnapshot(): void {
    if (savedSnapshotApplied || savedModuleRefreshed) return
    const snapshot = snapshotSavedModuleItems()
    if (!snapshot.length) {
      savedModuleItems.value = []
      savedModuleLoading.value = false
      savedEnrichPending.value = new Map()
    } else {
      savedModuleItems.value = savedModuleDisplayItems(snapshot)
    }
    savedSnapshotApplied = true
  }

  async function ensureSavedModuleRefreshed(): Promise<void> {
    if (savedModuleRefreshed) return
    await refreshSavedModule()
    if (generation !== homeLoadGeneration) return
    savedModuleRefreshed = true
    savedSnapshotApplied = true
  }

  async function refreshSavedAdjacentModules(
    batch: readonly WikitabModuleId[],
  ): Promise<void> {
    for (const moduleId of batch) {
      if (generation !== homeLoadGeneration) return
      if (moduleNeedsSavedSnapshot(moduleId)) ensureSavedModuleSnapshot()
      await refreshSavedAdjacentModule(moduleId)
    }
  }

  for (let index = 0; index < order.length; index++) {
    if (generation !== homeLoadGeneration) return

    const id = order[index]

    if (id === WIKITAB_SAVED_MODULE_ID) {
      await ensureSavedModuleRefreshed()
      continue
    }

    if (id === WIKITAB_FEATURED_MODULE_ID) {
      await refreshFeatured()
      continue
    }

    if (id === WIKITAB_NEARBY_MODULE_ID) {
      await refreshNearby()
      continue
    }

    if (isSavedAdjacentModuleId(id)) {
      const batch: WikitabModuleId[] = []
      while (index < order.length && isSavedAdjacentModuleId(order[index])) {
        batch.push(order[index])
        index++
      }
      index--

      if (batch.length) {
        await refreshSavedAdjacentModules(batch)
        if (generation !== homeLoadGeneration) return
      }
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

  if (moduleId === WIKITAB_FEATURED_MODULE_ID) {
    await refreshFeatured({ force: true })
    return
  }

  if (moduleId === WIKITAB_DAILY_READS_MODULE_ID) {
    await refreshSavedModule()
    await refreshDailyReads(savedModuleItems.value, { force: true })
    return
  }

  if (moduleId === WIKITAB_NEARBY_MODULE_ID) {
    await refreshNearby({ force: true })
    return
  }

  if (moduleId === WIKITAB_SUGGESTED_EDITS_MODULE_ID) {
    suggestedEditsPending.value = true
    try {
      await refreshSavedModule()
      await refreshSuggestedEdits(savedModuleItems.value, { force: true })
    } finally {
      suggestedEditsPending.value = false
    }
    return
  }

  if (moduleId === WIKITAB_DISCUSSIONS_MODULE_ID) {
    activeDiscussionsPending.value = true
    try {
      await refreshActiveDiscussions(savedItems.value, { force: true })
    } finally {
      activeDiscussionsPending.value = false
    }
    return
  }

  if (moduleId === WIKITAB_REVIEW_CHANGES_MODULE_ID) {
    reviewChangesPending.value = true
    try {
      await refreshReviewChanges(savedItems.value, { force: true })
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

const {
  moduleScreen,
  colorPickerOpen,
  configureOpen,
  reviewChangesConfigureOpen,
  activeDiscussionsConfigureOpen,
  savedPanelOpen,
  openColorPicker,
  openConfigure,
  openReviewChangesConfigure,
  openActiveDiscussionsConfigure,
  openSavedPanel: openSavedPanelRoute,
  openModuleScreen,
  closeColorPicker: closeColorPickerRoute,
  closeConfigure: closeConfigureRoute,
  closeReviewChangesConfigure,
  closeActiveDiscussionsConfigure,
  closeSavedPanel: closeSavedPanelRoute,
  closeModuleScreen: closeModuleScreenRoute,
} = useWikitabOverlayNavigation()

const colorThemeButton = ref<InstanceType<typeof WikitabColorThemeButton> | null>(null)
const configureButton = ref<InstanceType<typeof WikitabConfigureButton> | null>(null)
const savedArticlesButton = ref<InstanceType<typeof WikitabSavedArticlesButton> | null>(null)

const REVIEW_CHANGES_MODULE_ANCHOR = `wikitab-module-${WIKITAB_REVIEW_CHANGES_MODULE_ID}`
const DISCUSSIONS_MODULE_ANCHOR = `wikitab-module-${WIKITAB_DISCUSSIONS_MODULE_ID}`

/** Nudge above the module anchor after closing its settings (Codex spacing-100). */
const MODULE_SETTINGS_CLOSE_SCROLL_OFFSET_PX = 16

function scrollToModuleAfterSettingsClose(anchorId: string): void {
  const el = document.getElementById(anchorId)
  if (!el) return
  // Instant jump — `instant` where supported, else `auto` (no smooth animation).
  el.scrollIntoView({ behavior: 'instant', block: 'start' })
  window.scrollBy({
    top: -MODULE_SETTINGS_CLOSE_SCROLL_OFFSET_PX,
    left: 0,
    behavior: 'instant',
  })
}

/**
 * After closing a module fullscreen, scroll so the home module title sits at the
 * same viewport Y as the fullscreen title did (captured while the screen chrome
 * is still mounted — call from a pre-flush watch).
 *
 * Unlock restores the pre-open `scrollY` in a post flush (after the home module
 * re-enters document flow). We wait for that + a frame before measuring.
 */
function scrollHomeTitleToMatchFullscreenTitle(moduleId: WikitabModuleId): void {
  const fullscreenTitle =
    document.querySelector<HTMLElement>(
      '.wikitab-module-head--screen .wikitab-module-head__title',
    )
  const targetTop = fullscreenTitle?.getBoundingClientRect().top
  // If the panel was scrolled and the title left the viewport (Escape / Back),
  // fall back to the settings-close snap.
  const targetInView =
    targetTop != null && targetTop >= 0 && targetTop < window.innerHeight

  void nextTick(() => {
    requestAnimationFrame(() => {
      const moduleEl = document.getElementById(`wikitab-module-${moduleId}`)
      if (!moduleEl) return

      const homeTitle = moduleEl.querySelector<HTMLElement>('.wikitab-module-head__title')
      if (!homeTitle) {
        scrollToModuleAfterSettingsClose(`wikitab-module-${moduleId}`)
        return
      }

      const desiredTop =
        targetInView && targetTop != null
          ? targetTop
          : MODULE_SETTINGS_CLOSE_SCROLL_OFFSET_PX
      const delta = homeTitle.getBoundingClientRect().top - desiredTop
      if (Math.abs(delta) < 1) return
      window.scrollBy({ top: delta, left: 0, behavior: 'instant' })
    })
  })
}

async function closeColorPicker(): Promise<void> {
  closeColorPickerRoute()
  await nextTick()
  colorThemeButton.value?.focusPalette()
}

async function closeConfigure(): Promise<void> {
  closeConfigureRoute()
  await nextTick()
  configureButton.value?.focusButton()
}

async function onReviewChangesShowSavedEdits(value: boolean): Promise<void> {
  setReviewChangesShowSavedEdits(value)
  reviewChangesPending.value = true
  try {
    await refreshReviewChanges(savedItems.value, { force: true })
  } finally {
    reviewChangesPending.value = false
  }
}

async function onReviewChangesShowRecentRiskyEdits(value: boolean): Promise<void> {
  setReviewChangesShowRecentRiskyEdits(value)
  reviewChangesPending.value = true
  try {
    await refreshReviewChanges(savedItems.value, { force: true })
  } finally {
    reviewChangesPending.value = false
  }
}

async function onReviewChangesEnableSources(): Promise<void> {
  setReviewChangesShowSavedEdits(true)
  setReviewChangesShowRecentRiskyEdits(true)
  reviewChangesPending.value = true
  try {
    await refreshReviewChanges(savedItems.value, { force: true })
  } finally {
    reviewChangesPending.value = false
  }
}

async function onDiscussionsShowNoticeboards(value: boolean): Promise<void> {
  setDiscussionsShowNoticeboards(value)
  activeDiscussionsPending.value = true
  try {
    await refreshActiveDiscussions(savedItems.value, { force: true })
  } finally {
    activeDiscussionsPending.value = false
  }
}

async function onDiscussionsShowSavedTalk(value: boolean): Promise<void> {
  setDiscussionsShowSavedTalk(value)
  activeDiscussionsPending.value = true
  try {
    await refreshActiveDiscussions(savedItems.value, { force: true })
  } finally {
    activeDiscussionsPending.value = false
  }
}

async function onDiscussionsEnableSources(): Promise<void> {
  setDiscussionsShowNoticeboards(true)
  setDiscussionsShowSavedTalk(true)
  activeDiscussionsPending.value = true
  try {
    await refreshActiveDiscussions(savedItems.value, { force: true })
  } finally {
    activeDiscussionsPending.value = false
  }
}

function resetModuleConfigure(): void {
  resetWikitabModuleConfigure()
  reloadModuleOrder()
  reloadHiddenSections()
  reloadPinned()
  void refreshHomeModulesInOrder()
}

/**
 * Saved fullscreen can open from the chrome button or the home module title.
 * Only title opens should scroll the home Saved heading into place on close.
 */
const scrollToSavedModuleOnClose = ref(false)

function openSavedPanel(): void {
  scrollToSavedModuleOnClose.value = false
  openSavedPanelRoute()
}

function openModuleFromTitle(id: WikitabModuleId): void {
  scrollToSavedModuleOnClose.value = id === WIKITAB_SAVED_MODULE_ID
  openModuleScreen(id)
}

async function closeModuleScreen(): Promise<void> {
  if (moduleScreen.value === WIKITAB_SAVED_MODULE_ID) {
    await closeSavedPanel()
    return
  }
  closeModuleScreenRoute()
}

async function enrichSavedPanelItems(): Promise<void> {
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
  closeSavedPanelRoute()
  await nextTick()
  savedArticlesButton.value?.focusButton()
}

function toggleSaveFromCard(payload: SaveItemPayload): void {
  void toggleSaveFromPayload(payload)
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
    description: article.description,
  })
}

function toggleSaveFromSearchImage(image: WikitabSearchImage): void {
  toggleSaveImage(image)
}

function toggleSaveArticleFromCard(card: WikitabCardData): void {
  if (!card.seedArticle) return
  toggleSaveArticleFromSeed(card.seedArticle, {
    thumbnailUrl: card.thumbnailUrl,
    description: card.description,
  })
}

function toggleSaveArticleFromSpotlight(spot: WikitabFeaturedSpotlight): void {
  if (!spot.seedArticle) return
  toggleSaveArticleFromSeed(spot.seedArticle, {
    thumbnailUrl: spot.thumbnailUrl,
    description: wikitabCardDescriptionText(spot),
  })
}

function toggleSaveArticleFromActivity(item: WikitabSearchActivityItem): void {
  if (!item.seedArticle) return
  toggleSaveArticleFromSeed(item.seedArticle, { thumbnailUrl: item.thumbnailUrl })
}

function toggleSaveArticleFromContribute(item: WikitabSearchContributeItem): void {
  if (!item.seedArticle) return
  toggleSaveArticleFromSeed(item.seedArticle, {
    thumbnailUrl: item.thumbnailUrl,
    description: item.description,
  })
}

function toggleSaveArticleFromSavedModule(id: string): void {
  const saved = savedItems.value.find((item) => item.id === id)
  if (!saved) return
  const articleSeed = savedItemSeedArticle(saved)
  if (!articleSeed) return
  toggleSaveArticleFromSeed(articleSeed, {
    thumbnailUrl:
      saved.type === 'image' || saved.type === 'article' || saved.type === 'suggestion'
        ? saved.thumbnailUrl
        : undefined,
    description:
      saved.type === 'suggestion' || saved.type === 'article' ? saved.description : undefined,
  })
}

function selectColorTheme(id: WikitabColorThemeId): void {
  setColorTheme(id)
}

function cycleColorTheme(direction: 'prev' | 'next'): void {
  setColorTheme(colorThemeCycleId(colorThemeId.value, direction))
}

const overlayOpen = computed(
  () =>
    colorPickerOpen.value ||
    configureOpen.value ||
    reviewChangesConfigureOpen.value ||
    activeDiscussionsConfigureOpen.value ||
    moduleScreen.value !== null,
)

/**
 * Hide the home feed with `v-show` for chrome overlays / Saved.
 * Non-saved module screens keep the feed mounted and promote the home module
 * instance in place (`variant="screen"` + `.wikitab-panel`) so cards don't remount.
 */
const hideFeedForOverlay = computed(
  () =>
    colorPickerOpen.value ||
    configureOpen.value ||
    reviewChangesConfigureOpen.value ||
    activeDiscussionsConfigureOpen.value ||
    savedPanelOpen.value,
)

/** Feed section payload for a non-saved module screen (works even when the module is hidden on home). */
const moduleScreenFeedSection = computed(() => {
  const id = moduleScreen.value
  if (!id || !isFeedSectionId(id)) return null
  const section = sections.value.find((entry) => entry.spec.id === id)
  if (!section) return null
  return {
    ...section,
    items: filterCards(section.items),
  }
})

const showNonSavedModuleScreen = computed(
  () => moduleScreen.value !== null && moduleScreen.value !== WIKITAB_SAVED_MODULE_ID,
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

const moduleScreenPanelActive = computed(
  () => showNonSavedModuleScreen.value && !potdAttributionFocus.value,
)

/** Scroll-lock while a non-saved module is fullscreen (home-promoted or hidden fallback). */
useWikitabOverlayScrollLock('wikitab-module-screen-open', moduleScreenPanelActive)

const visibleSections = computed(() =>
  orderSections(sections.value, resolvedOrder.value)
    .filter((section) => !isHidden(section.spec.id))
    .map((section) => ({
      ...section,
      items: filterCards(section.items),
    })),
)

/** Visible whenever enabled in Modules settings — seed empty copy is "Nothing saved yet." */
const showSavedModule = computed(() => !isHidden(WIKITAB_SAVED_MODULE_ID))

const showFeaturedModule = computed(
  () =>
    !isHidden(WIKITAB_FEATURED_MODULE_ID) &&
    (featuredLoading.value ||
      featuredItems.value.length > 0 ||
      featuredError.value ||
      featuredLoaded.value),
)

const visibleFeaturedItems = computed(
  () => filterCards(featuredItems.value) as WikitabFeaturedSpotlight[],
)

const visibleDailyReadsItems = computed(() => filterCards(dailyReadsItems.value))

const visibleNearbyItems = computed(() => filterCards(nearbyItems.value))

const showNearbyModule = computed(() => !isHidden(WIKITAB_NEARBY_MODULE_ID))

const hasSavedArticlesForModules = computed(
  () => savedItems.value.length > 0 || savedModuleItems.value.length > 0,
)

const hasSavedSeedArticles = computed(
  () => uniqueArticleSeedsFromSavedItems(savedItems.value).length > 0,
)

const dailyReadsPendingOnHome = computed(() => {
  // No article seeds → show the save-prompt immediately (no skeleton wait).
  if (!hasSavedSeedArticles.value) return false
  return dailyReadsPending.value || savedModuleLoading.value
})

const suggestedEditsPendingOnHome = computed(() => {
  // No article seeds → show the save-prompt immediately (no skeleton wait).
  if (!hasSavedSeedArticles.value) return false
  return (
    suggestedEditsPending.value ||
    savedModuleLoading.value ||
    // Cover the gap before this module's refresh starts (home loads top-down).
    (!suggestedEditsLoaded.value && suggestedEditsItems.value.length === 0)
  )
})

/** Pending only when we have nothing to paint yet — never flash over cached cards. */
const reviewChangesPendingOnHome = computed(() => {
  if (reviewChangesItems.value.length > 0) return false
  return (
    reviewChangesPending.value ||
    (reviewChangesShowSavedEdits.value &&
      hasSavedArticlesForModules.value &&
      savedModuleLoading.value)
  )
})

/**
 * Saved-only: one tip revision per seed, so seed count caps cards. Null when
 * risky edits can grow the feed past that bound.
 */
const reviewChangesMaxKnownCards = computed(() => {
  if (!reviewChangesShowSavedEdits.value || reviewChangesShowRecentRiskyEdits.value) {
    return null
  }
  return Math.min(
    uniqueArticleSeedsFromSavedItems(savedItems.value).length,
    REVIEW_CHANGES_MAX_SEEDS,
  )
})

const hasActiveDiscussionCards = computed(
  () =>
    activeDiscussionsNoticeboardItems.value.length > 0 ||
    activeDiscussionsArticleItems.value.length > 0,
)

/** Pending only when we have nothing to paint yet — never flash over cached cards. */
const activeDiscussionsPendingOnHome = computed(() => {
  if (hasActiveDiscussionCards.value) return false
  return activeDiscussionsPending.value
})

/** Live seed-article fingerprint from authoritative saves (not the home snapshot). */
const liveSavedArticlesFingerprint = computed(() =>
  buildDailyReadsSavedFingerprint(
    uniqueArticleSeedsFromSavedItems(savedItems.value).map((seed) => seed.titleKey),
  ),
)

const showDailyReadsSavedRefresh = computed(
  () =>
    dailyReadsFetchedSavedFingerprint.value !== null &&
    dailyReadsFetchedSavedFingerprint.value !== liveSavedArticlesFingerprint.value &&
    !dailyReadsLoading.value &&
    !dailyReadsPendingOnHome.value,
)

const showSuggestedEditsSavedRefresh = computed(
  () =>
    suggestedEditsFetchedSavedFingerprint.value !== null &&
    suggestedEditsFetchedSavedFingerprint.value !== liveSavedArticlesFingerprint.value &&
    !suggestedEditsLoading.value &&
    !suggestedEditsPendingOnHome.value,
)

const showReviewChangesSavedRefresh = computed(
  () =>
    reviewChangesShowSavedEdits.value &&
    reviewChangesFetchedSavedFingerprint.value !== null &&
    reviewChangesFetchedSavedFingerprint.value !== liveSavedArticlesFingerprint.value &&
    !reviewChangesLoading.value &&
    !reviewChangesPendingOnHome.value,
)

const showActiveDiscussionsSavedRefresh = computed(
  () =>
    discussionsShowSavedTalk.value &&
    activeDiscussionsFetchedSavedFingerprint.value !== null &&
    activeDiscussionsFetchedSavedFingerprint.value !== liveSavedArticlesFingerprint.value &&
    !activeDiscussionsLoading.value &&
    !activeDiscussionsPendingOnHome.value,
)

const showDailyReadsModule = computed(() => !isHidden(WIKITAB_DAILY_READS_MODULE_ID))

const visibleSuggestedEditsItems = computed(() => filterCards(suggestedEditsItems.value))

const showSuggestedEditsModule = computed(() => !isHidden(WIKITAB_SUGGESTED_EDITS_MODULE_ID))

const visibleReviewChangesItems = computed(() => filterActivityItems(reviewChangesItems.value))

const visibleActiveDiscussionsNoticeboardItems = computed(() =>
  filterCards(activeDiscussionsNoticeboardItems.value),
)
const visibleActiveDiscussionsArticleItems = computed(() =>
  filterCards(activeDiscussionsArticleItems.value),
)

/** Visible whenever enabled in Modules settings — same as feed sections, not gated on fetch state. */
const showReviewChangesModule = computed(
  () => !isHidden(WIKITAB_REVIEW_CHANGES_MODULE_ID),
)

const showActiveDiscussionsModule = computed(
  () => !isHidden(WIKITAB_DISCUSSIONS_MODULE_ID),
)

type HomeModuleEntry =
  | { kind: 'saved' }
  | { kind: 'featured' }
  | { kind: 'nearby' }
  | { kind: 'daily-reads' }
  | { kind: 'suggested-edits' }
  | { kind: 'discussions' }
  | { kind: 'review-changes' }
  | { kind: 'feed'; section: WikitabSectionState & { items: WikitabCardData[] } }

const orderedHomeModules = computed((): HomeModuleEntry[] => {
  const modules: HomeModuleEntry[] = []

  function appendModule(id: WikitabModuleId): void {
    if (id === WIKITAB_SAVED_MODULE_ID) {
      if (showSavedModule.value) modules.push({ kind: 'saved' })
      return
    }

    if (id === WIKITAB_FEATURED_MODULE_ID) {
      if (showFeaturedModule.value) modules.push({ kind: 'featured' })
      return
    }

    if (id === WIKITAB_NEARBY_MODULE_ID) {
      if (showNearbyModule.value) modules.push({ kind: 'nearby' })
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

    if (id === WIKITAB_DISCUSSIONS_MODULE_ID) {
      if (showActiveDiscussionsModule.value) modules.push({ kind: 'discussions' })
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

function homeEntryModuleId(entry: HomeModuleEntry): WikitabModuleId {
  if (entry.kind === 'feed') return entry.section.spec.id
  if (entry.kind === 'saved') return WIKITAB_SAVED_MODULE_ID
  if (entry.kind === 'featured') return WIKITAB_FEATURED_MODULE_ID
  if (entry.kind === 'nearby') return WIKITAB_NEARBY_MODULE_ID
  if (entry.kind === 'daily-reads') return WIKITAB_DAILY_READS_MODULE_ID
  if (entry.kind === 'suggested-edits') return WIKITAB_SUGGESTED_EDITS_MODULE_ID
  if (entry.kind === 'discussions') return WIKITAB_DISCUSSIONS_MODULE_ID
  return WIKITAB_REVIEW_CHANGES_MODULE_ID
}

/** Promote the existing home instance in place (no card remount / thumbnail flash). */
function isEntryOnModuleScreen(entry: HomeModuleEntry): boolean {
  if (!moduleScreenPanelActive.value) return false
  return moduleScreen.value === homeEntryModuleId(entry)
}

/** Hidden modules aren't on the home list — fall back to a one-off screen mount. */
const moduleScreenHostedOnHome = computed(() => {
  const id = moduleScreen.value
  if (!id || id === WIKITAB_SAVED_MODULE_ID) return false
  return orderedHomeModules.value.some((entry) => homeEntryModuleId(entry) === id)
})

watch(
  () => savedItems.value.length,
  (next) => {
    if (next === 0) {
      savedModuleItems.value = []
      savedModuleLoading.value = false
      dailyReadsPending.value = false
      suggestedEditsPending.value = false
      activeDiscussionsPending.value = false
      reviewChangesPending.value = false
      void refreshDailyReads([])
      void refreshSuggestedEdits([])
      void refreshActiveDiscussions([])
      void refreshReviewChanges([])
    }
  },
)

watch(
  () => uniqueArticleSeedsFromSavedItems(savedItems.value).length,
  (next, prev) => {
    if (prev > 0 && next === 0) {
      dailyReadsPending.value = false
      suggestedEditsPending.value = false
      void refreshDailyReads([])
      void refreshSuggestedEdits([])
      return
    }
    // Placeholder → seeded: auto-fetch so modules don't leave the empty prompt
    // for blank slots (quiet Reload can't show while fetchedFingerprint is null).
    if (prev === 0 && next > 0) {
      if (isSearchMode.value) return
      dailyReadsPending.value = true
      suggestedEditsPending.value = true
      void (async () => {
        try {
          await refreshSavedModule()
          await Promise.all([
            refreshDailyReads(savedModuleItems.value, { force: true }),
            refreshSuggestedEdits(savedModuleItems.value, { force: true }),
          ])
        } finally {
          dailyReadsPending.value = false
          suggestedEditsPending.value = false
        }
      })()
    }
  },
)

onMounted(() => {
  void refreshHomeModulesInOrder()
})

onUnmounted(() => {
  savedModuleAbort?.abort()
  abortFeatured()
  abortNearby()
  abortDailyReads()
  abortSuggestedEdits()
  abortActiveDiscussions()
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

watch(reviewChangesConfigureOpen, (open, wasOpen) => {
  if (!wasOpen || open) return
  // Force-refetch so closing settings never re-settles an empty cache hit.
  void (async () => {
    reviewChangesPending.value = true
    try {
      await refreshReviewChanges(savedItems.value, { force: true })
    } finally {
      reviewChangesPending.value = false
    }
  })()
  // After the panel unmounts and scroll-lock clears, jump to the module (no animation).
  void nextTick(() => {
    scrollToModuleAfterSettingsClose(REVIEW_CHANGES_MODULE_ANCHOR)
  })
})

watch(activeDiscussionsConfigureOpen, (open, wasOpen) => {
  if (!wasOpen || open) return
  void nextTick(() => {
    scrollToModuleAfterSettingsClose(DISCUSSIONS_MODULE_ANCHOR)
  })
})

watch(
  savedPanelOpen,
  (open, wasOpen) => {
    if (open && !wasOpen) {
      void enrichSavedPanelItems()
    }
  },
  { immediate: true },
)

watch(
  moduleScreen,
  (id, prevId) => {
    if (id === prevId) return

    // Closing a module fullscreen — align the home title with where the
    // fullscreen title was (capture runs before the panel unmounts).
    if (!id && prevId) {
      const skipSavedScroll =
        prevId === WIKITAB_SAVED_MODULE_ID && !scrollToSavedModuleOnClose.value
      scrollToSavedModuleOnClose.value = false
      if (!skipSavedScroll) scrollHomeTitleToMatchFullscreenTitle(prevId)
      return
    }

    if (!id) return
    if (id === WIKITAB_SAVED_MODULE_ID) return
    if (isSearchMode.value) return
    // Visible home modules are already covered by ordered load; refresh when the
    // module is hidden (deep link) so the screen still has data.
    if (!isHidden(id)) return
    void refreshHomeModule(id)
  },
  { immediate: true },
)

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
      v-show="!hideFeedForOverlay && !potdAttributionFocus"
      class="wikitab__main"
      :aria-hidden="overlayOpen || potdAttributionFocus"
    >
      <header class="wikitab__hero">
        <div class="wikitab__hero-top">
          <h1 class="wikitab__wordmark">
            <WikitabWordmark />
          </h1>
          <div class="wikitab__hero-search">
            <WikitabSearch
              :key="searchMountKey"
              class="wikitab__search"
              :initial-query="searchQuery"
              :search-mode="isSearchMode"
            />
            <a v-if="!isSearchMode" class="wikitab__main-page-link" :href="mainPageUrl">
              Main page
            </a>
          </div>
        </div>
        <WikitabSearchPage
          v-if="isSearchMode"
          class="wikitab__search-page"
          :search-query="searchQuery"
          :is-card-saved="isCardSaved"
          :save-article-menu-lookup="saveArticleMenuLookup"
          @toggle-save-article="toggleSaveFromSearch"
          @toggle-save-activity="toggleSaveFromActivity"
          @toggle-save-activity-article="toggleSaveArticleFromActivity"
          @toggle-save-contribute="toggleSaveFromContribute"
          @toggle-save-contribute-article="toggleSaveArticleFromContribute"
          @toggle-save-image="toggleSaveFromSearchImage"
        />
      </header>

      <div v-if="!isSearchMode" class="wikitab__sections">
        <template
          v-for="entry in orderedHomeModules"
          :key="
            entry.kind === 'saved'
              ? 'saved'
              : entry.kind === 'featured'
                ? 'featured'
                : entry.kind === 'nearby'
                  ? 'nearby'
                  : entry.kind === 'daily-reads'
                    ? 'daily-reads'
                    : entry.kind === 'suggested-edits'
                      ? 'suggested-edits'
                      : entry.kind === 'discussions'
                        ? 'discussions'
                        : entry.kind === 'review-changes'
                          ? 'review-changes'
                          : entry.section.spec.id
          "
        >
          <WikitabSavedSection
            v-if="entry.kind === 'saved'"
            :saved-items="savedModuleItems"
            :item-loading="savedEnrichPending"
            :loading="savedModuleLoading"
            :pinned="isPinned(WIKITAB_SAVED_MODULE_ID)"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @toggle-pin="togglePin(WIKITAB_SAVED_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_SAVED_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_SAVED_MODULE_ID)"
            @toggle-save="toggleSaveFromSavedModule"
            @toggle-save-article="toggleSaveArticleFromSavedModule"
            @open-screen="openModuleFromTitle(WIKITAB_SAVED_MODULE_ID)"
          />
          <WikitabFeaturedSection
            v-else-if="entry.kind === 'featured'"
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :items="visibleFeaturedItems"
            :loading-by-kind="featuredLoadingByKind"
            :loading="featuredLoading"
            :loaded="featuredLoaded"
            :error="featuredError"
            :pinned="isPinned(WIKITAB_FEATURED_MODULE_ID)"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @toggle-pin="togglePin(WIKITAB_FEATURED_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_FEATURED_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_FEATURED_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @toggle-save-article="toggleSaveArticleFromSpotlight"
            @open-screen="openModuleFromTitle(WIKITAB_FEATURED_MODULE_ID)"
            @close-screen="closeModuleScreen"
          />
          <WikitabNearbySection
            v-else-if="entry.kind === 'nearby'"
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :items="visibleNearbyItems"
            :pending-by-key="nearbyPendingByKey"
            :consent-phase="nearbyConsentPhase"
            :prompt-error="nearbyPromptError"
            :loading="nearbyLoading"
            :filling-initial="nearbyFillingInitial"
            :loading-more="nearbyLoadingMore"
            :has-more="nearbyHasMore"
            :error="nearbyError"
            :pinned="isPinned(WIKITAB_NEARBY_MODULE_ID)"
            :is-card-saved="isCardSaved"
            @toggle-pin="togglePin(WIKITAB_NEARBY_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_NEARBY_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_NEARBY_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @load-more="loadMoreNearby"
            @request-nearby="requestNearby"
            @open-screen="openModuleFromTitle(WIKITAB_NEARBY_MODULE_ID)"
            @close-screen="closeModuleScreen"
          />
          <WikitabDailyReadsSection
            v-else-if="entry.kind === 'daily-reads'"
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :items="visibleDailyReadsItems"
            :pending-by-key="dailyReadsPendingByKey"
            :loading="dailyReadsLoading || dailyReadsPendingOnHome"
            :filling-initial="dailyReadsFillingInitial"
            :loading-more="dailyReadsLoadingMore"
            :has-more="dailyReadsHasMore"
            :error="dailyReadsError"
            :pinned="isPinned(WIKITAB_DAILY_READS_MODULE_ID)"
            :has-seed-articles="hasSavedSeedArticles"
            :show-saved-refresh="showDailyReadsSavedRefresh"
            :is-card-saved="isCardSaved"
            @toggle-pin="togglePin(WIKITAB_DAILY_READS_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_DAILY_READS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_DAILY_READS_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @load-more="loadMoreDailyReads"
            @open-screen="openModuleFromTitle(WIKITAB_DAILY_READS_MODULE_ID)"
            @close-screen="closeModuleScreen"
          />
          <WikitabSuggestedEditsSection
            v-else-if="entry.kind === 'suggested-edits'"
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :items="visibleSuggestedEditsItems"
            :pending-by-key="suggestedEditsPendingByKey"
            :loading="suggestedEditsLoading || suggestedEditsPendingOnHome"
            :filling-initial="suggestedEditsFillingInitial"
            :pending="suggestedEditsPendingOnHome"
            :loading-more="suggestedEditsLoadingMore"
            :has-more="suggestedEditsHasMore"
            :error="suggestedEditsError"
            :pinned="isPinned(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            :has-seed-articles="hasSavedSeedArticles"
            :show-saved-refresh="showSuggestedEditsSavedRefresh"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @toggle-pin="togglePin(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @toggle-save-article="toggleSaveArticleFromCard"
            @load-more="loadMoreSuggestedEdits"
            @open-screen="openModuleFromTitle(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
            @close-screen="closeModuleScreen"
          />
          <WikitabActiveDiscussionsSection
            v-else-if="entry.kind === 'discussions'"
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :noticeboard-items="visibleActiveDiscussionsNoticeboardItems"
            :article-items="visibleActiveDiscussionsArticleItems"
            :loading="
              !hasActiveDiscussionCards &&
              (activeDiscussionsLoading ||
                activeDiscussionsPendingOnHome ||
                !activeDiscussionsLoaded)
            "
            :pending="activeDiscussionsPendingOnHome"
            :loading-more="activeDiscussionsLoadingMore"
            :has-more="activeDiscussionsHasMore"
            :error="activeDiscussionsError"
            :pinned="isPinned(WIKITAB_DISCUSSIONS_MODULE_ID)"
            :sources-enabled="discussionsShowNoticeboards || discussionsShowSavedTalk"
            :show-noticeboards="discussionsShowNoticeboards"
            :show-saved-talk="discussionsShowSavedTalk"
            :show-saved-refresh="showActiveDiscussionsSavedRefresh"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @toggle-pin="togglePin(WIKITAB_DISCUSSIONS_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_DISCUSSIONS_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_DISCUSSIONS_MODULE_ID)"
            @open-configure="openActiveDiscussionsConfigure"
            @enable-sources="onDiscussionsEnableSources"
            @toggle-save="toggleSaveFromCard"
            @toggle-save-article="toggleSaveArticleFromCard"
            @load-more="loadMoreActiveDiscussions"
            @open-screen="openModuleFromTitle(WIKITAB_DISCUSSIONS_MODULE_ID)"
            @close-screen="closeModuleScreen"
          />
          <WikitabReviewChangesSection
            v-else-if="entry.kind === 'review-changes'"
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :items="visibleReviewChangesItems"
            :editor-kind-pending="reviewChangesEditorKindPending"
            :loading="
              reviewChangesLoading ||
              reviewChangesPendingOnHome ||
              !reviewChangesLoaded
            "
            :filling-initial="reviewChangesFillingInitial"
            :pending="reviewChangesPendingOnHome"
            :loading-more="reviewChangesLoadingMore"
            :has-more="reviewChangesHasMore"
            :error="reviewChangesError"
            :pinned="isPinned(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            :sources-enabled="
              reviewChangesShowSavedEdits || reviewChangesShowRecentRiskyEdits
            "
            :show-saved-edits="reviewChangesShowSavedEdits"
            :show-recent-risky-edits="reviewChangesShowRecentRiskyEdits"
            :max-known-cards="reviewChangesMaxKnownCards"
            :show-saved-refresh="showReviewChangesSavedRefresh"
            @toggle-pin="togglePin(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @refresh-section="refreshHomeModule(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @hide-section="hideSection(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @open-configure="openReviewChangesConfigure"
            @enable-sources="onReviewChangesEnableSources"
            @load-more="loadMoreReviewChanges"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @dismiss="dismissReviewChange"
            @toggle-save="toggleSaveFromActivity"
            @toggle-save-article="toggleSaveArticleFromActivity"
            @open-screen="openModuleFromTitle(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
            @close-screen="closeModuleScreen"
          />
          <WikitabSection
            v-else
            :variant="isEntryOnModuleScreen(entry) ? 'screen' : 'home'"
            :spec="entry.section.spec"
            :items="entry.section.items"
            :loading="isSectionLoading(entry.section.spec.id)"
            :error="error"
            :pinned="isPinned(entry.section.spec.id)"
            :is-card-saved="isCardSaved"
            :save-article-menu-lookup="saveArticleMenuLookup"
            @toggle-pin="togglePin(entry.section.spec.id)"
            @refresh-section="refreshHomeModule(entry.section.spec.id)"
            @hide-section="hideSection(entry.section.spec.id)"
            @hide-article="hideArticle"
            @toggle-save="toggleSaveFromCard"
            @toggle-save-article="toggleSaveArticleFromCard"
            @open-screen="openModuleFromTitle(entry.section.spec.id)"
            @close-screen="closeModuleScreen"
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
      :pinned-ids="pinnedIds"
      :is-hidden="isHidden"
      @close="closeConfigure"
      @reset="resetModuleConfigure"
      @show="showSection"
      @hide="hideSection"
      @reorder="setModuleOrder"
      @unpin="togglePin"
    />

    <WikitabColorThemePicker
      v-if="colorPickerOpen && !potdAttributionFocus"
      :selected-id="colorThemeId ?? DEFAULT_COLOR_THEME_ID"
      :potd-image-url="potdImageUrl"
      @close="closeColorPicker"
      @select="selectColorTheme"
    />

    <WikitabReviewChangesConfigurePanel
      v-if="reviewChangesConfigureOpen && !potdAttributionFocus"
      :show-saved-edits="reviewChangesShowSavedEdits"
      :show-recent-risky-edits="reviewChangesShowRecentRiskyEdits"
      @close="closeReviewChangesConfigure"
      @update:show-saved-edits="onReviewChangesShowSavedEdits"
      @update:show-recent-risky-edits="onReviewChangesShowRecentRiskyEdits"
    />
    <WikitabActiveDiscussionsConfigurePanel
      v-if="activeDiscussionsConfigureOpen && !potdAttributionFocus"
      :show-noticeboards="discussionsShowNoticeboards"
      :show-saved-talk="discussionsShowSavedTalk"
      @close="closeActiveDiscussionsConfigure"
      @update:show-noticeboards="onDiscussionsShowNoticeboards"
      @update:show-saved-talk="onDiscussionsShowSavedTalk"
    />

    <WikitabSavedArticlesPanel
      v-if="savedPanelOpen && !potdAttributionFocus"
      :saved-items="savedItems"
      :is-card-saved="isCardSaved"
      :save-article-menu-lookup="saveArticleMenuLookup"
      @close="closeSavedPanel"
      @toggle-save="toggleSaveFromSavedModule"
      @toggle-save-article="toggleSaveArticleFromSavedModule"
    />

    <!--
      Hidden modules aren't on the home list — mount a one-off screen instance.
      Visible home modules promote in place (variant=screen) to avoid card remount.
    -->
    <template v-if="moduleScreenPanelActive && moduleScreen && !moduleScreenHostedOnHome">
        <WikitabFeaturedSection
          v-if="moduleScreen === WIKITAB_FEATURED_MODULE_ID"
          variant="screen"
          :items="visibleFeaturedItems"
          :loading-by-kind="featuredLoadingByKind"
          :loading="featuredLoading"
          :loaded="featuredLoaded"
          :error="featuredError"
          :pinned="isPinned(WIKITAB_FEATURED_MODULE_ID)"
          :is-card-saved="isCardSaved"
          :save-article-menu-lookup="saveArticleMenuLookup"
          @refresh-section="refreshHomeModule(WIKITAB_FEATURED_MODULE_ID)"
          @hide-article="hideArticle"
          @toggle-save="toggleSaveFromCard"
          @toggle-save-article="toggleSaveArticleFromSpotlight"
          @close-screen="closeModuleScreen"
        />
        <WikitabNearbySection
          v-else-if="moduleScreen === WIKITAB_NEARBY_MODULE_ID"
          variant="screen"
          :items="visibleNearbyItems"
          :pending-by-key="nearbyPendingByKey"
          :consent-phase="nearbyConsentPhase"
          :prompt-error="nearbyPromptError"
          :loading="nearbyLoading"
          :filling-initial="nearbyFillingInitial"
          :loading-more="nearbyLoadingMore"
          :has-more="nearbyHasMore"
          :error="nearbyError"
          :pinned="isPinned(WIKITAB_NEARBY_MODULE_ID)"
          :is-card-saved="isCardSaved"
          @refresh-section="refreshHomeModule(WIKITAB_NEARBY_MODULE_ID)"
          @hide-article="hideArticle"
          @toggle-save="toggleSaveFromCard"
          @load-more="loadMoreNearby"
          @request-nearby="requestNearby"
          @close-screen="closeModuleScreen"
        />
        <WikitabDailyReadsSection
          v-else-if="moduleScreen === WIKITAB_DAILY_READS_MODULE_ID"
          variant="screen"
          :items="visibleDailyReadsItems"
          :pending-by-key="dailyReadsPendingByKey"
          :loading="dailyReadsLoading || dailyReadsPendingOnHome"
          :filling-initial="dailyReadsFillingInitial"
          :loading-more="dailyReadsLoadingMore"
          :has-more="dailyReadsHasMore"
          :error="dailyReadsError"
          :pinned="isPinned(WIKITAB_DAILY_READS_MODULE_ID)"
          :has-seed-articles="hasSavedSeedArticles"
          :show-saved-refresh="showDailyReadsSavedRefresh"
          :is-card-saved="isCardSaved"
          @refresh-section="refreshHomeModule(WIKITAB_DAILY_READS_MODULE_ID)"
          @hide-article="hideArticle"
          @toggle-save="toggleSaveFromCard"
          @load-more="loadMoreDailyReads"
          @close-screen="closeModuleScreen"
        />
        <WikitabSuggestedEditsSection
          v-else-if="moduleScreen === WIKITAB_SUGGESTED_EDITS_MODULE_ID"
          variant="screen"
          :items="visibleSuggestedEditsItems"
          :pending-by-key="suggestedEditsPendingByKey"
          :loading="suggestedEditsLoading || suggestedEditsPendingOnHome"
          :filling-initial="suggestedEditsFillingInitial"
          :pending="suggestedEditsPendingOnHome"
          :loading-more="suggestedEditsLoadingMore"
          :has-more="suggestedEditsHasMore"
          :error="suggestedEditsError"
          :pinned="isPinned(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
          :has-seed-articles="hasSavedSeedArticles"
          :show-saved-refresh="showSuggestedEditsSavedRefresh"
          :is-card-saved="isCardSaved"
          :save-article-menu-lookup="saveArticleMenuLookup"
          @refresh-section="refreshHomeModule(WIKITAB_SUGGESTED_EDITS_MODULE_ID)"
          @hide-article="hideArticle"
          @toggle-save="toggleSaveFromCard"
          @toggle-save-article="toggleSaveArticleFromCard"
          @load-more="loadMoreSuggestedEdits"
          @close-screen="closeModuleScreen"
        />
        <WikitabActiveDiscussionsSection
          v-else-if="moduleScreen === WIKITAB_DISCUSSIONS_MODULE_ID"
          variant="screen"
          :noticeboard-items="visibleActiveDiscussionsNoticeboardItems"
          :article-items="visibleActiveDiscussionsArticleItems"
          :loading="
            !hasActiveDiscussionCards &&
            (activeDiscussionsLoading ||
              activeDiscussionsPendingOnHome ||
              !activeDiscussionsLoaded)
          "
          :pending="activeDiscussionsPendingOnHome"
          :loading-more="activeDiscussionsLoadingMore"
          :has-more="activeDiscussionsHasMore"
          :error="activeDiscussionsError"
          :pinned="isPinned(WIKITAB_DISCUSSIONS_MODULE_ID)"
          :sources-enabled="discussionsShowNoticeboards || discussionsShowSavedTalk"
          :show-noticeboards="discussionsShowNoticeboards"
          :show-saved-talk="discussionsShowSavedTalk"
          :show-saved-refresh="showActiveDiscussionsSavedRefresh"
          :is-card-saved="isCardSaved"
          :save-article-menu-lookup="saveArticleMenuLookup"
          @refresh-section="refreshHomeModule(WIKITAB_DISCUSSIONS_MODULE_ID)"
          @open-configure="openActiveDiscussionsConfigure"
          @enable-sources="onDiscussionsEnableSources"
          @toggle-save="toggleSaveFromCard"
          @toggle-save-article="toggleSaveArticleFromCard"
          @load-more="loadMoreActiveDiscussions"
          @close-screen="closeModuleScreen"
        />
        <WikitabReviewChangesSection
          v-else-if="moduleScreen === WIKITAB_REVIEW_CHANGES_MODULE_ID"
          variant="screen"
          :items="visibleReviewChangesItems"
          :editor-kind-pending="reviewChangesEditorKindPending"
          :loading="
            reviewChangesLoading || reviewChangesPendingOnHome || !reviewChangesLoaded
          "
          :filling-initial="reviewChangesFillingInitial"
          :pending="reviewChangesPendingOnHome"
          :loading-more="reviewChangesLoadingMore"
          :has-more="reviewChangesHasMore"
          :error="reviewChangesError"
          :pinned="isPinned(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
          :sources-enabled="
            reviewChangesShowSavedEdits || reviewChangesShowRecentRiskyEdits
          "
          :show-saved-edits="reviewChangesShowSavedEdits"
          :show-recent-risky-edits="reviewChangesShowRecentRiskyEdits"
          :max-known-cards="reviewChangesMaxKnownCards"
          :show-saved-refresh="showReviewChangesSavedRefresh"
          :is-card-saved="isCardSaved"
          :save-article-menu-lookup="saveArticleMenuLookup"
          @refresh-section="refreshHomeModule(WIKITAB_REVIEW_CHANGES_MODULE_ID)"
          @open-configure="openReviewChangesConfigure"
          @enable-sources="onReviewChangesEnableSources"
          @load-more="loadMoreReviewChanges"
          @dismiss="dismissReviewChange"
          @toggle-save="toggleSaveFromActivity"
          @toggle-save-article="toggleSaveArticleFromActivity"
          @close-screen="closeModuleScreen"
        />
        <WikitabSection
          v-else-if="moduleScreenFeedSection"
          variant="screen"
          :spec="moduleScreenFeedSection.spec"
          :items="moduleScreenFeedSection.items"
          :loading="isSectionLoading(moduleScreenFeedSection.spec.id)"
          :error="error"
          :pinned="isPinned(moduleScreenFeedSection.spec.id)"
          :is-card-saved="isCardSaved"
          :save-article-menu-lookup="saveArticleMenuLookup"
          @refresh-section="refreshHomeModule(moduleScreenFeedSection.spec.id)"
          @hide-article="hideArticle"
          @toggle-save="toggleSaveFromCard"
          @toggle-save-article="toggleSaveArticleFromCard"
          @close-screen="closeModuleScreen"
        />
    </template>
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

.wikitab__hero-search {
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

[data-theme='dark'] .wikitab__wordmark :deep(.wikitab-wordmark__img) {
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
  background-image: linear-gradient(
      rgb(0 0 0 / var(--wikitab-potd-background-scrim, 0)),
      rgb(0 0 0 / var(--wikitab-potd-background-scrim, 0))
    ),
    var(--wikitab-potd-background-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: var(--wikitab-potd-background-opacity, 0.4);
  transition: opacity 0.2s ease;
}

.wikitab--potd-background.wikitab--potd-attribution-open::before {
  opacity: var(--wikitab-potd-background-opacity-expanded, 1);
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

.wikitab__main-page-link {
  color: var(--color-progressive);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  text-decoration: none;
}

.wikitab__main-page-link:hover,
.wikitab__main-page-link:focus-visible {
  color: var(--color-progressive--hover);
  text-decoration: underline;
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
.wikitab :deep(.wikitab-active-discussions-section__menu .cdx-menu),
.wikitab :deep(.wikitab-review-changes-section__menu .cdx-menu) {
  width: max-content !important;
  min-width: 12rem;
  max-width: none !important;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-daily-reads-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-saved-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-suggested-edits-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-active-discussions-section__menu .cdx-menu-item__text__label),
.wikitab :deep(.wikitab-review-changes-section__menu .cdx-menu-item__text__label) {
  white-space: nowrap;
}

.wikitab :deep(.wikitab-section__menu .cdx-menu--has-footer .cdx-menu__listbox) {
  margin-bottom: 0 !important;
}

.wikitab
  :deep(
    .wikitab-section__menu .cdx-menu--has-footer .cdx-menu__listbox > .cdx-menu-item:last-of-type
  ) {
  position: static;
  width: auto;
}

/*
 * Page chrome on tinted backgrounds — headings/pins use --wikitab-theme-fg (dark on
 * light / lightCards themes, inverted on neutral dark themes). Page-scope progressive
 * (Show more, tab underline) uses --color-progressive — white on lightCards tints.
 * lightCards remap card link tokens below.
 */
.wikitab--themed :deep(.wikitab-module-head__title) {
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
.wikitab--themed :deep(.wikitab-search-contribute-card),
.wikitab--themed :deep(.wikitab-potd-attribution__card) {
  --color-subtle: var(--wikitab-codex-subtle);
}

.wikitab--themed :deep(.wikitab-module-head__pin) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed :deep(.wikitab-color-theme-picker__close .cdx-icon),
.wikitab--themed :deep(.wikitab-configure-panel__close .cdx-icon),
.wikitab--themed :deep(.wikitab-module-head__close .cdx-icon),
.wikitab--themed :deep(.wikitab-review-changes-configure-panel__close .cdx-icon),
.wikitab--themed :deep(.wikitab-active-discussions-configure-panel__close .cdx-icon) {
  color: var(--wikitab-theme-fg);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-saved-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-suggested-edits-section),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-review-changes-section) {
  --color-subtle: var(--wikitab-theme-subtle);
}

.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-daily-reads-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-suggested-edits-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-review-changes-section__error),
.wikitab--themed.wikitab--tinted-subtle :deep(.wikitab-nothing-saved-yet) {
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
