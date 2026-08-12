<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar, CdxTab, CdxTabs } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'

import { useWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome, type PersonalizedFeedId } from './composables/useWikitaLiteHome'
import { useWikitaLiteContributeModuleOrder } from './composables/useWikitaLiteContributeModuleOrder'
import { useWikitaLiteDismissedModulesSingleton } from './composables/useWikitaLiteDismissedModules'
import { useWikitaLiteExploreModuleOrder } from './composables/useWikitaLiteExploreModuleOrder'
import { useWikitaLiteHomeModuleOrder } from './composables/useWikitaLiteHomeModuleOrder'
import { useWikitaLiteImpact } from './composables/useWikitaLiteImpact'
import { useWikitaLiteTabLoading } from './composables/useWikitaLiteTabLoading'
import { useWikitaLiteView } from './composables/useWikitaLiteView'
import WikitaLiteModule from './components/WikitaLiteModule.vue'
import ActiveDiscussionsModule from './modules/ActiveDiscussionsModule.vue'
import DidYouKnowModule from './modules/DidYouKnowModule.vue'
import FeaturedModule from './modules/FeaturedModule.vue'
import HelpWantedModule from './modules/HelpWantedModule.vue'
import ImpactModule from './modules/ImpactModule.vue'
import LearnModule from './modules/LearnModule.vue'
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

const HOME_FEATURED_PREVIEW_LIMIT = 3
const HOME_TRENDING_PREVIEW_LIMIT = 2
const HOME_DYK_PREVIEW_LIMIT = 2
const EXPLORE_UNSAVED_DYK_PREVIEW_LIMIT = 3
const HOME_SAVED_PREVIEW_LIMIT = 5
const HOME_MENTIONS_PREVIEW_LIMIT = 3
const HOME_FURTHER_READING_PREVIEW_LIMIT = 3
const HOME_EDIT_FURTHER_READING_PREVIEW_LIMIT = 1
const HOME_HELP_WANTED_PREVIEW_LIMIT = 3
const HOME_RECENT_ACTIVITY_PREVIEW_LIMIT = 3
const UNSAVED_HELP_WANTED_PREVIEW_LIMIT = 1
const UNSAVED_RECENT_ACTIVITY_PREVIEW_LIMIT = 1
const HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT = 2
const HOME_TRANSLATION_PREVIEW_LIMIT = 2

const { listsVersion } = useWikitaSaveFeedback()
const { knownLanguages } = useConfig()
const { activeView, selectView } = useWikitaLiteView()
const { showImpact, impactCardProps, onImpactRefresh } = useWikitaLiteImpact()
const { homeModuleOrderStyle } = useWikitaLiteHomeModuleOrder()
const { exploreModuleOrderStyle } = useWikitaLiteExploreModuleOrder()
const { contributeModuleOrderStyle } = useWikitaLiteContributeModuleOrder()
const { isDismissed } = useWikitaLiteDismissedModulesSingleton()

let getBookmarkChangeSkipFeeds: () => PersonalizedFeedId[] = () => []

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
  recentlySaved,
  savedItemsLoading,
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
} = useWikitaLiteHome({ getBookmarkChangeSkipFeeds: () => getBookmarkChangeSkipFeeds() })

const featuredHasContent = computed(() => Boolean(featuredArticle.value))

const featuredPreviewCount = computed(() => (featuredHasContent.value ? 1 : 0))

const trendingPreviewCount = computed(() => trendingItems.value.length)

const homeFurtherReadingPreview = computed(() =>
  homeRelatedItems.value.slice(0, HOME_FURTHER_READING_PREVIEW_LIMIT),
)

const homeEditFurtherReadingPreview = computed(() =>
  homeRelatedItems.value.slice(0, HOME_EDIT_FURTHER_READING_PREVIEW_LIMIT),
)

const homeMentionsPreview = computed(() =>
  homeMentions.value.slice(0, HOME_MENTIONS_PREVIEW_LIMIT),
)

const helpWantedPreviewLimit = computed(() =>
  suggestionSeedsAvailable.value || hasSavedPages.value
    ? HOME_HELP_WANTED_PREVIEW_LIMIT
    : UNSAVED_HELP_WANTED_PREVIEW_LIMIT,
)

const recentActivityPreviewLimit = computed(() =>
  hasSavedPages.value
    ? HOME_RECENT_ACTIVITY_PREVIEW_LIMIT
    : UNSAVED_RECENT_ACTIVITY_PREVIEW_LIMIT,
)

const helpWantedPreview = computed(() =>
  helpWanted.value.slice(0, helpWantedPreviewLimit.value),
)

const recentActivityPreview = computed(() =>
  recentChanges.value.slice(0, recentActivityPreviewLimit.value),
)

const activeDiscussionsPreview = computed(() =>
  activeDiscussions.value.slice(0, HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT),
)

const translationPreview = computed(() =>
  translationSuggestions.value.slice(0, HOME_TRANSLATION_PREVIEW_LIMIT),
)

const exploreDidYouKnowPreviewLimit = computed(() =>
  hasSavedPages.value ? HOME_DYK_PREVIEW_LIMIT : EXPLORE_UNSAVED_DYK_PREVIEW_LIMIT,
)

const homeDidYouKnowPreview = computed(() =>
  didYouKnow.value.slice(0, exploreDidYouKnowPreviewLimit.value),
)

const showTranslationModule = computed(() => knownLanguages.value.length > 0)

const showEditTranslationModule = computed(
  () => showTranslationModule.value && hasSavedPages.value,
)

const recentActivityTitle = computed(() => recentActivityTitleForView(activeView.value))

function isRecentActivityVisible(): boolean {
  return recentActivityPreview.value.length > 0 && !recentChangesLoading.value
}

const showRecentActivityModule = computed(
  () => hasSavedPages.value && isRecentActivityVisible(),
)

const activeDiscussionsPreviewCount = computed(() => activeDiscussionsPreview.value.length)

const showActiveDiscussionsContent = computed(
  () =>
    activeDiscussionsPreview.value.length > 0 || Boolean(activeDiscussionsError.value),
)

const activeDiscussionsPending = computed(
  () =>
    hasSavedPages.value &&
    showRecentActivityModule.value &&
    activeDiscussionsLoading.value &&
    !activeDiscussionsPreview.value.length &&
    !activeDiscussionsError.value,
)

const contributeActiveDiscussionsPending = computed(
  () =>
    activeDiscussionsLoading.value &&
    !activeDiscussionsPreview.value.length &&
    !activeDiscussionsError.value,
)

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
  },
  {
    id: 'trending',
    loading: trendingLoading,
    previewCount: trendingPreviewCount,
    hasError: trendingTabError,
  },
  {
    id: 'furtherReading',
    loading: homeRelatedLoading,
    previewCount: computed(() => homeEditFurtherReadingPreview.value.length),
    enabled: suggestionSeedsAvailable,
  },
  {
    id: 'suggestedEdits',
    loading: helpWantedLoading,
    previewCount: computed(() => helpWantedPreview.value.length),
    enabled: suggestionSeedsAvailable,
  },
  {
    id: 'translation',
    loading: translationLoading,
    previewCount: computed(() => translationPreview.value.length),
    emptyPending: translationPending,
    hasError: translationError,
    enabled: showEditTranslationModule,
  },
  {
    id: 'recentActivity',
    loading: recentChangesLoading,
    previewCount: computed(() => recentActivityPreview.value.length),
    enabled: hasSavedPages,
  },
  {
    id: 'activeDiscussions',
    loading: activeDiscussionsLoading,
    previewCount: activeDiscussionsPreviewCount,
    emptyPending: activeDiscussionsPending,
    hasError: activeDiscussionsError,
    enabled: hasSavedPages,
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
    previewCount: computed(() => recentlySaved.value.length),
    enabled: hasSavedPages,
  },
  {
    id: 'furtherReading',
    loading: homeRelatedLoading,
    previewCount: computed(() => homeFurtherReadingPreview.value.length),
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
  },
  {
    id: 'activeDiscussions',
    loading: activeDiscussionsLoading,
    previewCount: activeDiscussionsPreviewCount,
    emptyPending: contributeActiveDiscussionsPending,
    hasError: activeDiscussionsError,
  },
])

function isFurtherReadingVisible(): boolean {
  if (homeRelatedLoading.value) return false
  if (activeView.value === 'edit') {
    return homeEditFurtherReadingPreview.value.length > 0
  }
  return homeFurtherReadingPreview.value.length > 0
}

function isMentionsVisible(): boolean {
  return homeMentionsPreview.value.length > 0 && !homeMentionsLoading.value
}

function isSuggestedEditsVisible(): boolean {
  return helpWantedPreview.value.length > 0 && !helpWantedLoading.value
}

function onSelectView(view: string) {
  selectView(view as WikitaLiteView)
}

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
    :active="activeView"
    class="wikita-lite-home__tabs"
    @update:active="onSelectView"
  >
    <CdxTab name="edit" :label="VIEW_TAB_LABELS.edit">
      <div class="wikita-lite-home__panel">
        <WikitaLiteModule
          v-if="editTab.showModule('featured') && !isDismissed('featured')"
          module-id="featured"
          :style="homeModuleOrderStyle('featured')"
          :title="MODULE_TITLES.featured"
          :to="FEATURED_PAGE"
        >
          <div
            v-if="editTab.showLoadingBar('featured') && !featuredHasContent && !featuredTabError"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading featured" />
          </div>
          <FeaturedModule
            v-if="featuredHasContent || featuredTabError"
            :featured-article="featuredArticle"
            :error="featuredTabError"
            :preview-limit="HOME_FEATURED_PREVIEW_LIMIT"
            :lists-version="listsVersion"
            @retry="retryFeaturedFeed"
          >
            <template v-if="editTab.showLoadingBar('featured') && featuredHasContent" #after-cards>
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading featured" />
              </div>
            </template>
          </FeaturedModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('trending') && !isDismissed('trending')"
          module-id="trending"
          :style="homeModuleOrderStyle('trending')"
          :title="MODULE_TITLES.trending"
          :to="TRENDING_PAGE"
        >
          <div
            v-if="editTab.showLoadingBar('trending') && !trendingItems.length && !trendingTabError"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading trending" />
          </div>
          <TrendingModule
            v-if="trendingItems.length || trendingTabError"
            :items="trendingItems"
            :error="trendingTabError"
            :preview-limit="HOME_TRENDING_PREVIEW_LIMIT"
            :lists-version="listsVersion"
            @retry="retryTrendingFeed"
          >
            <template v-if="editTab.showLoadingBar('trending') && trendingItems.length" #after-cards>
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading trending" />
              </div>
            </template>
          </TrendingModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('furtherReading') && !isDismissed('furtherReading')"
          module-id="furtherReading"
          :style="homeModuleOrderStyle('furtherReading')"
          :title="MODULE_TITLES.furtherReading"
          :to="FURTHER_READING_PAGE"
        >
          <div
            v-if="editTab.showLoadingBar('furtherReading') && !homeEditFurtherReadingPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading further reading" />
          </div>
          <RelatedModule
            v-if="homeEditFurtherReadingPreview.length"
            :items="homeEditFurtherReadingPreview"
            :preview-limit="HOME_EDIT_FURTHER_READING_PREVIEW_LIMIT"
            :lists-version="listsVersion"
          >
            <template
              v-if="editTab.showLoadingBar('furtherReading') && homeEditFurtherReadingPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading further reading" />
              </div>
            </template>
          </RelatedModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('suggestedEdits') && !isDismissed('suggestedEdits')"
          module-id="suggestedEdits"
          :style="homeModuleOrderStyle('suggestedEdits')"
          :title="MODULE_TITLES.suggestedEdits"
          :to="HELP_WANTED_PAGE"
        >
          <div
            v-if="editTab.showLoadingBar('suggestedEdits') && !helpWantedPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading edit suggestions" />
          </div>
          <HelpWantedModule
            v-if="helpWantedPreview.length"
            :items="helpWantedPreview"
            :preview-limit="helpWantedPreviewLimit"
            :more-to="HELP_WANTED_PAGE"
          >
            <template
              v-if="editTab.showLoadingBar('suggestedEdits') && helpWantedPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading edit suggestions" />
              </div>
            </template>
          </HelpWantedModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('translation') && !isDismissed('translation')"
          module-id="translation"
          :style="homeModuleOrderStyle('translation')"
          :title="MODULE_TITLES.translateArticles"
          :to="TRANSLATIONS_PAGE"
        >
          <div
            v-if="
              editTab.showLoadingBar('translation') &&
              !translationPreview.length &&
              !translationError
            "
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading translation suggestions" />
          </div>
          <TranslationModule
            v-if="translationPreview.length || translationError"
            :items="translationSuggestions"
            :error="translationError"
            :preview-limit="HOME_TRANSLATION_PREVIEW_LIMIT"
            :more-to="TRANSLATIONS_PAGE"
            @retry="retryTranslationFeed"
          >
            <template
              v-if="
                editTab.showLoadingBar('translation') &&
                (translationPreview.length || translationError)
              "
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading translation suggestions" />
              </div>
            </template>
          </TranslationModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('recentActivity') && !isDismissed('recentActivity')"
          module-id="recentActivity"
          :style="homeModuleOrderStyle('recentActivity')"
          :title="recentActivityTitle"
          :to="RECENT_ACTIVITY_PAGE"
        >
          <div
            v-if="editTab.showLoadingBar('recentActivity') && !recentActivityPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading recent activity" />
          </div>
          <RecentActivityModule
            v-if="recentActivityPreview.length"
            :items="recentActivityPreview"
            :preview-limit="recentActivityPreviewLimit"
            :more-to="RECENT_ACTIVITY_PAGE"
          >
            <template
              v-if="editTab.showLoadingBar('recentActivity') && recentActivityPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading recent activity" />
              </div>
            </template>
          </RecentActivityModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="editTab.showModule('activeDiscussions') && !isDismissed('activeDiscussions')"
          module-id="activeDiscussions"
          :style="homeModuleOrderStyle('activeDiscussions')"
          :title="MODULE_TITLES.activeDiscussions"
          :to="ACTIVE_DISCUSSIONS_PAGE"
        >
          <div
            v-if="editTab.showLoadingBar('activeDiscussions') && !showActiveDiscussionsContent"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading active discussions" />
          </div>
          <ActiveDiscussionsModule
            v-if="showActiveDiscussionsContent"
            :items="activeDiscussionsPreview"
            :error="activeDiscussionsError"
            :preview-limit="HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT"
            @retry="retryActiveDiscussionsFeed"
          >
            <template
              v-if="editTab.showLoadingBar('activeDiscussions') && showActiveDiscussionsContent"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading active discussions" />
              </div>
            </template>
          </ActiveDiscussionsModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="showImpact && !isDismissed('impact')"
          module-id="impact"
          :style="homeModuleOrderStyle('impact')"
          :title="MODULE_TITLES.impact"
          :to="IMPACT_PAGE"
        >
          <ImpactModule v-bind="impactCardProps" @refresh="onImpactRefresh" />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('learn')"
          module-id="learn"
          :style="homeModuleOrderStyle('learn')"
          :title="MODULE_TITLES.learn"
          :to="LEARN_PAGE"
        >
          <LearnModule />
        </WikitaLiteModule>
      </div>
    </CdxTab>

    <CdxTab name="read" :label="VIEW_TAB_LABELS.read">
      <div class="wikita-lite-home__panel">
        <WikitaLiteModule
          v-if="readExploreTab.showModule('didYouKnow') && !isDismissed('didYouKnow')"
          module-id="didYouKnow"
          :style="exploreModuleOrderStyle('didYouKnow')"
          :title="MODULE_TITLES.didYouKnow"
          :to="DID_YOU_KNOW_PAGE"
        >
          <div
            v-if="readExploreTab.showLoadingBar('didYouKnow') && !homeDidYouKnowPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading Did you know" />
          </div>
          <DidYouKnowModule
            v-if="homeDidYouKnowPreview.length"
            :items="didYouKnow"
            :preview-limit="exploreDidYouKnowPreviewLimit"
          >
            <template
              v-if="readExploreTab.showLoadingBar('didYouKnow') && homeDidYouKnowPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading Did you know" />
              </div>
            </template>
          </DidYouKnowModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('saved')"
          module-id="saved"
          :style="exploreModuleOrderStyle('saved')"
          :title="MODULE_TITLES.saved"
          :to="SAVED_PAGE"
        >
          <div
            v-if="hasSavedPages && readExploreTab.showLoadingBar('saved') && !recentlySaved.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading saved pages" />
          </div>
          <SavedModule
            :items="hasSavedPages ? recentlySaved : []"
            :preview-limit="HOME_SAVED_PREVIEW_LIMIT"
          >
            <template
              v-if="hasSavedPages && readExploreTab.showLoadingBar('saved') && recentlySaved.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading saved pages" />
              </div>
            </template>
          </SavedModule>
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
          :to="FURTHER_READING_PAGE"
        >
          <div
            v-if="
              readExploreTab.showLoadingBar('furtherReading') && !homeFurtherReadingPreview.length
            "
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading further reading" />
          </div>
          <RelatedModule
            v-if="homeFurtherReadingPreview.length"
            :items="homeFurtherReadingPreview"
            :preview-limit="HOME_FURTHER_READING_PREVIEW_LIMIT"
            :lists-version="listsVersion"
          >
            <template
              v-if="
                readExploreTab.showLoadingBar('furtherReading') &&
                homeFurtherReadingPreview.length
              "
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading further reading" />
              </div>
            </template>
          </RelatedModule>
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
          :to="MENTIONS_PAGE"
        >
          <div
            v-if="readExploreTab.showLoadingBar('mentions') && !homeMentionsPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading mentions" />
          </div>
          <MentionsModule
            v-if="homeMentionsPreview.length"
            :items="homeMentionsPreview"
            :preview-limit="HOME_MENTIONS_PREVIEW_LIMIT"
            :lists-version="listsVersion"
          >
            <template
              v-if="readExploreTab.showLoadingBar('mentions') && homeMentionsPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading mentions" />
              </div>
            </template>
          </MentionsModule>
        </WikitaLiteModule>
      </div>
    </CdxTab>

    <CdxTab name="contribute" :label="VIEW_TAB_LABELS.contribute">
      <div class="wikita-lite-home__panel">
        <WikitaLiteModule
          v-if="contributeTab.showModule('suggestedEdits') && !isDismissed('suggestedEdits')"
          module-id="suggestedEdits"
          :style="contributeModuleOrderStyle('suggestedEdits')"
          :title="MODULE_TITLES.suggestedEdits"
          :to="HELP_WANTED_PAGE"
        >
          <div
            v-if="contributeTab.showLoadingBar('suggestedEdits') && !helpWantedPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading edit suggestions" />
          </div>
          <HelpWantedModule
            v-if="helpWantedPreview.length"
            :items="helpWantedPreview"
            :preview-limit="helpWantedPreviewLimit"
            :more-to="HELP_WANTED_PAGE"
          >
            <template
              v-if="contributeTab.showLoadingBar('suggestedEdits') && helpWantedPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading edit suggestions" />
              </div>
            </template>
          </HelpWantedModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="contributeTab.showModule('translation') && !isDismissed('translation')"
          module-id="translation"
          :style="contributeModuleOrderStyle('translation')"
          :title="MODULE_TITLES.translateArticles"
          :to="TRANSLATIONS_PAGE"
        >
          <div
            v-if="
              contributeTab.showLoadingBar('translation') &&
              !translationPreview.length &&
              !translationError
            "
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading translation suggestions" />
          </div>
          <TranslationModule
            v-if="translationPreview.length || translationError"
            :items="translationSuggestions"
            :error="translationError"
            :preview-limit="HOME_TRANSLATION_PREVIEW_LIMIT"
            :more-to="TRANSLATIONS_PAGE"
            @retry="retryTranslationFeed"
          >
            <template
              v-if="
                contributeTab.showLoadingBar('translation') &&
                (translationPreview.length || translationError)
              "
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading translation suggestions" />
              </div>
            </template>
          </TranslationModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="contributeTab.showModule('recentActivity') && !isDismissed('recentActivity')"
          module-id="recentActivity"
          :style="contributeModuleOrderStyle('recentActivity')"
          :title="recentActivityTitle"
          :to="RECENT_ACTIVITY_PAGE"
        >
          <div
            v-if="contributeTab.showLoadingBar('recentActivity') && !recentActivityPreview.length"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading recent activity" />
          </div>
          <RecentActivityModule
            v-if="recentActivityPreview.length"
            :items="recentActivityPreview"
            :preview-limit="recentActivityPreviewLimit"
            :more-to="RECENT_ACTIVITY_PAGE"
          >
            <template
              v-if="contributeTab.showLoadingBar('recentActivity') && recentActivityPreview.length"
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading recent activity" />
              </div>
            </template>
          </RecentActivityModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="contributeTab.showModule('activeDiscussions') && !isDismissed('activeDiscussions')"
          module-id="activeDiscussions"
          :style="contributeModuleOrderStyle('activeDiscussions')"
          :title="MODULE_TITLES.activeDiscussions"
          :to="ACTIVE_DISCUSSIONS_PAGE"
        >
          <div
            v-if="contributeTab.showLoadingBar('activeDiscussions') && !showActiveDiscussionsContent"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading active discussions" />
          </div>
          <ActiveDiscussionsModule
            v-if="showActiveDiscussionsContent"
            :items="activeDiscussionsPreview"
            :error="activeDiscussionsError"
            :preview-limit="HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT"
            @retry="retryActiveDiscussionsFeed"
          >
            <template
              v-if="
                contributeTab.showLoadingBar('activeDiscussions') && showActiveDiscussionsContent
              "
              #after-cards
            >
              <div class="wikita-lite-home__loading">
                <CdxProgressBar inline aria-label="Loading active discussions" />
              </div>
            </template>
          </ActiveDiscussionsModule>
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="showImpact && !isDismissed('impact')"
          module-id="impact"
          :style="contributeModuleOrderStyle('impact')"
          :title="MODULE_TITLES.impact"
          :to="IMPACT_PAGE"
        >
          <ImpactModule v-bind="impactCardProps" @refresh="onImpactRefresh" />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!isDismissed('learn')"
          module-id="learn"
          :style="contributeModuleOrderStyle('learn')"
          :title="MODULE_TITLES.learn"
          :to="LEARN_PAGE"
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
  gap: var(--spacing-100, 16px);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding-top: var(--spacing-100, 16px);
}

.wikita-lite-home__loading {
  padding-block: var(--spacing-50, 8px);
}
</style>
