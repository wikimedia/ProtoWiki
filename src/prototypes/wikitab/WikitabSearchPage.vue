<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { CdxTab, CdxTabs } from '@wikimedia/codex'

import WikitabSearchActivityCard from './WikitabSearchActivityCard.vue'
import WikitabSearchContributeCard from './WikitabSearchContributeCard.vue'
import WikitabSearchImageGrid from './WikitabSearchImageGrid.vue'
import WikitabSearchImageSkeletonGrid from './WikitabSearchImageSkeletonGrid.vue'
import WikitabSearchLoadingCard from './WikitabSearchLoadingCard.vue'
import WikitabSearchResultCard from './WikitabSearchResultCard.vue'
import type { WikitabSearchArticle } from './data/fetchWikitabSearchArticles'
import { useInfiniteScroll } from './useInfiniteScroll'
import { useWikitabSearchActivity } from './useWikitabSearchActivity'
import { useWikitabSearchContribute } from './useWikitabSearchContribute'
import { useWikitabSearchImages } from './useWikitabSearchImages'
import { useWikitabSearchResults } from './useWikitabSearchResults'
import { useWikitabSearchTab } from './useWikitabSearchTab'
import { useWikitabSearchImageColumnCount } from './useWikitabSearchImageColumns'

const props = defineProps<{
  searchQuery: string
  isArticleSaved: (title: string) => boolean
}>()

const emit = defineEmits<{
  'toggle-save-article': [article: WikitabSearchArticle]
}>()

const searchQueryRef = toRef(props, 'searchQuery')
const { activeTab } = useWikitabSearchTab()
const articlesSentinel = ref<HTMLElement | null>(null)
const imagesListRef = ref<HTMLElement | null>(null)
const { columnCount: imageColumnCount } = useWikitabSearchImageColumnCount(imagesListRef)
const activitySentinel = ref<HTMLElement | null>(null)
const contributeSentinel = ref<HTMLElement | null>(null)

const {
  articles,
  loading,
  loadingRelated,
  loadingMore,
  hasMore,
  loadMore,
  thumbnailBackfillPendingPageids,
} = useWikitabSearchResults(searchQueryRef)

const knownTitles = computed(() =>
  articles.value.slice(0, 6).map((article) => ({
    pageid: article.pageid,
    title: article.title,
    thumbnailUrl: article.thumbnailUrl,
  })),
)

const imagesEnabled = computed(() => activeTab.value === 'images')
const activityEnabled = computed(() => activeTab.value === 'activity')
const contributeEnabled = computed(() => activeTab.value === 'contribute')

const {
  images,
  loading: imagesLoading,
  loadingMore: imagesLoadingMore,
  hasMore: imagesHasMore,
  loadMore: loadMoreImages,
} = useWikitabSearchImages(searchQueryRef, imagesEnabled)

const {
  slots: activitySlots,
  loading: activityLoading,
  fillingInitial: activityFillingInitial,
  loadingTail: activityLoadingTail,
  loadingMore: activityLoadingMore,
  hasMore: activityHasMore,
  resolvedCount: activityResolvedCount,
  loadMore: loadMoreActivity,
  dismissActivity,
} = useWikitabSearchActivity(searchQueryRef, knownTitles, loading, activityEnabled)

const {
  slots: contributeSlots,
  loading: contributeLoading,
  fillingInitial: contributeFillingInitial,
  loadingTail: contributeLoadingTail,
  loadingMore: contributeLoadingMore,
  hasMore: contributeHasMore,
  resolvedCount: contributeResolvedCount,
  loadMore: loadMoreContribute,
} = useWikitabSearchContribute(searchQueryRef, knownTitles, loading, contributeEnabled)

const articlesScrollEnabled = computed(
  () => activeTab.value === 'articles' && hasMore.value && !loading.value,
)

const imagesScrollEnabled = computed(
  () =>
    activeTab.value === 'images' &&
    imagesHasMore.value &&
    !imagesLoading.value &&
    !imagesLoadingMore.value,
)

const activityScrollEnabled = computed(
  () =>
    activeTab.value === 'activity' &&
    activityHasMore.value &&
    !activityLoading.value &&
    !activityFillingInitial.value &&
    !activityLoadingMore.value,
)

const contributeScrollEnabled = computed(
  () =>
    activeTab.value === 'contribute' &&
    contributeHasMore.value &&
    !contributeLoading.value &&
    !contributeFillingInitial.value &&
    !contributeLoadingMore.value,
)

useInfiniteScroll({
  sentinel: articlesSentinel,
  enabled: articlesScrollEnabled,
  onReach: () => {
    void loadMore()
  },
})

useInfiniteScroll({
  sentinel: activitySentinel,
  enabled: activityScrollEnabled,
  onReach: () => {
    void loadMoreActivity()
  },
})

useInfiniteScroll({
  sentinel: contributeSentinel,
  enabled: contributeScrollEnabled,
  onReach: () => {
    void loadMoreContribute()
  },
})

const INITIAL_SKELETON_COUNT = 3
const TAIL_SKELETON_COUNT = 2
const LOAD_MORE_SKELETON_COUNT = 3
const INITIAL_IMAGE_SKELETON_COUNT = 16
</script>

<template>
  <div class="wikitab-search-page">
    <CdxTabs v-model:active="activeTab" class="wikitab-search-page__tabs">
      <CdxTab name="articles" label="Articles">
        <div v-if="activeTab === 'articles'" class="wikitab-search-page__list">
          <template v-if="loading && articles.length === 0">
            <WikitabSearchLoadingCard
              v-for="index in INITIAL_SKELETON_COUNT"
              :key="index"
              variant="article"
            />
          </template>

          <WikitabSearchResultCard
            v-for="article in articles"
            :key="article.pageid"
            :article="article"
            :search-query="searchQuery"
            :thumbnail-backfill-pending="thumbnailBackfillPendingPageids.has(article.pageid)"
            :is-article-saved="isArticleSaved(article.title)"
            @toggle-save="emit('toggle-save-article', article)"
          />

          <template v-if="(loading || loadingRelated) && articles.length > 0">
            <WikitabSearchLoadingCard
              v-for="index in TAIL_SKELETON_COUNT"
              :key="`tail-${index}`"
              variant="article"
            />
          </template>

          <template v-if="loadingMore">
            <WikitabSearchLoadingCard
              v-for="index in LOAD_MORE_SKELETON_COUNT"
              :key="`more-${index}`"
              variant="article"
            />
          </template>

          <div
            v-if="!loading && hasMore"
            ref="articlesSentinel"
            class="wikitab-search-page__sentinel"
            aria-hidden="true"
          />
        </div>
      </CdxTab>

      <CdxTab name="images" label="Images">
        <div
          v-if="activeTab === 'images'"
          ref="imagesListRef"
          class="wikitab-search-page__list wikitab-search-page__list--images"
        >
          <WikitabSearchImageSkeletonGrid
            v-if="imagesLoading && images.length === 0"
            :column-count="imageColumnCount"
            :count="INITIAL_IMAGE_SKELETON_COUNT"
          />

          <WikitabSearchImageGrid
            v-if="images.length > 0"
            :images="images"
            :column-count="imageColumnCount"
            :loading-more="imagesLoadingMore"
            :scroll-enabled="imagesScrollEnabled"
            @reach="loadMoreImages"
          />
        </div>
      </CdxTab>

      <CdxTab name="activity" label="Activity">
        <div
          v-if="activeTab === 'activity'"
          class="wikitab-search-page__list wikitab-search-page__list--activity"
        >
          <template
            v-if="
              (activityLoading || (activityFillingInitial && activityResolvedCount === 0)) &&
              activityResolvedCount === 0
            "
          >
            <WikitabSearchLoadingCard
              v-for="index in INITIAL_SKELETON_COUNT"
              :key="index"
              variant="activity"
            />
          </template>

          <template
            v-for="slot in activitySlots"
            :key="slot.kind === 'resolved' ? slot.item.revid : slot.kind"
          >
            <WikitabSearchActivityCard
              v-if="slot.kind === 'resolved'"
              :item="slot.item"
              @dismiss="dismissActivity"
            />
          </template>

          <template v-if="activityLoadingTail">
            <WikitabSearchLoadingCard
              v-for="index in TAIL_SKELETON_COUNT"
              :key="`activity-tail-${index}`"
              variant="activity"
            />
          </template>

          <template v-if="activityLoadingMore">
            <WikitabSearchLoadingCard
              v-for="index in LOAD_MORE_SKELETON_COUNT"
              :key="`activity-more-${index}`"
              variant="activity"
            />
          </template>

          <div
            v-if="!activityLoading && !activityFillingInitial && activityHasMore"
            ref="activitySentinel"
            class="wikitab-search-page__sentinel"
            aria-hidden="true"
          />
        </div>
      </CdxTab>

      <CdxTab name="contribute" label="Contribute">
        <div
          v-if="activeTab === 'contribute'"
          class="wikitab-search-page__list wikitab-search-page__list--contribute"
        >
          <template
            v-if="
              (contributeLoading ||
                (contributeFillingInitial && contributeResolvedCount === 0)) &&
              contributeResolvedCount === 0
            "
          >
            <WikitabSearchLoadingCard
              v-for="index in INITIAL_SKELETON_COUNT"
              :key="index"
              variant="activity"
            />
          </template>

          <template
            v-for="slot in contributeSlots"
            :key="slot.kind === 'resolved' ? slot.item.pageid : slot.kind"
          >
            <WikitabSearchContributeCard v-if="slot.kind === 'resolved'" :item="slot.item" />
          </template>

          <template v-if="contributeLoadingTail">
            <WikitabSearchLoadingCard
              v-for="index in TAIL_SKELETON_COUNT"
              :key="`contribute-tail-${index}`"
              variant="activity"
            />
          </template>

          <template v-if="contributeLoadingMore">
            <WikitabSearchLoadingCard
              v-for="index in LOAD_MORE_SKELETON_COUNT"
              :key="`contribute-more-${index}`"
              variant="activity"
            />
          </template>

          <div
            v-if="!contributeLoading && !contributeFillingInitial && contributeHasMore"
            ref="contributeSentinel"
            class="wikitab-search-page__sentinel"
            aria-hidden="true"
          />
        </div>
      </CdxTab>
    </CdxTabs>
  </div>
</template>

<style scoped>
.wikitab-search-page {
  width: 100%;
}

.wikitab-search-page__tabs {
  width: 100%;
}

.wikitab-search-page__tabs :deep(.cdx-tabs__header) {
  margin-inline: 0;
  background-color: var(--wikitab-theme-bg, var(--background-color-base));
  border-bottom-color: var(--wikitab-theme-border, var(--border-color-base));
}

.wikitab-search-page__tabs :deep(.cdx-tabs__prev-scroller::after) {
  background-image: linear-gradient(
    to right,
    var(--wikitab-theme-bg, var(--background-color-base)) 0,
    var(--background-color-transparent, transparent) 100%
  );
}

.wikitab-search-page__tabs :deep(.cdx-tabs__next-scroller::before) {
  background-image: linear-gradient(
    to left,
    var(--wikitab-theme-bg, var(--background-color-base)) 0,
    var(--background-color-transparent, transparent) 100%
  );
}

.wikitab-search-page__tabs :deep(.cdx-tabs__list__item:enabled:not([aria-selected='true'])) {
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-search-page__list {
  --wikitab-search-list-gap: var(--spacing-100);

  display: flex;
  flex-direction: column;
  gap: var(--wikitab-search-list-gap);
  width: 100%;
  padding-top: var(--wikitab-search-list-gap);
}

[data-skin='desktop'] .wikitab-search-page__list {
  --wikitab-search-list-gap: var(--spacing-150);
}

/*
 * Activity cards match the home feed compact type (14px body / 12px small).
 * Same token shadowing as `.wikitab-section__cards` on the home feed.
 */
.wikitab-search-page__list--activity,
.wikitab-search-page__list--contribute {
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;

  gap: var(--spacing-75);
  padding-top: var(--spacing-75);
}

.wikitab-search-page__tabs :deep(.cdx-tabs__content) {
  overflow: visible;
}

/*
 * Image results break out of the centred search column and page gutters to the
 * screen edge, with 2px inset on each side. Tabs and other tab panels stay put.
 */
.wikitab-search-page__list--images {
  gap: 0;
  box-sizing: border-box;
  width: 100vw;
  max-width: 100vw;
  margin-inline: calc(50% - 50vw);
  padding-inline: 2px;
}

.wikitab-search-page__sentinel {
  height: 1px;
}
</style>
