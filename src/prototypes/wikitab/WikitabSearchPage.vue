<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { CdxTab, CdxTabs } from '@wikimedia/codex'

import WikitabSearchResultCard from './WikitabSearchResultCard.vue'
import { useInfiniteScroll } from './useInfiniteScroll'
import { useWikitabSearchResults } from './useWikitabSearchResults'

const props = defineProps<{
  searchQuery: string
}>()

const searchQueryRef = toRef(props, 'searchQuery')
const activeTab = ref('articles')
const sentinel = ref<HTMLElement | null>(null)

const { articles, loading, loadingMore, hasMore, loadMore } =
  useWikitabSearchResults(searchQueryRef)

const infiniteScrollEnabled = computed(
  () => activeTab.value === 'articles' && hasMore.value && !loading.value,
)

useInfiniteScroll({
  sentinel,
  enabled: infiniteScrollEnabled,
  onReach: () => {
    void loadMore()
  },
})

const SKELETON_COUNT = 3
</script>

<template>
  <div class="wikitab-search-page">
    <CdxTabs v-model:active="activeTab" class="wikitab-search-page__tabs">
      <CdxTab name="articles" label="Articles">
        <div v-if="activeTab === 'articles'" class="wikitab-search-page__articles">
          <template v-if="loading">
            <div
              v-for="index in SKELETON_COUNT"
              :key="index"
              class="wikitab-search-page__skeleton"
            />
          </template>

          <template v-else>
            <WikitabSearchResultCard
              v-for="article in articles"
              :key="article.pageid"
              :article="article"
            />
          </template>

          <div
            v-if="loadingMore"
            class="wikitab-search-page__skeleton wikitab-search-page__skeleton--more"
          />

          <div
            v-if="!loading && hasMore"
            ref="sentinel"
            class="wikitab-search-page__sentinel"
            aria-hidden="true"
          />
        </div>
      </CdxTab>

      <CdxTab name="images" label="Images">
        <div v-if="activeTab === 'images'" />
      </CdxTab>

      <CdxTab name="activity" label="Activity">
        <div v-if="activeTab === 'activity'" />
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

.wikitab-search-page__articles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  width: 100%;
  max-width: 896px;
  padding-top: var(--spacing-150);
}

[data-skin='desktop'] .wikitab-search-page__articles {
  gap: var(--spacing-150);
}

.wikitab-search-page__skeleton {
  height: 120px;
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-page__skeleton--more {
  height: 80px;
}

.wikitab-search-page__sentinel {
  height: 1px;
}
</style>
