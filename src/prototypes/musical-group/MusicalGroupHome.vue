<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { CdxButton, CdxProgressBar } from '@wikimedia/codex'
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
import WikitaCardItem, { type WikitaCardItemTypeColor } from './components/WikitaCardItem.vue'
import WikitaChromeHeader, {
  type WikitaChromeHeaderVariant,
} from './components/WikitaChromeHeader.vue'
import WikitaContributeTabPanel from './components/WikitaContributeTabPanel.vue'
import WikitaHomeSection from './components/WikitaHomeSection.vue'
import WikitaHomeTabs, { type HomeTabId } from './components/WikitaHomeTabs.vue'
import { useListCardThumbnails } from './composables/useListCardThumbnails'
import { useWikitaSaveFeedback } from './composables/useWikitaSaveFeedback'
import { isBookmarked } from './data/bookmarks'
import {
  formatListItemCount,
  addPageToList,
  isPageInAnyList,
  isPageInList,
  listUserLists,
} from './data/lists'
import { isEditThanked, toggleEditThank } from './data/editThanks'
import { resolveEditOpportunityIcon } from './data/editOpportunityIcons'
import { formatEditStatusLabel } from './data/fetchRecentChanges'
import {
  formatEditSuggestionRelatedToLabel,
  formatRelatedToLabel,
  formatRelatedToListLabel,
} from './data/relatedToLabel'
import {
  isThankableEditFlag,
  type HomeHelpWanted,
  type HomeRecentChange,
  type HomeRecentChangeFlag,
} from './data/types'
import { useMusicalGroupHome } from './useMusicalGroupHome'
import { useMusicalGroupHomeTabScroll } from './useMusicalGroupHomeTabScroll'
import {
  getMusicalGroupScrollPage,
  scrollMusicalGroupPageToElement,
} from './musicalGroupScrollOffset'
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
const { savePage, listsVersion } = useWikitaSaveFeedback()

useMusicalGroupScrollStates()
const { scrollActiveHomeTabToTop } = useMusicalGroupHomeTabScroll()

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
  savedSorted,
  recentlySaved,
  savedItemsLoading,
  homeRelatedItems,
  homeRelatedLoading,
  helpWanted,
  recentChanges,
  helpWantedLoading,
} = useMusicalGroupHome()

const featuredTabHasContent = computed(
  () =>
    Boolean(featuredArticle.value) || didYouKnow.value.length > 0 || bornOnThisDay.value.length > 0,
)

const showFeaturedFeed = computed(() => activeTab.value === 'featured')

const FEATURED_DYK_SECTION_ID = 'featured-did-you-know'
const FEATURED_BORN_SECTION_ID = 'featured-born-on-this-day'
const SAVED_LISTS_HASH = 'saved-lists'
const SAVED_PAGES_HASH = 'saved-pages'
const HOME_FEATURED_PREVIEW_LIMIT = 3
const SAVED_TAB_LISTS_PREVIEW_LIMIT = 3
const SAVED_TAB_SAVED_PREVIEW_LIMIT = 5

const savedViewMode = computed(() => {
  if (activeTab.value !== 'saved') return 'hub'
  const hash = route.hash.replace(/^#/, '')
  if (hash === SAVED_LISTS_HASH) return 'lists'
  if (hash === SAVED_PAGES_HASH) return 'pages'
  return 'hub'
})
const savedHubActive = computed(() => activeTab.value === 'saved' && savedViewMode.value === 'hub')
const savedPagesActive = computed(
  () => activeTab.value === 'saved' && savedViewMode.value === 'pages',
)
const savedTabRelatedLimit = 3
const userLists = computed(() => {
  listsVersion.value
  return listUserLists()
})
const { listCards } = useListCardThumbnails(userLists)
const savedTabListsPreview = computed(() => listCards.value.slice(0, SAVED_TAB_LISTS_PREVIEW_LIMIT))
const savedTabSavedPreview = computed(() =>
  savedSorted.value.slice(0, SAVED_TAB_SAVED_PREVIEW_LIMIT),
)
const homeTrendingPreview = computed(() => trendingItems.value.slice(0, 2))
const homeDidYouKnowPreview = computed(() => didYouKnow.value.slice(0, HOME_FEATURED_PREVIEW_LIMIT))
const homeBornOnThisDayPreview = computed(() =>
  bornOnThisDay.value.slice(0, HOME_FEATURED_PREVIEW_LIMIT),
)
const homeRelatedLimit = 3

const homeRelatedPreview = computed(() => homeRelatedItems.value.slice(0, homeRelatedLimit))

const homeTabHasFeedContent = computed(
  () =>
    Boolean(featuredArticle.value) ||
    homeTrendingPreview.value.length > 0 ||
    (!hasSavedPages.value && homeDidYouKnowPreview.value.length > 0) ||
    (!hasSavedPages.value && homeBornOnThisDayPreview.value.length > 0),
)

/** Default home tab: header/tabs paint first; show progress until feed previews arrive. */
const homeTabInitialLoading = computed(
  () =>
    activeTab.value === 'home' &&
    !hasSavedPages.value &&
    (featuredTabLoading.value || trendingLoading.value) &&
    !homeTabHasFeedContent.value,
)

const { related: savedHubRelatedFeed, loading: savedHubRelatedLoading } = useRelatedReadingFeed(
  savedSorted,
  savedHubActive,
  'saved',
  'bookmarks',
)

const { related: savedListsRelatedFeed, loading: savedListsRelatedLoading } = useRelatedReadingFeed(
  userLists,
  savedPagesActive,
  'saved',
  'lists',
)

const savedHubRelated = computed(() =>
  savedHubRelatedFeed.value
    .filter((item) => !item.itemId || !isBookmarked(item.itemId))
    .slice(0, savedTabRelatedLimit),
)

const savedListsRelated = computed(() => savedListsRelatedFeed.value)

interface FlagPresentation {
  label: string
  icon?: Icon
  color: WikitaCardItemTypeColor
}

const FLAG_PRESENTATION: Record<Exclude<HomeRecentChangeFlag, 'none'>, FlagPresentation> = {
  'first-edit': { label: "User's first edit", icon: cdxIconUserAdd, color: 'success' },
  'new-editor': { label: 'New editor', icon: cdxIconUserAdd, color: 'success' },
  'good-faith': { label: 'Good faith', icon: cdxIconHeartOutline, color: 'success' },
  'needs-reference': {
    label: 'Needs a reference check',
    icon: cdxIconReference,
    color: 'progressive',
  },
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

function relatedReadingInList(itemId: string): boolean {
  void listsVersion.value
  return isPageInAnyList(itemId)
}

function onRelatedReadingSave(itemId: string, title: string, thumbnailUrl?: string) {
  const saved = savePage(itemId, title, thumbnailUrl)
  relatedReadingBookmarkState.value = {
    ...relatedReadingBookmarkState.value,
    [itemId]: saved,
  }
}

function listRelatedAdded(listId: string, itemId: string): boolean {
  void listsVersion.value
  return isPageInList(listId, itemId)
}

function onAddRelatedToList(listId: string, itemId: string, thumbnailUrl?: string) {
  addPageToList(listId, itemId, thumbnailUrl)
  listsVersion.value += 1
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

function savedTabRelatedToLabel(listName: string): string {
  return formatRelatedToListLabel(listName)
}

function editSuggestionRelatedToLabel(suggestion: HomeHelpWanted): string {
  return formatEditSuggestionRelatedToLabel(suggestion, savedSorted.value)
}

async function handleSetHomeTab(tab: HomeTabId, hash?: string) {
  const sameTab = tab === activeTab.value
  await setHomeTab(tab, hash)
  if (sameTab && !hash) scrollActiveHomeTabToTop()
}

async function scrollToFeaturedSectionHash(rawHash: string): Promise<void> {
  await nextTick()
  requestAnimationFrame(() => {
    const page = getMusicalGroupScrollPage()
    const id = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash
    const target = document.getElementById(id)
    if (page && target) {
      scrollMusicalGroupPageToElement(page, target)
    }
  })
}

watch(
  () => [route.hash, activeTab.value, featuredTabLoading.value] as const,
  ([hash, tab, loading]) => {
    if (tab !== 'featured' || loading || !hash) return
    void scrollToFeaturedSectionHash(hash)
  },
  { immediate: true },
)

watch(
  [hasSavedPages, activeTab],
  ([saved, tab]) => {
    if (!saved && (tab === 'saved' || tab === 'contribute' || tab === 'activity')) {
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
      @update:active-tab="handleSetHomeTab"
    />

    <div class="musical-group-home__body">
      <template v-if="showFeaturedFeed">
        <CdxProgressBar v-if="featuredTabLoading" inline aria-label="Loading featured" />

        <template v-else>
          <div v-if="featuredTabError" class="musical-group-home__feed-error">
            <p>{{ featuredTabError }}</p>
            <CdxButton weight="quiet" @click="retryFeaturedFeed">Try again</CdxButton>
          </div>

          <WikitaHomeSection v-if="featuredArticle">
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
            v-if="didYouKnow.length"
            title="Did you know"
            :section-id="FEATURED_DYK_SECTION_ID"
          >
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

          <WikitaHomeSection
            v-if="bornOnThisDay.length"
            title="Born on this day"
            :section-id="FEATURED_BORN_SECTION_ID"
          >
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

          <p
            v-else-if="!featuredTabHasContent && !featuredTabError"
            class="musical-group-home__feed-empty"
          >
            No featured content is available right now.
          </p>
        </template>
      </template>

      <template v-else-if="activeTab === 'home'">
        <div v-if="homeTabInitialLoading" class="musical-group-home__loading musical-group-home__loading--initial">
          <CdxProgressBar inline aria-label="Loading home" />
        </div>

        <WikitaHomeSection
          v-if="featuredArticle"
          title="Featured"
          to-tab="featured"
          @title-navigate="handleSetHomeTab"
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
          @title-navigate="handleSetHomeTab"
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
          v-if="!hasSavedPages && homeDidYouKnowPreview.length"
          title="Did you know"
          to-tab="featured"
          :to-hash="FEATURED_DYK_SECTION_ID"
          @title-navigate="handleSetHomeTab"
        >
          <WikitaCardItem
            v-for="(item, index) in homeDidYouKnowPreview"
            :key="`home-dyk-${index}`"
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

        <WikitaHomeSection
          v-if="!hasSavedPages && homeBornOnThisDayPreview.length"
          title="Born on this day"
          to-tab="featured"
          :to-hash="FEATURED_BORN_SECTION_ID"
          @title-navigate="handleSetHomeTab"
        >
          <WikitaCardItem
            v-for="item in homeBornOnThisDayPreview"
            :key="`home-born-${item.enwikiTitle}`"
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

        <WikitaHomeSection
          v-if="hasSavedPages && (savedItemsLoading || recentlySaved.length)"
          title="Saved"
          to-tab="saved"
          @title-navigate="handleSetHomeTab"
        >
          <div v-if="savedItemsLoading" class="musical-group-home__loading">
            <CdxProgressBar inline aria-label="Loading saved pages" />
          </div>
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
          v-if="
            hasSavedPages && !savedItemsLoading && (homeRelatedPreview.length || homeRelatedLoading)
          "
          title="Related reading"
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
            :action-in-list="item.itemId ? relatedReadingInList(item.itemId) : false"
            :action-label="item.itemId && relatedReadingSaved(item.itemId) ? 'Saved' : 'Save'"
            :title="item.title"
            :body="item.description"
            :thumbnail-url="item.thumbnailUrl"
            :thumbnail-alt="item.title"
            :href="item.itemId ? itemHref(item.itemId) : undefined"
            :external-href="item.itemId ? undefined : item.articleUrl"
            @action-click="onRelatedReadingSave(item.itemId!, item.title, item.thumbnailUrl)"
          />
          <div v-if="homeRelatedLoading" class="musical-group-home__loading">
            <CdxProgressBar inline aria-label="Loading related reading" />
          </div>
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="
            hasSavedPages &&
            !savedItemsLoading &&
            !homeRelatedLoading &&
            (helpWantedLoading || helpWanted.length)
          "
          title="Help wanted"
          to-tab="contribute"
          @title-navigate="handleSetHomeTab"
        >
          <div v-if="helpWantedLoading" class="musical-group-home__loading">
            <CdxProgressBar inline aria-label="Loading edit suggestions" />
          </div>
          <template v-else>
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
          </template>
        </WikitaHomeSection>

        <WikitaHomeSection
          v-if="
            hasSavedPages &&
            !savedItemsLoading &&
            !homeRelatedLoading &&
            !helpWantedLoading &&
            recentChanges.length
          "
          title="Recent changes"
          to-tab="activity"
          @title-navigate="handleSetHomeTab"
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

      <template v-else-if="activeTab === 'saved'">
        <div class="musical-group-home__saved-tab">
          <template v-if="savedViewMode === 'lists'">
            <WikitaHomeSection v-if="listCards.length">
              <WikitaCardItem
                v-for="{ list, thumbnailUrl } in listCards"
                :key="list.id"
                :show-type="false"
                :show-snippet="false"
                :show-info="false"
                :title="list.name"
                :body="formatListItemCount(list.itemIds.length)"
                :thumbnail-url="thumbnailUrl"
                :thumbnail-alt="list.name"
              />
            </WikitaHomeSection>
            <p v-else class="musical-group-home__saved-empty">
              You have not created any lists yet.
            </p>
          </template>

          <template v-else-if="savedViewMode === 'pages'">
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
            <p v-else class="musical-group-home__saved-empty">You have not saved any pages yet.</p>

            <WikitaHomeSection
              v-if="savedListsRelated.length || savedListsRelatedLoading"
              title="Related"
            >
              <WikitaCardItem
                v-for="item in savedListsRelated"
                :key="`${item.relatedToListId ?? 'list'}-${item.title}`"
                :show-type="false"
                :show-snippet="false"
                :show-info="Boolean(savedTabRelatedToLabel(item.relatedToTitle))"
                :info-left="savedTabRelatedToLabel(item.relatedToTitle)"
                :show-action="Boolean(item.itemId && item.relatedToListId)"
                :action-active="
                  item.relatedToListId && item.itemId
                    ? listRelatedAdded(item.relatedToListId, item.itemId)
                    : false
                "
                :action-in-list="true"
                :action-label="
                  item.relatedToListId &&
                  item.itemId &&
                  listRelatedAdded(item.relatedToListId, item.itemId)
                    ? 'Added'
                    : 'Add to list'
                "
                :title="item.title"
                :body="item.description"
                :thumbnail-url="item.thumbnailUrl"
                :thumbnail-alt="item.title"
                :href="item.itemId ? itemHref(item.itemId) : undefined"
                :external-href="item.itemId ? undefined : item.articleUrl"
                @action-click="
                  onAddRelatedToList(item.relatedToListId!, item.itemId!, item.thumbnailUrl)
                "
              />
              <div v-if="savedListsRelatedLoading" class="musical-group-home__loading">
                <CdxProgressBar inline aria-label="Loading related pages" />
              </div>
            </WikitaHomeSection>
          </template>

          <template v-else>
            <WikitaHomeSection
              v-if="userLists.length"
              title="Lists"
              to-tab="saved"
              :to-hash="SAVED_LISTS_HASH"
              @title-navigate="handleSetHomeTab"
            >
              <WikitaCardItem
                v-for="{ list, thumbnailUrl } in savedTabListsPreview"
                :key="list.id"
                :show-type="false"
                :show-snippet="false"
                :show-info="false"
                :title="list.name"
                :body="formatListItemCount(list.itemIds.length)"
                :thumbnail-url="thumbnailUrl"
                :thumbnail-alt="list.name"
              />
            </WikitaHomeSection>

            <WikitaHomeSection
              v-if="savedSorted.length"
              title="Saved"
              to-tab="saved"
              :to-hash="SAVED_PAGES_HASH"
              @title-navigate="handleSetHomeTab"
            >
              <WikitaCardItem
                v-for="item in savedTabSavedPreview"
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

            <p
              v-if="!userLists.length && !savedSorted.length"
              class="musical-group-home__saved-empty"
            >
              You have not saved any pages yet.
            </p>

            <WikitaHomeSection
              v-if="savedHubRelated.length || savedHubRelatedLoading"
              title="Related"
            >
              <WikitaCardItem
                v-for="item in savedHubRelated"
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
                @action-click="onRelatedReadingSave(item.itemId!, item.title, item.thumbnailUrl)"
              />
              <div v-if="savedHubRelatedLoading" class="musical-group-home__loading">
                <CdxProgressBar inline aria-label="Loading related pages" />
              </div>
            </WikitaHomeSection>
          </template>
        </div>
      </template>

      <template v-else-if="activeTab === 'trending'">
        <CdxProgressBar v-if="trendingLoading" inline aria-label="Loading trending" />

        <div v-else-if="trendingTabError" class="musical-group-home__feed-error">
          <p>{{ trendingTabError }}</p>
          <CdxButton weight="quiet" @click="retryTrendingFeed">Try again</CdxButton>
        </div>

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

        <p v-else class="musical-group-home__feed-empty">No trending articles available.</p>
      </template>

      <WikitaActivityTabPanel
        v-else-if="activeTab === 'activity'"
        :items="savedSorted"
        :saved-items-loading="savedItemsLoading"
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
  padding-inline: var(--spacing-50);
  padding-bottom: var(--spacing-50);
}

.musical-group-home__body > .wikita-home-section--has-title:first-child,
.musical-group-home__saved-tab > .wikita-home-section--has-title:first-child {
  margin-top: var(--spacing-100);
}

.musical-group-home__body > .wikita-home-section--no-title:first-child,
.musical-group-home__saved-tab > .wikita-home-section--no-title:first-child {
  margin-top: calc(var(--spacing-50) + 0px);
}

.musical-group-home__empty {
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}

.musical-group-home__saved-empty,
.musical-group-home__feed-empty,
.musical-group-home__feed-error p {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.musical-group-home__feed-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}

.musical-group-home__saved-tab {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.musical-group-home__loading {
  display: flex;
  justify-content: center;
  padding-block: var(--spacing-50);
}

.musical-group-home__loading--initial {
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
  align-items: flex-start;
  padding-top: var(--spacing-250);
}
</style>
