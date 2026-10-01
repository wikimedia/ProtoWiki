<script setup lang="ts">
import { computed, watch } from 'vue'

import { CdxProgressBar, CdxTab, CdxTabs } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'

import { useWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import {
  useWikitaLiteHome,
  type HomeFeedId,
  type PersonalizedFeedId,
} from './composables/useWikitaLiteHome'
import { useWikitaLiteContributeModuleOrder } from './composables/useWikitaLiteContributeModuleOrder'
import { useWikitaLiteDashboardMode } from './composables/useWikitaLiteDashboardMode'
import { useWikitaLiteDismissedModulesSingleton } from './composables/useWikitaLiteDismissedModules'
import { useWikitaLiteExploreModuleOrder } from './composables/useWikitaLiteExploreModuleOrder'
import { useWikitaLiteHideTabBarSingleton } from './composables/useWikitaLiteHideTabBar'
import { useWikitaLiteHomeExpansion } from './composables/useWikitaLiteHomeExpansion'
import { useWikitaLiteHomeLayout } from './composables/useWikitaLiteHomeLayout'
import { useWikitaLiteImpact } from './composables/useWikitaLiteImpact'
import { useWikitaLiteMentor } from './composables/useWikitaLiteMentor'
import { useWikitaLiteTabLoading } from './composables/useWikitaLiteTabLoading'
import { useWikitaLiteRoute } from './composables/useWikitaLiteRoute'
import { useWikitaLiteView } from './composables/useWikitaLiteView'
import WikitaLiteInterestsEmptyState from './components/WikitaLiteInterestsEmptyState.vue'
import WikitaLiteModule from './components/WikitaLiteModule.vue'
import ActiveDiscussionsModule from './modules/ActiveDiscussionsModule.vue'
import DidYouKnowModule from './modules/DidYouKnowModule.vue'
import FeaturedModule from './modules/FeaturedModule.vue'
import HelpWantedModule from './modules/HelpWantedModule.vue'
import ImpactModule from './modules/ImpactModule.vue'
import LearnModule from './modules/LearnModule.vue'
import MentorModule from './modules/MentorModule.vue'
import MentionsModule from './modules/MentionsModule.vue'
import RecentActivityModule from './modules/RecentActivityModule.vue'
import RelatedModule from './modules/RelatedModule.vue'
import SavedModule from './modules/SavedModule.vue'
import TranslationModule from './modules/TranslationModule.vue'
import TrendingModule from './modules/TrendingModule.vue'
import {
  ACTIVE_DISCUSSIONS_PAGE,
  DID_YOU_KNOW_PAGE,
  FEATURED_PAGE,
  FURTHER_READING_PAGE,
  HELP_WANTED_PAGE,
  IMPACT_PAGE,
  LEARN_PAGE,
  MENTIONS_PAGE,
  MODULE_TITLES,
  RECENT_ACTIVITY_PAGE,
  recentActivityTitleForView,
  SAVED_PAGE,
  TRANSLATIONS_PAGE,
  TRENDING_PAGE,
  VIEW_TAB_LABELS,
  type WikitaLiteView,
} from './routes'
import type { WikitaLiteModuleId } from './data/homeModuleIds'

const HOME_FEATURED_PREVIEW_LIMIT = 3
const HOME_DYK_PREVIEW_LIMIT = 4
const HOME_TRENDING_PREVIEW_LIMIT = 4
const HOME_SAVED_PREVIEW_LIMIT = 4
const HOME_MENTIONS_PREVIEW_LIMIT = 3
const HOME_FURTHER_READING_PREVIEW_LIMIT = 4
const HOME_HELP_WANTED_PREVIEW_LIMIT = 4
const HOME_RECENT_ACTIVITY_PREVIEW_LIMIT = 4
const UNSAVED_HELP_WANTED_PREVIEW_LIMIT = 1
const UNSAVED_RECENT_ACTIVITY_PREVIEW_LIMIT = 1
const HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT = 4
const HOME_TRANSLATION_PREVIEW_LIMIT = 2

const { listsVersion } = useWikitaSaveFeedback()
const { knownLanguages } = useConfig()
const { wikitaLiteRoute } = useWikitaLiteRoute()
const { activeView, selectView } = useWikitaLiteView()
const { impactCardProps, impactLoading, impactHasContent } = useWikitaLiteImpact()
const { moduleTitle: mentorModuleTitle } = useWikitaLiteMentor()

const impactPreviewCount = computed(() => (impactHasContent.value ? 1 : 0))
const impactEmptyPending = computed(() => impactLoading.value && !impactHasContent.value)
const { exploreModuleOrderStyle } = useWikitaLiteExploreModuleOrder()
const { contributeModuleOrderStyle } = useWikitaLiteContributeModuleOrder()
const { isDismissed } = useWikitaLiteDismissedModulesSingleton()
const { hideTabBar } = useWikitaLiteHideTabBarSingleton()
const { isLayoutModuleEnabled, layoutModuleOrderStyle } = useWikitaLiteHomeLayout()
const { dashboardMode } = useWikitaLiteDashboardMode()
const { canExpandInPlace, limitFor, expand } = useWikitaLiteHomeExpansion()

let getBookmarkChangeSkipFeeds: () => PersonalizedFeedId[] = () => []

/** Home modules each feed fills; a feed is on screen when any of them is. */
const FEED_MODULES: Record<HomeFeedId, WikitaLiteModuleId[]> = {
  featured: ['featured', 'didYouKnow'],
  trending: ['trending'],
  activeDiscussions: ['activeDiscussions'],
  translation: ['translation'],
  related: ['furtherReading'],
  mentions: ['mentions'],
  helpWanted: ['suggestedEdits'],
  recentChanges: ['recentActivity'],
}

const READ_TAB_MODULES: WikitaLiteModuleId[] = ['didYouKnow', 'saved', 'furtherReading', 'mentions']
const CONTRIBUTE_TAB_MODULES: WikitaLiteModuleId[] = [
  'suggestedEdits',
  'translation',
  'recentActivity',
  'activeDiscussions',
]

/**
 * Only decides request priority: feeds for modules the current tab doesn't
 * show still load, queued behind the ones on screen.
 */
function isFeedVisible(feed: HomeFeedId): boolean {
  const view = hideTabBar.value ? 'edit' : activeView.value
  return FEED_MODULES[feed].some((moduleId) => {
    if (isDismissed(moduleId)) return false
    if (view === 'read') return READ_TAB_MODULES.includes(moduleId)
    if (view === 'contribute') return CONTRIBUTE_TAB_MODULES.includes(moduleId)
    return isLayoutModuleEnabled(moduleId)
  })
}

const {
  featuredArticle,
  featuredTabLoading,
  featuredTabError,
  retryFeaturedFeed,
  trendingItems,
  trendingLoading,
  trendingTabError,
  retryTrendingFeed,
  didYouKnow,
  hasSavedPages,
  suggestionSeedsAvailable,
  showSavedBasedMentions,
  savedSorted,
  savedItemsLoading,
  ensureReadingListSummaries,
  homeRelatedItems,
  homeRelatedLoading,
  homeMentions,
  homeMentionsLoading,
  helpWanted,
  helpWantedLoading,
  recentChanges,
  recentChangesLoading,
  activeDiscussions,
  activeDiscussionsLoading,
  activeDiscussionsError,
  retryActiveDiscussionsFeed,
  translationSuggestions,
  translationLoading,
  translationError,
  retryTranslationFeed,
} = useWikitaLiteHome({
  getBookmarkChangeSkipFeeds: () => getBookmarkChangeSkipFeeds(),
  isFeedVisible,
})

const featuredHasContent = computed(() => Boolean(featuredArticle.value))

const featuredPreviewCount = computed(() => (featuredHasContent.value ? 1 : 0))

const trendingPreviewCount = computed(() => trendingItems.value.length)

const homeRelatedPreviewCount = computed(() => homeRelatedItems.value.length)

const homeMentionsPreview = computed(() =>
  homeMentions.value.slice(0, HOME_MENTIONS_PREVIEW_LIMIT),
)

const helpWantedPreviewLimit = computed(() =>
  suggestionSeedsAvailable.value || hasSavedPages.value
    ? HOME_HELP_WANTED_PREVIEW_LIMIT
    : UNSAVED_HELP_WANTED_PREVIEW_LIMIT,
)

/*
 * A module's display limit is its preview plus whatever "Show more" has
 * revealed. Every preview below derives from these, so the counts the loading
 * and empty states check stay in step with what the grid renders.
 */
const suggestedEditsLimit = computed(() => limitFor('suggestedEdits', helpWantedPreviewLimit.value))
const furtherReadingLimit = computed(() =>
  limitFor('furtherReading', HOME_FURTHER_READING_PREVIEW_LIMIT),
)
const didYouKnowLimit = computed(() => limitFor('didYouKnow', HOME_DYK_PREVIEW_LIMIT))
const trendingLimit = computed(() => limitFor('trending', HOME_TRENDING_PREVIEW_LIMIT))
const activeDiscussionsLimit = computed(() =>
  limitFor('activeDiscussions', HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT),
)
const savedLimit = computed(() => limitFor('saved', HOME_SAVED_PREVIEW_LIMIT))

/* The Saved preview is the newest four of the whole list, not a recency window. */
const savedPreview = computed(() => savedSorted.value.slice(0, savedLimit.value))

const recentActivityPreviewLimit = computed(() =>
  suggestionSeedsAvailable.value
    ? HOME_RECENT_ACTIVITY_PREVIEW_LIMIT
    : UNSAVED_RECENT_ACTIVITY_PREVIEW_LIMIT,
)

const recentActivityLimit = computed(() =>
  limitFor('recentActivity', recentActivityPreviewLimit.value),
)

const helpWantedPreview = computed(() => helpWanted.value.slice(0, suggestedEditsLimit.value))

/*
 * Loading holds a module's grid open with empty cards rather than a progress
 * bar: one for every slot its preview has room for that no card fills yet, so
 * the cards land in place instead of pushing the page down as they arrive.
 */
function skeletonsFor(loading: boolean, shown: number, limit: number): number {
  return loading ? Math.max(0, limit - shown) : 0
}

const furtherReadingEmptyPending = computed(
  () =>
    suggestionSeedsAvailable.value &&
    homeRelatedPreviewCount.value === 0 &&
    homeRelatedLoading.value,
)
const suggestedEditsEmptyPending = computed(
  () =>
    suggestionSeedsAvailable.value &&
    helpWantedPreview.value.length === 0 &&
    helpWantedLoading.value,
)

const showFurtherReadingNoSeeds = computed(
  () =>
    dashboardMode.value === 'read' &&
    isLayoutModuleEnabled('furtherReading') &&
    !suggestionSeedsAvailable.value,
)
const showSuggestedEditsNoSeeds = computed(
  () =>
    (dashboardMode.value === 'both' || dashboardMode.value === 'edit') &&
    isLayoutModuleEnabled('suggestedEdits') &&
    !suggestionSeedsAvailable.value,
)

const furtherReadingPreviewCount = computed(
  () => homeRelatedPreviewCount.value || (showFurtherReadingNoSeeds.value ? 1 : 0),
)
const suggestedEditsPreviewCount = computed(
  () => helpWantedPreview.value.length || (showSuggestedEditsNoSeeds.value ? 1 : 0),
)

const recentActivityPreview = computed(() =>
  recentChanges.value.slice(0, recentActivityLimit.value),
)

const activeDiscussionsPreviewCount = computed(() => activeDiscussions.value.length)

const translationPreview = computed(() =>
  translationSuggestions.value.slice(0, HOME_TRANSLATION_PREVIEW_LIMIT),
)

const showActiveDiscussionsContent = computed(
  () => activeDiscussions.value.length > 0 || Boolean(activeDiscussionsError.value),
)

const activeDiscussionsPending = computed(
  () =>
    activeDiscussionsLoading.value &&
    !activeDiscussions.value.length &&
    !activeDiscussionsError.value,
)

const contributeActiveDiscussionsPending = computed(
  () =>
    activeDiscussionsLoading.value &&
    !activeDiscussions.value.length &&
    !activeDiscussionsError.value,
)

const homeDidYouKnowPreview = computed(() => didYouKnow.value.slice(0, didYouKnowLimit.value))

const homePinnedDidYouKnowPreview = computed(() =>
  didYouKnow.value.slice(0, didYouKnowLimit.value),
)

const showDidYouKnowOnHome = computed(
  () =>
    isLayoutModuleEnabled('didYouKnow') &&
    !isDismissed('didYouKnow') &&
    (homePinnedDidYouKnowPreview.value.length > 0 || featuredTabLoading.value),
)

const showSavedOnHome = computed(
  () => isLayoutModuleEnabled('saved') && !isDismissed('saved'),
)

watch(
  () => [hasSavedPages.value, showSavedOnHome.value, activeView.value] as const,
  ([saved, savedOnHome, view]) => {
    if (saved && (savedOnHome || view === 'read')) {
      void ensureReadingListSummaries()
    }
  },
  { immediate: true },
)

const showTranslationModule = computed(() => knownLanguages.value.length > 0)

const recentActivityTitle = computed(() => recentActivityTitleForView(activeView.value))

function isRecentActivityVisible(): boolean {
  return recentChangesLoading.value || recentActivityPreview.value.length > 0
}

const translationPending = computed(
  () =>
    showTranslationModule.value &&
    translationLoading.value &&
    !translationPreview.value.length &&
    !translationError.value,
)

const editTab = useWikitaLiteTabLoading([
  {
    id: 'featured',
    loading: featuredTabLoading,
    previewCount: featuredPreviewCount,
    hasError: featuredTabError,
    enabled: computed(() => isLayoutModuleEnabled('featured')),
  },
  {
    id: 'trending',
    loading: trendingLoading,
    previewCount: trendingPreviewCount,
    hasError: trendingTabError,
    enabled: computed(() => isLayoutModuleEnabled('trending')),
  },
  {
    id: 'furtherReading',
    loading: homeRelatedLoading,
    previewCount: furtherReadingPreviewCount,
    previewLimit: furtherReadingLimit,
    emptyPending: furtherReadingEmptyPending,
    enabled: computed(() => isLayoutModuleEnabled('furtherReading')),
  },
  {
    id: 'suggestedEdits',
    loading: helpWantedLoading,
    previewCount: suggestedEditsPreviewCount,
    previewLimit: suggestedEditsLimit,
    emptyPending: suggestedEditsEmptyPending,
    enabled: computed(() => isLayoutModuleEnabled('suggestedEdits')),
  },
  {
    id: 'recentActivity',
    loading: recentChangesLoading,
    previewCount: computed(() => recentActivityPreview.value.length),
    previewLimit: recentActivityLimit,
    enabled: computed(() => isLayoutModuleEnabled('recentActivity')),
  },
  {
    id: 'activeDiscussions',
    loading: activeDiscussionsLoading,
    previewCount: activeDiscussionsPreviewCount,
    emptyPending: activeDiscussionsPending,
    hasError: activeDiscussionsError,
    enabled: computed(() => isLayoutModuleEnabled('activeDiscussions')),
  },
  {
    id: 'impact',
    loading: impactLoading,
    previewCount: impactPreviewCount,
    emptyPending: impactEmptyPending,
    enabled: computed(() => isLayoutModuleEnabled('impact')),
  },
  {
    id: 'saved',
    loading: savedItemsLoading,
    previewCount: computed(() => savedPreview.value.length),
    enabled: computed(() => isLayoutModuleEnabled('saved')),
  },
  {
    id: 'didYouKnow',
    loading: featuredTabLoading,
    previewCount: computed(() => homePinnedDidYouKnowPreview.value.length),
    enabled: computed(() => isLayoutModuleEnabled('didYouKnow')),
  },
])

const readExploreTab = useWikitaLiteTabLoading([
  {
    id: 'didYouKnow',
    loading: featuredTabLoading,
    previewCount: computed(() => homeDidYouKnowPreview.value.length),
  },
  {
    id: 'saved',
    loading: savedItemsLoading,
    previewCount: computed(() => savedPreview.value.length),
    enabled: hasSavedPages,
  },
  {
    id: 'furtherReading',
    loading: homeRelatedLoading,
    previewCount: homeRelatedPreviewCount,
    previewLimit: furtherReadingLimit,
    emptyPending: furtherReadingEmptyPending,
    enabled: suggestionSeedsAvailable,
  },
  {
    id: 'mentions',
    loading: homeMentionsLoading,
    previewCount: computed(() => homeMentionsPreview.value.length),
    enabled: showSavedBasedMentions,
  },
])

const contributeTab = useWikitaLiteTabLoading([
  {
    id: 'suggestedEdits',
    loading: helpWantedLoading,
    previewCount: computed(() => helpWantedPreview.value.length),
    previewLimit: suggestedEditsLimit,
    emptyPending: suggestedEditsEmptyPending,
  },
  {
    id: 'translation',
    loading: translationLoading,
    previewCount: computed(() => translationPreview.value.length),
    emptyPending: translationPending,
    hasError: translationError,
    enabled: showTranslationModule,
  },
  {
    id: 'recentActivity',
    loading: recentChangesLoading,
    previewCount: computed(() => recentActivityPreview.value.length),
    previewLimit: recentActivityLimit,
  },
  {
    id: 'activeDiscussions',
    loading: activeDiscussionsLoading,
    previewCount: activeDiscussionsPreviewCount,
    emptyPending: contributeActiveDiscussionsPending,
    hasError: activeDiscussionsError,
  },
  {
    id: 'impact',
    loading: impactLoading,
    previewCount: impactPreviewCount,
    emptyPending: impactEmptyPending,
    enabled: computed(() => isLayoutModuleEnabled('impact')),
  },
])

function isFurtherReadingVisible(): boolean {
  return homeRelatedLoading.value || homeRelatedItems.value.length > 0
}

function isMentionsVisible(): boolean {
  return homeMentionsLoading.value || homeMentionsPreview.value.length > 0
}

function isSuggestedEditsVisible(): boolean {
  return helpWantedLoading.value || helpWantedPreview.value.length > 0
}

function onSelectView(view: string) {
  if (hideTabBar.value) return
  selectView(view as WikitaLiteView)
}

watch(hideTabBar, (enabled) => {
  if (enabled && activeView.value !== 'edit') {
    selectView('edit')
  }
})

getBookmarkChangeSkipFeeds = (): PersonalizedFeedId[] => {
  if (activeView.value === 'read') {
    const skip: PersonalizedFeedId[] = ['helpWanted', 'recentChanges']
    if (isFurtherReadingVisible()) skip.push('related')
    if (isMentionsVisible()) skip.push('mentions')
    return skip
  }

  if (!hasSavedPages.value && !suggestionSeedsAvailable.value) return []

  const skip: PersonalizedFeedId[] = []

  if (activeView.value === 'edit') {
    if (isFurtherReadingVisible()) skip.push('related')
    skip.push('mentions')
    if (isSuggestedEditsVisible()) skip.push('helpWanted')
    if (isRecentActivityVisible()) skip.push('recentChanges')
    return skip
  }

  if (activeView.value === 'contribute') {
    skip.push('related', 'mentions')
    if (isSuggestedEditsVisible()) skip.push('helpWanted')
    if (isRecentActivityVisible()) skip.push('recentChanges')
    return skip
  }

  return skip
}
</script>

<template>
  <CdxTabs
    :active="hideTabBar ? 'edit' : activeView"
    :class="['wikita-lite-home__tabs', { 'wikita-lite-home__tabs--home-only': hideTabBar }]"
    @update:active="onSelectView"
  >
    <CdxTab name="edit" :label="VIEW_TAB_LABELS.edit">
      <div class="wikita-lite-home__panel">
        <WikitaLiteModule
          v-if="editTab.showModule('featured') && !isDismissed('featured')"
          module-id="featured"
          :style="layoutModuleOrderStyle('featured')"
          :title="MODULE_TITLES.featured"
          :to="wikitaLiteRoute(FEATURED_PAGE)"
        >
          <FeaturedModule
            v-if="featuredHasContent || featuredTabError || editTab.showLoadingBar('featured')"
            :featured-article="featuredArticle"
            :error="featuredTabError"
            :preview-limit="HOME_FEATURED_PREVIEW_LIMIT"
            :skeletons="editTab.showLoadingBar('featured') && !featuredHasContent ? 1 : 0"
            :lists-version="listsVersion"
            @retry="retryFeaturedFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('trending') && !isDismissed('trending')"
          module-id="trending"
          :style="layoutModuleOrderStyle('trending')"
          :title="MODULE_TITLES.trending"
          :to="wikitaLiteRoute(TRENDING_PAGE)"
        >
          <TrendingModule
            v-if="trendingItems.length || trendingTabError || editTab.showLoadingBar('trending')"
            :items="trendingItems"
            :error="trendingTabError"
            :preview-limit="trendingLimit"
            :skeletons="
              skeletonsFor(
                editTab.showLoadingBar('trending'),
                trendingItems.length,
                trendingLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('trending')"
            :lists-version="listsVersion"
            :more-to="wikitaLiteRoute(TRENDING_PAGE)"
            @retry="retryTrendingFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('furtherReading') && !isDismissed('furtherReading')"
          module-id="furtherReading"
          :style="layoutModuleOrderStyle('furtherReading')"
          :title="MODULE_TITLES.furtherReading"
          :to="wikitaLiteRoute(FURTHER_READING_PAGE)"
        >
          <WikitaLiteInterestsEmptyState v-if="showFurtherReadingNoSeeds" />
          <RelatedModule
            v-else-if="homeRelatedItems.length || editTab.showLoadingBar('furtherReading')"
            :items="homeRelatedItems"
            :loading="homeRelatedLoading"
            :preview-limit="furtherReadingLimit"
            :skeletons="
              skeletonsFor(
                editTab.showLoadingBar('furtherReading'),
                homeRelatedItems.length,
                furtherReadingLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('furtherReading')"
            :lists-version="listsVersion"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('suggestedEdits') && !isDismissed('suggestedEdits')"
          module-id="suggestedEdits"
          :style="layoutModuleOrderStyle('suggestedEdits')"
          :title="MODULE_TITLES.suggestedEdits"
          :to="wikitaLiteRoute(HELP_WANTED_PAGE)"
        >
          <WikitaLiteInterestsEmptyState v-if="showSuggestedEditsNoSeeds" />
          <HelpWantedModule
            v-else-if="helpWantedPreview.length || helpWantedLoading"
            :items="helpWanted"
            :preview-limit="suggestedEditsLimit"
            :skeletons="skeletonsFor(helpWantedLoading, helpWanted.length, suggestedEditsLimit)"
            :expandable="canExpandInPlace"
            @expand="expand('suggestedEdits')"
            :more-to="wikitaLiteRoute(HELP_WANTED_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('recentActivity') && !isDismissed('recentActivity')"
          module-id="recentActivity"
          :style="layoutModuleOrderStyle('recentActivity')"
          :title="recentActivityTitle"
          :to="wikitaLiteRoute(RECENT_ACTIVITY_PAGE)"
        >
          <RecentActivityModule
            v-if="recentActivityPreview.length || editTab.showLoadingBar('recentActivity')"
            :items="recentChanges"
            :preview-limit="recentActivityLimit"
            :skeletons="
              skeletonsFor(
                editTab.showLoadingBar('recentActivity'),
                recentChanges.length,
                recentActivityLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('recentActivity')"
            :more-to="wikitaLiteRoute(RECENT_ACTIVITY_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('activeDiscussions') && !isDismissed('activeDiscussions')"
          module-id="activeDiscussions"
          :style="layoutModuleOrderStyle('activeDiscussions')"
          :title="MODULE_TITLES.activeDiscussions"
          :to="wikitaLiteRoute(ACTIVE_DISCUSSIONS_PAGE)"
        >
          <ActiveDiscussionsModule
            v-if="showActiveDiscussionsContent || editTab.showLoadingBar('activeDiscussions')"
            :items="activeDiscussions"
            :error="activeDiscussionsError"
            :preview-limit="activeDiscussionsLimit"
            :skeletons="
              skeletonsFor(
                editTab.showLoadingBar('activeDiscussions'),
                activeDiscussions.length,
                activeDiscussionsLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('activeDiscussions')"
            :more-to="wikitaLiteRoute(ACTIVE_DISCUSSIONS_PAGE)"
            @retry="retryActiveDiscussionsFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('impact') && editTab.showModule('impact')"
          module-id="impact"
          :style="layoutModuleOrderStyle('impact')"
          :title="MODULE_TITLES.impact"
          :to="wikitaLiteRoute(IMPACT_PAGE)"
        >
          <div
            v-if="editTab.showLoadingBar('impact') && !impactHasContent"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline :aria-label="t('home.loadingImpact')" />
          </div>
          <ImpactModule v-if="impactHasContent" v-bind="impactCardProps" />
          <div
            v-if="editTab.showLoadingBar('impact') && impactHasContent"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline :aria-label="t('home.loadingImpact')" />
          </div>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="showDidYouKnowOnHome && editTab.showModule('didYouKnow')"
          module-id="didYouKnow"
          :style="layoutModuleOrderStyle('didYouKnow')"
          :title="MODULE_TITLES.didYouKnow"
          :to="wikitaLiteRoute(DID_YOU_KNOW_PAGE)"
        >
          <DidYouKnowModule
            v-if="homePinnedDidYouKnowPreview.length || editTab.showLoadingBar('didYouKnow')"
            :items="didYouKnow"
            :preview-limit="didYouKnowLimit"
            :skeletons="
              skeletonsFor(
                editTab.showLoadingBar('didYouKnow'),
                homePinnedDidYouKnowPreview.length,
                didYouKnowLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('didYouKnow')"
            :lists-version="listsVersion"
            :more-to="wikitaLiteRoute(DID_YOU_KNOW_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="showSavedOnHome && editTab.showModule('saved')"
          module-id="saved"
          :style="layoutModuleOrderStyle('saved')"
          :title="MODULE_TITLES.saved"
          :to="wikitaLiteRoute(SAVED_PAGE)"
        >
          <SavedModule
            :items="hasSavedPages ? savedSorted : []"
            :preview-limit="savedLimit"
            :skeletons="
              skeletonsFor(
                hasSavedPages && editTab.showLoadingBar('saved'),
                savedPreview.length,
                savedLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('saved')"
            :more-to="wikitaLiteRoute(SAVED_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="isLayoutModuleEnabled('mentor') && !isDismissed('mentor')"
          module-id="mentor"
          :style="layoutModuleOrderStyle('mentor')"
          :title="mentorModuleTitle"
        >
          <MentorModule />
        </WikitaLiteModule>
      </div>
    </CdxTab>

    <CdxTab v-if="!hideTabBar" name="read" :label="VIEW_TAB_LABELS.read">
      <div class="wikita-lite-home__panel">
        <WikitaLiteModule
          v-if="readExploreTab.showModule('didYouKnow') && !isDismissed('didYouKnow')"
          module-id="didYouKnow"
          :style="exploreModuleOrderStyle('didYouKnow')"
          :title="MODULE_TITLES.didYouKnow"
          :to="wikitaLiteRoute(DID_YOU_KNOW_PAGE)"
        >
          <DidYouKnowModule
            v-if="homeDidYouKnowPreview.length || readExploreTab.showLoadingBar('didYouKnow')"
            :items="didYouKnow"
            :preview-limit="didYouKnowLimit"
            :skeletons="
              skeletonsFor(
                readExploreTab.showLoadingBar('didYouKnow'),
                homeDidYouKnowPreview.length,
                didYouKnowLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('didYouKnow')"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('saved')"
          module-id="saved"
          :style="exploreModuleOrderStyle('saved')"
          :title="MODULE_TITLES.saved"
          :to="wikitaLiteRoute(SAVED_PAGE)"
        >
          <SavedModule
            :items="hasSavedPages ? savedSorted : []"
            :preview-limit="savedLimit"
            :skeletons="
              skeletonsFor(
                hasSavedPages && readExploreTab.showLoadingBar('saved'),
                savedPreview.length,
                savedLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('saved')"
            :more-to="wikitaLiteRoute(SAVED_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="
            suggestionSeedsAvailable &&
            readExploreTab.showModule('furtherReading') &&
            !isDismissed('furtherReading')
          "
          module-id="furtherReading"
          :style="exploreModuleOrderStyle('furtherReading')"
          :title="MODULE_TITLES.furtherReading"
          :to="wikitaLiteRoute(FURTHER_READING_PAGE)"
        >
          <RelatedModule
            v-if="homeRelatedItems.length || readExploreTab.showLoadingBar('furtherReading')"
            :items="homeRelatedItems"
            :loading="homeRelatedLoading"
            :preview-limit="furtherReadingLimit"
            :skeletons="
              skeletonsFor(
                readExploreTab.showLoadingBar('furtherReading'),
                homeRelatedItems.length,
                furtherReadingLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('furtherReading')"
            :lists-version="listsVersion"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="
            showSavedBasedMentions &&
            readExploreTab.showModule('mentions') &&
            !isDismissed('mentions')
          "
          module-id="mentions"
          :style="exploreModuleOrderStyle('mentions')"
          :title="MODULE_TITLES.mentions"
          :to="wikitaLiteRoute(MENTIONS_PAGE)"
        >
          <MentionsModule
            v-if="homeMentionsPreview.length || readExploreTab.showLoadingBar('mentions')"
            :items="homeMentionsPreview"
            :preview-limit="HOME_MENTIONS_PREVIEW_LIMIT"
            :skeletons="
              skeletonsFor(
                readExploreTab.showLoadingBar('mentions'),
                homeMentionsPreview.length,
                HOME_MENTIONS_PREVIEW_LIMIT,
              )
            "
            :lists-version="listsVersion"
            :more-to="wikitaLiteRoute(MENTIONS_PAGE)"
          />
        </WikitaLiteModule>
      </div>
    </CdxTab>

    <CdxTab v-if="!hideTabBar" name="contribute" :label="VIEW_TAB_LABELS.contribute">
      <div class="wikita-lite-home__panel">
        <WikitaLiteModule
          v-if="contributeTab.showModule('suggestedEdits') && !isDismissed('suggestedEdits')"
          module-id="suggestedEdits"
          :style="contributeModuleOrderStyle('suggestedEdits')"
          :title="MODULE_TITLES.suggestedEdits"
          :to="wikitaLiteRoute(HELP_WANTED_PAGE)"
        >
          <HelpWantedModule
            v-if="helpWantedPreview.length || contributeTab.showLoadingBar('suggestedEdits')"
            :items="helpWanted"
            :preview-limit="suggestedEditsLimit"
            :skeletons="
              skeletonsFor(
                contributeTab.showLoadingBar('suggestedEdits'),
                helpWanted.length,
                suggestedEditsLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('suggestedEdits')"
            :more-to="wikitaLiteRoute(HELP_WANTED_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="contributeTab.showModule('translation') && !isDismissed('translation')"
          module-id="translation"
          :style="contributeModuleOrderStyle('translation')"
          :title="MODULE_TITLES.translateArticles"
          :to="wikitaLiteRoute(TRANSLATIONS_PAGE)"
        >
          <TranslationModule
            v-if="
              translationPreview.length ||
              translationError ||
              contributeTab.showLoadingBar('translation')
            "
            :items="translationSuggestions"
            :error="translationError"
            :preview-limit="HOME_TRANSLATION_PREVIEW_LIMIT"
            :skeletons="
              skeletonsFor(
                contributeTab.showLoadingBar('translation'),
                translationPreview.length,
                HOME_TRANSLATION_PREVIEW_LIMIT,
              )
            "
            :more-to="wikitaLiteRoute(TRANSLATIONS_PAGE)"
            @retry="retryTranslationFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="contributeTab.showModule('recentActivity') && !isDismissed('recentActivity')"
          module-id="recentActivity"
          :style="contributeModuleOrderStyle('recentActivity')"
          :title="recentActivityTitle"
          :to="wikitaLiteRoute(RECENT_ACTIVITY_PAGE)"
        >
          <RecentActivityModule
            v-if="recentActivityPreview.length || contributeTab.showLoadingBar('recentActivity')"
            :items="recentChanges"
            :preview-limit="recentActivityLimit"
            :skeletons="
              skeletonsFor(
                contributeTab.showLoadingBar('recentActivity'),
                recentChanges.length,
                recentActivityLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('recentActivity')"
            :more-to="wikitaLiteRoute(RECENT_ACTIVITY_PAGE)"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="contributeTab.showModule('activeDiscussions') && !isDismissed('activeDiscussions')"
          module-id="activeDiscussions"
          :style="contributeModuleOrderStyle('activeDiscussions')"
          :title="MODULE_TITLES.activeDiscussions"
          :to="wikitaLiteRoute(ACTIVE_DISCUSSIONS_PAGE)"
        >
          <ActiveDiscussionsModule
            v-if="showActiveDiscussionsContent || contributeTab.showLoadingBar('activeDiscussions')"
            :items="activeDiscussions"
            :error="activeDiscussionsError"
            :preview-limit="activeDiscussionsLimit"
            :skeletons="
              skeletonsFor(
                contributeTab.showLoadingBar('activeDiscussions'),
                activeDiscussions.length,
                activeDiscussionsLimit,
              )
            "
            :expandable="canExpandInPlace"
            @expand="expand('activeDiscussions')"
            :more-to="wikitaLiteRoute(ACTIVE_DISCUSSIONS_PAGE)"
            @retry="retryActiveDiscussionsFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('impact') && contributeTab.showModule('impact')"
          module-id="impact"
          :style="contributeModuleOrderStyle('impact')"
          :title="MODULE_TITLES.impact"
          :to="wikitaLiteRoute(IMPACT_PAGE)"
        >
          <div
            v-if="contributeTab.showLoadingBar('impact') && !impactHasContent"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline :aria-label="t('home.loadingImpact')" />
          </div>
          <ImpactModule v-if="impactHasContent" v-bind="impactCardProps" />
          <div
            v-if="contributeTab.showLoadingBar('impact') && impactHasContent"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline :aria-label="t('home.loadingImpact')" />
          </div>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('learn')"
          module-id="learn"
          :style="contributeModuleOrderStyle('learn')"
          :title="MODULE_TITLES.learn"
          :to="wikitaLiteRoute(LEARN_PAGE)"
        >
          <LearnModule />
        </WikitaLiteModule>
      </div>
    </CdxTab>
  </CdxTabs>
</template>

<style scoped>
.wikita-lite-home__tabs {
  width: 100%;
  min-width: 0;
}

.wikita-lite-home__panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.wikita-lite-home__loading {
  padding-block: var(--spacing-50, 8px);
}
</style>
