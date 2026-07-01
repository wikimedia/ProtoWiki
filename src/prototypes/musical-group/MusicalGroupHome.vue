<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { CdxProgressBar } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconAlert,
  cdxIconError,
  cdxIconHeart,
  cdxIconHeartOutline,
  cdxIconReference,
  cdxIconStar,
  cdxIconUserAdd,
} from '@wikimedia/codex-icons'

import WikitaActivityTabPanel from './components/WikitaActivityTabPanel.vue'
import WikitaCardItem, {
  type WikitaCardItemTypeColor,
} from './components/WikitaCardItem.vue'
import WikitaChromeHeader, {
  type WikitaChromeHeaderVariant,
} from './components/WikitaChromeHeader.vue'
import WikitaContributeTabPanel from './components/WikitaContributeTabPanel.vue'
import WikitaHomeSection from './components/WikitaHomeSection.vue'
import WikitaHomeTabs from './components/WikitaHomeTabs.vue'
import { isBookmarked, toggleBookmark } from './data/bookmarks'
import { isEditThanked, toggleEditThank } from './data/editThanks'
import { resolveEditOpportunityIcon } from './data/editOpportunityIcons'
import { formatEditStatusLabel } from './data/fetchRecentChanges'
import {
  formatEditSuggestionRelatedToLabel,
  formatRelatedToLabel,
} from './data/relatedToLabel'
import {
  isThankableEditFlag,
  type HomeHelpWanted,
  type HomeRecentChange,
  type HomeRecentChangeFlag,
} from './data/types'
import { useCommonsPhotosInfiniteScroll } from './useCommonsPhotosFeed'
import { useMusicalGroupHome } from './useMusicalGroupHome'
import { useMusicalGroupHomeTabScroll } from './useMusicalGroupHomeTabScroll'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'
import { useMusicalGroupScrollStates } from './useMusicalGroupScrollStates'
import { useRelatedReadingFeed } from './useRelatedReadingFeed'

const headerVariant = defineModel<WikitaChromeHeaderVariant>('headerVariant', {
  default: 'black',
})

const emit = defineEmits<{
  'toggle-search': []
  'reset-stored-data': []
  'go-home': []
}>()

const route = useRoute()
const { activeHomeTab: activeTab, setHomeTab } = useMusicalGroupRoute()

useMusicalGroupScrollStates()
useMusicalGroupHomeTabScroll()

const {
  featuredArticle,
  didYouKnow,
  bornOnThisDay,
  featuredTabLoading,
  trendingItems,
  trendingLoading,
  hasSavedPages,
  savedSorted,
  recentlySaved,
  helpWanted,
  recentChanges,
} = useMusicalGroupHome()

const showFeaturedFeed = computed(
  () =>
    activeTab.value === 'featured' ||
    (activeTab.value === 'home' && !hasSavedPages.value),
)
const showPersonalizedHome = computed(
  () => activeTab.value === 'home' && hasSavedPages.value,
)

const homeActive = computed(() => showPersonalizedHome.value)
const readActive = computed(() => activeTab.value === 'read')
const savedActive = computed(() => activeTab.value === 'saved')
const readTabRecent = computed(() => savedSorted.value.slice(0, 5))
const savedTabRelatedLimit = 3
const homeTrendingPreview = computed(() => trendingItems.value.slice(0, 2))
const homeRelatedLimit = 3
const relatedSentinel = ref<HTMLElement | null>(null)

const {
  related: homeRelatedFeed,
  loading: homeRelatedLoading,
} = useRelatedReadingFeed(savedSorted, homeActive, 'home')

const homeRelatedPreview = computed(() => homeRelatedFeed.value.slice(0, homeRelatedLimit))

const {
  related: relatedFeed,
  loading: relatedFeedLoading,
  hasMore: relatedFeedHasMore,
  loadMore: loadMoreRelated,
} = useRelatedReadingFeed(savedSorted, readActive, 'read')

const {
  related: savedRelatedFeed,
  loading: savedRelatedLoading,
} = useRelatedReadingFeed(savedSorted, savedActive, 'saved')

const savedTabRelated = computed(() => savedRelatedFeed.value.slice(0, savedTabRelatedLimit))

useCommonsPhotosInfiniteScroll({
  sentinel: relatedSentinel,
  active: readActive,
  hasMore: relatedFeedHasMore,
  loading: relatedFeedLoading,
  loadMore: loadMoreRelated,
})

interface FlagPresentation {
  label: string
  icon?: Icon
  color: WikitaCardItemTypeColor
}

const FLAG_PRESENTATION: Record<Exclude<HomeRecentChangeFlag, 'none'>, FlagPresentation> = {
  'first-edit': { label: "User's first edit", icon: cdxIconUserAdd, color: 'success' },
  'new-editor': { label: 'New editor', icon: cdxIconUserAdd, color: 'success' },
  'good-faith': { label: 'Good faith', icon: cdxIconHeartOutline, color: 'success' },
  'needs-reference': { label: 'Needs a reference check', icon: cdxIconReference, color: 'progressive' },
  'tone-issue': { label: 'Tone issue', icon: cdxIconAlert, color: 'warning' },
  'high-revert-risk': { label: 'High revert risk', icon: cdxIconError, color: 'error' },
}

function flagPresentation(flag: HomeRecentChangeFlag): FlagPresentation | null {
  if (flag === 'none') return null
  return FLAG_PRESENTATION[flag]
}

function editCardStatusLabel(change: HomeRecentChange): string {
  return formatEditStatusLabel(change.reverted, change.isLatest)
}

function itemHref(id: string) {
  const query = { ...route.query, item: id }
  delete query.tab
  return { query }
}

/** Local save-button state; saved-library feeds refresh on tab/page navigation only. */
const relatedReadingBookmarkState = ref<Record<string, boolean>>({})

function relatedReadingSaved(itemId: string): boolean {
  if (Object.prototype.hasOwnProperty.call(relatedReadingBookmarkState.value, itemId)) {
    return relatedReadingBookmarkState.value[itemId]
  }
  return isBookmarked(itemId)
}

function onRelatedReadingSave(itemId: string) {
  const saved = toggleBookmark(itemId)
  relatedReadingBookmarkState.value = {
    ...relatedReadingBookmarkState.value,
    [itemId]: saved,
  }
}

/** Local thank state for recent-change cards; feed refreshes on remount only. */
const editThankState = ref<Record<number, boolean>>({})

function editThanked(revid: number): boolean {
  if (Object.prototype.hasOwnProperty.call(editThankState.value, revid)) {
    return editThankState.value[revid]
  }
  return isEditThanked(revid)
}

function onToggleEditThank(revid: number) {
  const thanked = toggleEditThank(revid)
  editThankState.value = {
    ...editThankState.value,
    [revid]: thanked,
  }
}

function relatedReadingToLabel(title: string): string {
  return formatRelatedToLabel(title, savedSorted.value, { alwaysShow: true })
}

function editSuggestionRelatedToLabel(suggestion: HomeHelpWanted): string {
  return formatEditSuggestionRelatedToLabel(suggestion, savedSorted.value)
}

watch(
  [hasSavedPages, activeTab],
  ([saved, tab]) => {
    if (!saved && (tab === 'read' || tab === 'featured' || tab === 'saved' || tab === 'contribute' || tab === 'activity')) {
      setHomeTab('home')
    }
  },
  { immediate: true },
)

</script>

<template>
  <div class="musical-group-home">
    <div class="musical-group-chrome-stack">
      <WikitaChromeHeader
        v-model:variant="headerVariant"
        @toggle-search="emit('toggle-search')"
        @reset-stored-data="emit('reset-stored-data')"
        @go-home="emit('go-home')"
      />
    </div>

    <WikitaHomeTabs
      :active-tab="activeTab"
      :has-saved-pages="hasSavedPages"
      @update:active-tab="setHomeTab"
    />

    <div class="musical-group-home__body">
      <template v-if="showFeaturedFeed">
        <CdxProgressBar v-if="featuredTabLoading" inline aria-label="Loading featured" />

        <template v-else>
          <WikitaCardItem
            v-if="featuredArticle"
            type="Article of the day"
            :type-icon="cdxIconStar"
            type-color="success"
            :title="featuredArticle.title"
            :body="featuredArticle.description"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="featuredArticle.thumbnailUrl"
            :thumbnail-alt="featuredArticle.title"
            :href="featuredArticle.itemId ? itemHref(featuredArticle.itemId) : undefined"
            :external-href="featuredArticle.itemId ? undefined : featuredArticle.articleUrl"
          />

          <WikitaHomeSection v-if="didYouKnow.length" title="Did you know">
            <WikitaCardItem
              v-for="(item, index) in didYouKnow"
              :key="`dyk-${index}`"
              :show-type="false"
              :show-title="false"
              :body="item.text"
              :body-emphasis="item.emphasis"
              :show-snippet="false"
              :show-info="false"
              :show-thumbnail="Boolean(item.thumbnailUrl)"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title ?? 'Did you know'"
              :href="item.itemId ? itemHref(item.itemId) : undefined"
              :external-href="item.itemId ? undefined : item.articleUrl"
            />
          </WikitaHomeSection>

          <WikitaHomeSection v-if="bornOnThisDay.length" title="Born on this day">
            <WikitaCardItem
              v-for="item in bornOnThisDay"
              :key="item.enwikiTitle"
              :show-type="false"
              :title="item.title"
              :body="`Born ${item.year}: ${item.text}`"
              :show-snippet="false"
              :show-info="false"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title"
              :href="item.itemId ? itemHref(item.itemId) : undefined"
              :external-href="item.itemId ? undefined : item.articleUrl"
            />
          </WikitaHomeSection>
        </template>
      </template>

      <template v-else-if="showPersonalizedHome">
        <WikitaHomeSection
          v-if="featuredArticle"
          title="Featured"
          to-tab="featured"
          @title-navigate="setHomeTab"
        >
          <WikitaCardItem
            type="Article of the day"
            :type-icon="cdxIconStar"
            type-color="success"
            :title="featuredArticle.title"
            :body="featuredArticle.description"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="featuredArticle.thumbnailUrl"
            :thumbnail-alt="featuredArticle.title"
            :href="featuredArticle.itemId ? itemHref(featuredArticle.itemId) : undefined"
            :external-href="featuredArticle.itemId ? undefined : featuredArticle.articleUrl"
          />
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="homeTrendingPreview.length"
          title="Trending"
          to-tab="trending"
          @title-navigate="setHomeTab"
        >
          <WikitaCardItem
            v-for="item in homeTrendingPreview"
            :key="item.enwikiTitle"
            :show-type="false"
            :title-bold="true"
            :title="item.title"
            :body="item.description"
            :show-snippet="false"
            :show-info="Boolean(item.lastEditedLabel || item.viewsLabel)"
            :info-left="item.lastEditedLabel"
            :info-right="item.viewsLabel"
            :thumbnail-url="item.thumbnailUrl"
            :show-thumbnail="Boolean(item.thumbnailUrl)"
            :thumbnail-alt="item.title"
            :href="item.itemId ? itemHref(item.itemId) : undefined"
            :external-href="item.itemId ? undefined : item.articleUrl"
          />
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="recentlySaved.length"
          title="Saved"
          to-tab="saved"
          @title-navigate="setHomeTab"
        >
          <WikitaCardItem
            v-for="item in recentlySaved"
            :key="item.id"
            :show-type="false"
            :show-snippet="false"
            :show-info="false"
            :title="item.title"
            :body="item.description"
            :thumbnail-url="item.thumbnailUrl"
            :thumbnail-alt="item.title"
            :href="itemHref(item.id)"
          />
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="homeRelatedPreview.length || homeRelatedLoading"
          title="Related reading"
          to-tab="read"
          @title-navigate="setHomeTab"
        >
          <WikitaCardItem
            v-for="item in homeRelatedPreview"
            :key="item.title"
            :show-type="false"
            :show-snippet="false"
            :show-info="Boolean(relatedReadingToLabel(item.relatedToTitle))"
            :info-left="relatedReadingToLabel(item.relatedToTitle)"
            :show-action="Boolean(item.itemId)"
            :action-active="item.itemId ? relatedReadingSaved(item.itemId) : false"
            :action-label="item.itemId && relatedReadingSaved(item.itemId) ? 'Saved' : 'Save'"
            :title="item.title"
            :body="item.description"
            :thumbnail-url="item.thumbnailUrl"
            :thumbnail-alt="item.title"
            :href="item.itemId ? itemHref(item.itemId) : undefined"
            :external-href="item.itemId ? undefined : item.articleUrl"
            @action-click="onRelatedReadingSave(item.itemId!)"
          />
          <div v-if="homeRelatedLoading" class="musical-group-home__loading">
            <CdxProgressBar inline aria-label="Loading related reading" />
          </div>
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="helpWanted.length"
          title="Help wanted"
          to-tab="contribute"
          @title-navigate="setHomeTab"
        >
          <WikitaCardItem
            v-for="suggestion in helpWanted"
            :key="suggestion.itemId"
            :type="suggestion.suggestionLabel"
            :type-icon="resolveEditOpportunityIcon(suggestion.need)"
            type-color="progressive"
            :title="suggestion.title"
            :body="suggestion.body"
            :show-snippet="false"
            :show-info="Boolean(editSuggestionRelatedToLabel(suggestion))"
            :info-left="editSuggestionRelatedToLabel(suggestion)"
            :thumbnail-url="suggestion.thumbnailUrl"
            :thumbnail-alt="suggestion.title"
            :href="itemHref(suggestion.itemId)"
          />
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="recentChanges.length"
          title="Recent changes"
          to-tab="activity"
          @title-navigate="setHomeTab"
        >
          <WikitaCardItem
            v-for="change in recentChanges"
            :key="`${change.enwikiTitle}-${change.revid}`"
            :show-type="flagPresentation(change.flag) !== null"
            :type="flagPresentation(change.flag)?.label"
            :type-icon="flagPresentation(change.flag)?.icon"
            :type-color="flagPresentation(change.flag)?.color ?? 'base'"
            :title="change.title"
            :body="change.editSummary"
            :show-snippet="false"
            :show-info="Boolean(change.editedLabel || editCardStatusLabel(change))"
            :info-left="change.editedLabel"
            :info-right="editCardStatusLabel(change)"
            :info-right-subtle="Boolean(editCardStatusLabel(change))"
            :show-action="isThankableEditFlag(change.flag)"
            :action-active="editThanked(change.revid)"
            :action-label="editThanked(change.revid) ? 'Thanked' : 'Thank'"
            :action-icon="editThanked(change.revid) ? cdxIconHeart : cdxIconHeartOutline"
            :thumbnail-url="change.thumbnailUrl"
            :thumbnail-alt="change.title"
            :external-href="change.diffUrl"
            @action-click="onToggleEditThank(change.revid)"
          />
        </WikitaHomeSection>
      </template>

      <template v-else-if="activeTab === 'read'">
        <div class="musical-group-home__read">
          <WikitaHomeSection v-if="readTabRecent.length" title="Saved">
            <WikitaCardItem
              v-for="item in readTabRecent"
              :key="item.id"
              :show-type="false"
              :show-snippet="false"
              :show-info="false"
              :title="item.title"
              :body="item.description"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title"
              :href="itemHref(item.id)"
            />
          </WikitaHomeSection>
          <p v-else class="musical-group-home__read-empty">
            You have not saved any pages yet.
          </p>

          <WikitaHomeSection title="Related reading">
            <WikitaCardItem
              v-for="item in relatedFeed"
              :key="item.title"
              :show-type="false"
              :show-snippet="false"
              :show-info="Boolean(relatedReadingToLabel(item.relatedToTitle))"
              :info-left="relatedReadingToLabel(item.relatedToTitle)"
              :show-action="Boolean(item.itemId)"
              :action-active="item.itemId ? relatedReadingSaved(item.itemId) : false"
              :action-label="item.itemId && relatedReadingSaved(item.itemId) ? 'Saved' : 'Save'"
              :title="item.title"
              :body="item.description"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title"
              :href="item.itemId ? itemHref(item.itemId) : undefined"
              :external-href="item.itemId ? undefined : item.articleUrl"
              @action-click="onRelatedReadingSave(item.itemId!)"
            />
          </WikitaHomeSection>

          <div v-if="relatedFeedLoading" class="musical-group-home__loading">
            <CdxProgressBar inline aria-label="Loading related reading" />
          </div>

          <div ref="relatedSentinel" class="musical-group-home__sentinel" aria-hidden="true" />
        </div>
      </template>

      <template v-else-if="activeTab === 'saved'">
        <div class="musical-group-home__saved-tab">
          <WikitaHomeSection v-if="savedSorted.length">
            <WikitaCardItem
              v-for="item in savedSorted"
              :key="item.id"
              :show-type="false"
              :show-snippet="false"
              :show-info="false"
              :title="item.title"
              :body="item.description"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title"
              :href="itemHref(item.id)"
            />
          </WikitaHomeSection>
          <p v-else class="musical-group-home__saved-empty">
            You have not saved any pages yet.
          </p>

          <WikitaHomeSection
            v-if="savedTabRelated.length || savedRelatedLoading"
            title="Related"
          >
            <WikitaCardItem
              v-for="item in savedTabRelated"
              :key="item.title"
              :show-type="false"
              :show-snippet="false"
              :show-info="Boolean(relatedReadingToLabel(item.relatedToTitle))"
              :info-left="relatedReadingToLabel(item.relatedToTitle)"
              :show-action="Boolean(item.itemId)"
              :action-active="item.itemId ? relatedReadingSaved(item.itemId) : false"
              :action-label="item.itemId && relatedReadingSaved(item.itemId) ? 'Saved' : 'Save'"
              :title="item.title"
              :body="item.description"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title"
              :href="item.itemId ? itemHref(item.itemId) : undefined"
              :external-href="item.itemId ? undefined : item.articleUrl"
              @action-click="onRelatedReadingSave(item.itemId!)"
            />
            <div v-if="savedRelatedLoading" class="musical-group-home__loading">
              <CdxProgressBar inline aria-label="Loading related pages" />
            </div>
          </WikitaHomeSection>
        </div>
      </template>

      <template v-else-if="activeTab === 'trending'">
        <CdxProgressBar v-if="trendingLoading" inline aria-label="Loading trending" />

        <WikitaHomeSection v-else-if="trendingItems.length">
          <WikitaCardItem
            v-for="item in trendingItems"
            :key="item.enwikiTitle"
            :show-type="false"
            :title-bold="true"
            :title="item.title"
            :body="item.description"
            :show-snippet="false"
            :show-info="Boolean(item.lastEditedLabel || item.viewsLabel)"
            :info-left="item.lastEditedLabel"
            :info-right="item.viewsLabel"
            :thumbnail-url="item.thumbnailUrl"
            :show-thumbnail="Boolean(item.thumbnailUrl)"
            :thumbnail-alt="item.title"
            :href="item.itemId ? itemHref(item.itemId) : undefined"
            :external-href="item.itemId ? undefined : item.articleUrl"
          />
        </WikitaHomeSection>

        <p v-else class="musical-group-home__trending-empty">
          No trending articles available.
        </p>
      </template>

      <WikitaActivityTabPanel
        v-else-if="activeTab === 'activity'"
        :items="savedSorted"
        :active="activeTab === 'activity'"
        scope="home"
      />

      <WikitaContributeTabPanel
        v-else-if="activeTab === 'contribute'"
        :items="savedSorted"
        :active="activeTab === 'contribute'"
        scope="home"
      />

      <div v-else class="musical-group-home__empty" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.musical-group-home {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: var(--background-color-base);
}

.musical-group-home__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  padding: var(--spacing-50);
}

.musical-group-home__body > :first-child {
  margin-top: var(--spacing-50);
}

.musical-group-home__empty {
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}

.musical-group-home__read {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}

.musical-group-home__read-empty,
.musical-group-home__saved-empty,
.musical-group-home__trending-empty {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.musical-group-home__saved-tab {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.musical-group-home__sentinel {
  height: 1px;
  margin-top: auto;
  flex-shrink: 0;
}

.musical-group-home__loading {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50);
}
</style>
