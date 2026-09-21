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

const { articles, loading, loadingMore, hasMore, loadMore } =
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

const SKELETON_COUNT = 3
</script>

<template>
  <div class="wikitab-search-page">
    <CdxTabs v-model:active="activeTab" class="wikitab-search-page__tabs">
      <CdxTab name="articles" label="Articles">
        <div v-if="activeTab === 'articles'" class="wikitab-search-page__list">
          <template v-if="loading">
            <WikitabSearchLoadingCard
              v-for="index in SKELETON_COUNT"
              :key="index"
              variant="article"
            />
          </template>

          <template v-else>
            <WikitabSearchResultCard
              v-for="article in articles"
              :key="article.pageid"
              :article="article"
            />
          </template>

          <WikitabSearchLoadingCard v-if="loadingMore" variant="article" compact />

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
        <div v-if="activeTab === 'activity'" class="wikitab-search-page__list">
          <template v-if="activityLoading">
            <WikitabSearchLoadingCard
              v-for="index in SKELETON_COUNT"
              :key="index"
              variant="activity"
            />
          </template>

          <template v-else>
            <template
              v-for="slot in activitySlots"
              :key="slot.kind === 'loading' ? slot.id : slot.item.revid"
            >
              <WikitabSearchLoadingCard v-if="slot.kind === 'loading'" variant="activity" />
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

.wikitab-search-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  width: 100%;
  max-width: 896px;
  padding-top: var(--spacing-150);
}

[data-skin='desktop'] .wikitab-search-page__list {
  gap: var(--spacing-150);
}

.wikitab-search-page__sentinel {
  height: 1px;
}
</style>
