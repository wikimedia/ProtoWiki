<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar, CdxTab, CdxTabs } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'

import { useWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome, type PersonalizedFeedId } from './composables/useWikitaLiteHome'
import { useWikitaLiteView } from './composables/useWikitaLiteView'
import WikitaLiteModule from './components/WikitaLiteModule.vue'
import ActiveDiscussionsModule from './modules/ActiveDiscussionsModule.vue'
import DidYouKnowModule from './modules/DidYouKnowModule.vue'
import FeaturedModule from './modules/FeaturedModule.vue'
import HelpWantedModule from './modules/HelpWantedModule.vue'
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
const HOME_DYK_PREVIEW_LIMIT = 3
const HOME_SAVED_PREVIEW_LIMIT = 5
const HOME_MENTIONS_PREVIEW_LIMIT = 3
const HOME_FURTHER_READING_PREVIEW_LIMIT = 3
const HOME_EDIT_FURTHER_READING_PREVIEW_LIMIT = 1
const HOME_HELP_WANTED_PREVIEW_LIMIT = 3
const HOME_RECENT_ACTIVITY_PREVIEW_LIMIT = 3
const HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT = 2
const HOME_TRANSLATION_PREVIEW_LIMIT = 2

const { listsVersion } = useWikitaSaveFeedback()
const { knownLanguages } = useConfig()
const { activeView, selectView } = useWikitaLiteView()

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

const homeFurtherReadingPreview = computed(() =>
  homeRelatedItems.value.slice(0, HOME_FURTHER_READING_PREVIEW_LIMIT),
)

const homeEditFurtherReadingPreview = computed(() =>
  homeRelatedItems.value.slice(0, HOME_EDIT_FURTHER_READING_PREVIEW_LIMIT),
)

const homeMentionsPreview = computed(() =>
  homeMentions.value.slice(0, HOME_MENTIONS_PREVIEW_LIMIT),
)

const helpWantedPreview = computed(() => helpWanted.value.slice(0, HOME_HELP_WANTED_PREVIEW_LIMIT))

const recentActivityPreview = computed(() =>
  recentChanges.value.slice(0, HOME_RECENT_ACTIVITY_PREVIEW_LIMIT),
)

const activeDiscussionsPreview = computed(() =>
  activeDiscussions.value.slice(0, HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT),
)

const translationPreview = computed(() =>
  translationSuggestions.value.slice(0, HOME_TRANSLATION_PREVIEW_LIMIT),
)

const homeDidYouKnowPreview = computed(() =>
  didYouKnow.value.slice(0, HOME_DYK_PREVIEW_LIMIT),
)

const showTranslationModule = computed(() => knownLanguages.value.length > 0)

const recentActivityTitle = computed(() => recentActivityTitleForView(activeView.value))

const homeFeedLoading = computed(
  () => featuredTabLoading.value || trendingLoading.value,
)

const readFeedLoading = computed(
  () => savedItemsLoading.value || homeMentionsLoading.value || homeRelatedLoading.value,
)

const exploreEmptyFeedLoading = computed(
  () => trendingLoading.value || featuredTabLoading.value,
)

const editFeedLoading = computed(
  () => helpWantedLoading.value || recentChangesLoading.value,
)

function isRecentActivityVisible(): boolean {
  return recentActivityPreview.value.length > 0 && !recentChangesLoading.value
}

const showRecentActivityModule = computed(
  () => hasSavedPages.value && isRecentActivityVisible(),
)

const showActiveDiscussionsModule = computed(
  () =>
    showRecentActivityModule.value &&
    (activeDiscussionsPreview.value.length > 0 || Boolean(activeDiscussionsError.value)),
)

const activeDiscussionsPending = computed(
  () =>
    showRecentActivityModule.value &&
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

const editTabLoading = computed(
  () =>
    homeFeedLoading.value ||
    (hasSavedPages.value && editFeedLoading.value) ||
    activeDiscussionsPending.value ||
    translationPending.value,
)

const contributeTabLoading = computed(
  () =>
    (hasSavedPages.value && editFeedLoading.value) ||
    activeDiscussionsPending.value ||
    translationPending.value,
)

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
  if (!hasSavedPages.value) return []

  const skip: PersonalizedFeedId[] = []

  if (activeView.value === 'read') {
    if (isFurtherReadingVisible()) skip.push('related')
    if (isMentionsVisible()) skip.push('mentions')
    skip.push('helpWanted', 'recentChanges')
    return skip
  }

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
          v-if="featuredHasContent || featuredTabError"
          :title="MODULE_TITLES.featured"
          :to="FEATURED_PAGE"
        >
          <FeaturedModule
            :featured-article="featuredArticle"
            :error="featuredTabError"
            :preview-limit="HOME_FEATURED_PREVIEW_LIMIT"
            :lists-version="listsVersion"
            @retry="retryFeaturedFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="trendingItems.length || trendingTabError"
          :title="MODULE_TITLES.trending"
          :to="TRENDING_PAGE"
        >
          <TrendingModule
            :items="trendingItems"
            :error="trendingTabError"
            :preview-limit="HOME_TRENDING_PREVIEW_LIMIT"
            :lists-version="listsVersion"
            @retry="retryTrendingFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="hasSavedPages && !homeRelatedLoading && homeEditFurtherReadingPreview.length"
          :title="MODULE_TITLES.furtherReading"
          :to="FURTHER_READING_PAGE"
        >
          <RelatedModule
            :items="homeEditFurtherReadingPreview"
            :preview-limit="HOME_EDIT_FURTHER_READING_PREVIEW_LIMIT"
            :lists-version="listsVersion"
          />
        </WikitaLiteModule>

        <template v-if="hasSavedPages">
          <WikitaLiteModule
            v-if="helpWantedPreview.length"
            :title="MODULE_TITLES.suggestedEdits"
            :to="HELP_WANTED_PAGE"
          >
            <HelpWantedModule
              :items="helpWantedPreview"
              :preview-limit="HOME_HELP_WANTED_PREVIEW_LIMIT"
              :more-to="HELP_WANTED_PAGE"
            />
          </WikitaLiteModule>
        </template>

        <WikitaLiteModule
          v-if="showTranslationModule && (translationPreview.length || translationError)"
          :title="MODULE_TITLES.translateArticles"
          :to="TRANSLATIONS_PAGE"
        >
          <TranslationModule
            :items="translationSuggestions"
            :error="translationError"
            :preview-limit="HOME_TRANSLATION_PREVIEW_LIMIT"
            @retry="retryTranslationFeed"
          />
        </WikitaLiteModule>

        <template v-if="hasSavedPages">
          <WikitaLiteModule
            v-if="showRecentActivityModule"
            :title="recentActivityTitle"
            :to="RECENT_ACTIVITY_PAGE"
          >
            <RecentActivityModule
              :items="recentActivityPreview"
              :preview-limit="HOME_RECENT_ACTIVITY_PREVIEW_LIMIT"
              :more-to="RECENT_ACTIVITY_PAGE"
            />
          </WikitaLiteModule>
        </template>

        <WikitaLiteModule
          v-if="showActiveDiscussionsModule"
          :title="MODULE_TITLES.activeDiscussions"
          :to="ACTIVE_DISCUSSIONS_PAGE"
        >
          <ActiveDiscussionsModule
            :items="activeDiscussionsPreview"
            :error="activeDiscussionsError"
            :preview-limit="HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT"
            @retry="retryActiveDiscussionsFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          :title="MODULE_TITLES.learn"
          :to="LEARN_PAGE"
        >
          <LearnModule />
        </WikitaLiteModule>

        <div v-if="editTabLoading" class="wikita-lite-home__loading">
          <CdxProgressBar inline aria-label="Loading" />
        </div>
      </div>
    </CdxTab>

    <CdxTab name="read" :label="VIEW_TAB_LABELS.read">
      <div class="wikita-lite-home__panel">
        <template v-if="hasSavedPages">
          <WikitaLiteModule
            v-if="recentlySaved.length"
            :title="MODULE_TITLES.saved"
            :to="SAVED_PAGE"
          >
            <SavedModule
              :items="recentlySaved"
              :preview-limit="HOME_SAVED_PREVIEW_LIMIT"
            />
          </WikitaLiteModule>

          <WikitaLiteModule
            v-if="!homeRelatedLoading && homeFurtherReadingPreview.length"
            :title="MODULE_TITLES.furtherReading"
            :to="FURTHER_READING_PAGE"
          >
            <RelatedModule
              :items="homeFurtherReadingPreview"
              :preview-limit="HOME_FURTHER_READING_PREVIEW_LIMIT"
              :lists-version="listsVersion"
            />
          </WikitaLiteModule>

          <WikitaLiteModule
            v-if="!homeMentionsLoading && homeMentionsPreview.length"
            :title="MODULE_TITLES.mentions"
            :to="MENTIONS_PAGE"
          >
            <MentionsModule
              :items="homeMentionsPreview"
              :preview-limit="HOME_MENTIONS_PREVIEW_LIMIT"
              :lists-version="listsVersion"
            />
          </WikitaLiteModule>

          <div
            v-if="readFeedLoading"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading reading list" />
          </div>
        </template>

        <template v-else>
          <WikitaLiteModule
            :title="MODULE_TITLES.saved"
            :to="SAVED_PAGE"
          >
            <SavedModule />
          </WikitaLiteModule>

          <WikitaLiteModule
            v-if="trendingItems.length || trendingTabError"
            :title="MODULE_TITLES.trending"
            :to="TRENDING_PAGE"
          >
            <TrendingModule
              :items="trendingItems"
              :error="trendingTabError"
              :preview-limit="HOME_TRENDING_PREVIEW_LIMIT"
              :lists-version="listsVersion"
              @retry="retryTrendingFeed"
            />
          </WikitaLiteModule>

          <WikitaLiteModule
            v-if="homeDidYouKnowPreview.length"
            :title="MODULE_TITLES.didYouKnow"
            :to="DID_YOU_KNOW_PAGE"
          >
            <DidYouKnowModule
              :items="didYouKnow"
              :preview-limit="HOME_DYK_PREVIEW_LIMIT"
              :lists-version="listsVersion"
            />
          </WikitaLiteModule>

          <div
            v-if="exploreEmptyFeedLoading"
            class="wikita-lite-home__loading"
          >
            <CdxProgressBar inline aria-label="Loading" />
          </div>
        </template>
      </div>
    </CdxTab>

    <CdxTab name="contribute" :label="VIEW_TAB_LABELS.contribute">
      <div class="wikita-lite-home__panel">
        <template v-if="hasSavedPages">
          <WikitaLiteModule
            v-if="helpWantedPreview.length"
            :title="MODULE_TITLES.suggestedEdits"
            :to="HELP_WANTED_PAGE"
          >
            <HelpWantedModule
              :items="helpWantedPreview"
              :preview-limit="HOME_HELP_WANTED_PREVIEW_LIMIT"
              :more-to="HELP_WANTED_PAGE"
            />
          </WikitaLiteModule>
        </template>

        <WikitaLiteModule
          v-if="showTranslationModule && (translationPreview.length || translationError)"
          :title="MODULE_TITLES.translateArticles"
          :to="TRANSLATIONS_PAGE"
        >
          <TranslationModule
            :items="translationSuggestions"
            :error="translationError"
            :preview-limit="HOME_TRANSLATION_PREVIEW_LIMIT"
            @retry="retryTranslationFeed"
          />
        </WikitaLiteModule>

        <template v-if="hasSavedPages">
          <WikitaLiteModule
            v-if="showRecentActivityModule"
            :title="recentActivityTitle"
            :to="RECENT_ACTIVITY_PAGE"
          >
            <RecentActivityModule
              :items="recentActivityPreview"
              :preview-limit="HOME_RECENT_ACTIVITY_PREVIEW_LIMIT"
              :more-to="RECENT_ACTIVITY_PAGE"
            />
          </WikitaLiteModule>
        </template>

        <WikitaLiteModule
          v-if="showActiveDiscussionsModule"
          :title="MODULE_TITLES.activeDiscussions"
          :to="ACTIVE_DISCUSSIONS_PAGE"
        >
          <ActiveDiscussionsModule
            :items="activeDiscussionsPreview"
            :error="activeDiscussionsError"
            :preview-limit="HOME_ACTIVE_DISCUSSIONS_PREVIEW_LIMIT"
            @retry="retryActiveDiscussionsFeed"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          :title="MODULE_TITLES.learn"
          :to="LEARN_PAGE"
        >
          <LearnModule />
        </WikitaLiteModule>

        <div v-if="contributeTabLoading" class="wikita-lite-home__loading">
          <CdxProgressBar inline aria-label="Loading" />
        </div>
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
