<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { CdxTab, CdxTabs } from '@wikimedia/codex'

import WikitabSearchActivityCard from './WikitabSearchActivityCard.vue'
import WikitabSearchLoadingCard from './WikitabSearchLoadingCard.vue'
import WikitabSearchResultCard from './WikitabSearchResultCard.vue'
import { useInfiniteScroll } from './useInfiniteScroll'
import { useWikitabSearchActivity } from './useWikitabSearchActivity'
import { useWikitabSearchResults } from './useWikitabSearchResults'
import { useWikitabSearchTab } from './useWikitabSearchTab'

const props = defineProps<{
  searchQuery: string
}>()

const searchQueryRef = toRef(props, 'searchQuery')
const { activeTab } = useWikitabSearchTab()
const articlesSentinel = ref<HTMLElement | null>(null)
const activitySentinel = ref<HTMLElement | null>(null)

const { articles, loading, loadingRelated, loadingMore, hasMore, loadMore } =
  useWikitabSearchResults(searchQueryRef)

const knownTitles = computed(() =>
  articles.value.slice(0, 6).map((article) => ({
    pageid: article.pageid,
    title: article.title,
    thumbnailUrl: article.thumbnailUrl,
  })),
)

const activityEnabled = computed(() => activeTab.value === 'activity')

const {
  slots: activitySlots,
  loading: activityLoading,
  loadingMore: activityLoadingMore,
  hasMore: activityHasMore,
  loadMore: loadMoreActivity,
} = useWikitabSearchActivity(searchQueryRef, knownTitles, activityEnabled)

const articlesScrollEnabled = computed(
  () => activeTab.value === 'articles' && hasMore.value && !loading.value,
)

const activityScrollEnabled = computed(
  () =>
    activeTab.value === 'activity' &&
    activityHasMore.value &&
    !activityLoading.value &&
    !activityLoadingMore.value,
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

const INITIAL_SKELETON_COUNT = 3
const TAIL_SKELETON_COUNT = 2
const LOAD_MORE_SKELETON_COUNT = 3
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
        <div v-if="activeTab === 'images'" />
      </CdxTab>

      <CdxTab name="activity" label="Activity">
        <div
          v-if="activeTab === 'activity'"
          class="wikitab-search-page__list wikitab-search-page__list--activity"
        >
          <template v-if="activityLoading">
            <WikitabSearchLoadingCard
              v-for="index in LOAD_MORE_SKELETON_COUNT"
              :key="index"
            />
          </template>

          <template v-else>
            <template
              v-for="slot in activitySlots"
              :key="slot.kind === 'loading' ? slot.id : slot.item.revid"
            >
              <WikitabSearchLoadingCard v-if="slot.kind === 'loading'" />
              <WikitabSearchActivityCard v-else :item="slot.item" />
            </template>
          </template>

          <div
            v-if="!activityLoading && activityHasMore"
            ref="activitySentinel"
            class="wikitab-search-page__sentinel"
            aria-hidden="true"
          />
        </div>
      </CdxTab>

      <CdxTab name="contribute" label="Contribute">
        <div v-if="activeTab === 'contribute'" />
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

.wikitab-search-page__list--activity {
  gap: var(--spacing-75);
  padding-top: var(--spacing-75);
}

.wikitab-search-page__sentinel {
  height: 1px;
}
</style>
