<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import { useWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import { useWikitaLiteHome, type PersonalizedFeedId } from './composables/useWikitaLiteHome'
import { useWikitaLiteView } from './composables/useWikitaLiteView'
import WikitaLiteModule from './components/WikitaLiteModule.vue'
import BornOnThisDayModule from './modules/BornOnThisDayModule.vue'
import DidYouKnowModule from './modules/DidYouKnowModule.vue'
import FeaturedModule from './modules/FeaturedModule.vue'
import HelpWantedModule from './modules/HelpWantedModule.vue'
import LearnModule from './modules/LearnModule.vue'
import RecentActivityModule from './modules/RecentActivityModule.vue'
import RelatedModule from './modules/RelatedModule.vue'
import SavedModule from './modules/SavedModule.vue'
import TrendingModule from './modules/TrendingModule.vue'
import {
  BORN_ON_THIS_DAY_PAGE,
  DID_YOU_KNOW_PAGE,
  FEATURED_PAGE,
  FURTHER_READING_PAGE,
  HELP_WANTED_PAGE,
  LEARN_PAGE,
  MODULE_TITLES,
  RECENT_ACTIVITY_PAGE,
  recentActivityTitleForView,
  SAVED_PAGE,
  TRENDING_PAGE,
} from './routes'

const HOME_DYK_PREVIEW_LIMIT = 3
const HOME_BORN_PREVIEW_LIMIT = 3
const HOME_FEATURED_PREVIEW_LIMIT = 3
const HOME_TRENDING_PREVIEW_LIMIT = 2
const HOME_SAVED_PREVIEW_LIMIT = 5
const HOME_FURTHER_READING_PREVIEW_LIMIT = 3
const HOME_HELP_WANTED_PREVIEW_LIMIT = 3
const HOME_RECENT_ACTIVITY_PREVIEW_LIMIT = 3

const { listsVersion } = useWikitaSaveFeedback()
const { activeView } = useWikitaLiteView()

let getBookmarkChangeSkipFeeds: () => PersonalizedFeedId[] = () => []

const {
  featuredArticle,
  didYouKnow,
  bornOnThisDay,
  featuredTabLoading,
  featuredTabError,
  retryFeaturedFeed,
  trendingItems,
  trendingLoading,
  trendingTabError,
  retryTrendingFeed,
  hasSavedPages,
  recentlySaved,
  savedItemsLoading,
  homeRelatedItems,
  homeRelatedLoading,
  helpWanted,
  helpWantedLoading,
  recentChanges,
  recentChangesLoading,
} = useWikitaLiteHome({ getBookmarkChangeSkipFeeds: () => getBookmarkChangeSkipFeeds() })

const showAllView = computed(() => activeView.value === 'all')
const showCommunityView = computed(() => activeView.value === 'community')
const showReadView = computed(() => activeView.value === 'read')
const showEditView = computed(() => activeView.value === 'edit')

const featuredHasContent = computed(() => Boolean(featuredArticle.value))

const homeDidYouKnowPreview = computed(() =>
  didYouKnow.value.slice(0, HOME_DYK_PREVIEW_LIMIT),
)

const homeBornOnThisDayPreview = computed(() =>
  bornOnThisDay.value.slice(0, HOME_BORN_PREVIEW_LIMIT),
)

const homeFurtherReadingPreview = computed(() =>
  homeRelatedItems.value.slice(0, HOME_FURTHER_READING_PREVIEW_LIMIT),
)

const helpWantedPreview = computed(() => helpWanted.value.slice(0, HOME_HELP_WANTED_PREVIEW_LIMIT))

const recentActivityPreview = computed(() =>
  recentChanges.value.slice(0, HOME_RECENT_ACTIVITY_PREVIEW_LIMIT),
)

const recentActivityTitle = computed(() => recentActivityTitleForView(activeView.value))

const communityFeedLoading = computed(
  () => featuredTabLoading.value || trendingLoading.value,
)

const personalizedFeedLoading = computed(
  () =>
    savedItemsLoading.value ||
    homeRelatedLoading.value ||
    helpWantedLoading.value ||
    recentChangesLoading.value,
)

const readFeedLoading = computed(
  () => savedItemsLoading.value || homeRelatedLoading.value,
)

const editFeedLoading = computed(
  () => helpWantedLoading.value || recentChangesLoading.value,
)

function isFurtherReadingVisible(): boolean {
  return homeFurtherReadingPreview.value.length > 0 && !homeRelatedLoading.value
}

function isSuggestedEditsVisible(): boolean {
  return helpWantedPreview.value.length > 0 && !helpWantedLoading.value
}

function isRecentActivityVisible(): boolean {
  return recentActivityPreview.value.length > 0 && !recentChangesLoading.value
}

getBookmarkChangeSkipFeeds = (): PersonalizedFeedId[] => {
  if (!hasSavedPages.value) return []

  const skip: PersonalizedFeedId[] = []

  if (showAllView.value) {
    if (isFurtherReadingVisible()) skip.push('related')
    if (isSuggestedEditsVisible()) skip.push('helpWanted')
    if (isRecentActivityVisible()) skip.push('recentChanges')
    return skip
  }

  if (showReadView.value) {
    if (isFurtherReadingVisible()) skip.push('related')
    skip.push('helpWanted', 'recentChanges')
    return skip
  }

  if (showEditView.value) {
    skip.push('related')
    if (isSuggestedEditsVisible()) skip.push('helpWanted')
    if (isRecentActivityVisible()) skip.push('recentChanges')
    return skip
  }

  return skip
}
</script>

<template>
  <div class="wikita-lite-home">
    <template v-if="showAllView || showCommunityView">
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
        v-if="showCommunityView && homeDidYouKnowPreview.length"
        :title="MODULE_TITLES.didYouKnow"
        :to="DID_YOU_KNOW_PAGE"
      >
        <DidYouKnowModule
          :items="homeDidYouKnowPreview"
          :preview-limit="HOME_DYK_PREVIEW_LIMIT"
          :lists-version="listsVersion"
        />
      </WikitaLiteModule>

      <WikitaLiteModule
        v-if="showCommunityView && homeBornOnThisDayPreview.length"
        :title="MODULE_TITLES.bornOnThisDay"
        :to="BORN_ON_THIS_DAY_PAGE"
      >
        <BornOnThisDayModule
          :items="homeBornOnThisDayPreview"
          :preview-limit="HOME_BORN_PREVIEW_LIMIT"
          :lists-version="listsVersion"
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

      <div
        v-if="communityFeedLoading"
        class="wikita-lite-home__loading"
      >
        <CdxProgressBar inline aria-label="Loading feed" />
      </div>
    </template>

    <template v-if="showAllView && hasSavedPages">
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
        v-if="helpWantedPreview.length"
        :title="MODULE_TITLES.suggestedEdits"
        :to="HELP_WANTED_PAGE"
      >
        <HelpWantedModule
          :items="helpWantedPreview"
          :preview-limit="HOME_HELP_WANTED_PREVIEW_LIMIT"
        />
      </WikitaLiteModule>

      <WikitaLiteModule
        v-if="!recentChangesLoading && recentActivityPreview.length"
        :title="recentActivityTitle"
        :to="RECENT_ACTIVITY_PAGE"
      >
        <RecentActivityModule
          :items="recentActivityPreview"
          :preview-limit="HOME_RECENT_ACTIVITY_PREVIEW_LIMIT"
        />
      </WikitaLiteModule>

      <div
        v-if="personalizedFeedLoading"
        class="wikita-lite-home__loading"
      >
        <CdxProgressBar inline aria-label="Loading saved feeds" />
      </div>
    </template>

    <template v-if="showReadView">
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

        <div
          v-if="readFeedLoading"
          class="wikita-lite-home__loading"
        >
          <CdxProgressBar inline aria-label="Loading reading list" />
        </div>
      </template>

      <p v-else class="wikita-lite-home__empty">Save pages to build your reading list.</p>
    </template>

    <template v-if="showEditView">
      <template v-if="hasSavedPages">
        <WikitaLiteModule
          v-if="helpWantedPreview.length"
          :title="MODULE_TITLES.suggestedEdits"
          :to="HELP_WANTED_PAGE"
        >
          <HelpWantedModule
            :items="helpWantedPreview"
            :preview-limit="HOME_HELP_WANTED_PREVIEW_LIMIT"
          />
        </WikitaLiteModule>

        <WikitaLiteModule
          v-if="!recentChangesLoading && recentActivityPreview.length"
          :title="recentActivityTitle"
          :to="RECENT_ACTIVITY_PAGE"
        >
          <RecentActivityModule
            :items="recentActivityPreview"
            :preview-limit="HOME_RECENT_ACTIVITY_PREVIEW_LIMIT"
          />
        </WikitaLiteModule>

        <div
          v-if="editFeedLoading"
          class="wikita-lite-home__loading"
        >
          <CdxProgressBar inline aria-label="Loading edit feeds" />
        </div>
      </template>

      <p v-else class="wikita-lite-home__empty">Save pages to see edit suggestions and recent changes.</p>

      <WikitaLiteModule
        v-if="!hasSavedPages || !editFeedLoading"
        :title="MODULE_TITLES.learn"
        :to="LEARN_PAGE"
      >
        <LearnModule />
      </WikitaLiteModule>
    </template>
  </div>
</template>

<style scoped>
.wikita-lite-home {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.wikita-lite-home__loading {
  padding-block: var(--spacing-50, 8px);
}

.wikita-lite-home__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
