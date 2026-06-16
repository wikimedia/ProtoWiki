<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconArticleSearch } from '@wikimedia/codex-icons'

import type { TitleSearchResult } from '../data/titleSearch'

interface Props {
  results: TitleSearchResult[]
  /** Flush beneath an input (`attached`) or standalone dropdown (`detached`). */
  layout?: 'attached' | 'detached'
}

withDefaults(defineProps<Props>(), {
  layout: 'detached',
})

defineEmits<{
  select: [title: string]
}>()
</script>

<template>
  <ul
    class="title-search-results"
    :class="{ 'title-search-results--attached': layout === 'attached' }"
  >
    <li v-for="result in results" :key="result.title">
      <button type="button" class="title-search-results__item" @click="$emit('select', result.title)">
        <span class="title-search-results__thumb">
          <img v-if="result.thumbnailSrc" :src="result.thumbnailSrc" alt="" />
          <CdxIcon v-else :icon="cdxIconArticleSearch" size="small" />
        </span>
        <span class="title-search-results__text">
          <span class="title-search-results__title">{{ result.title }}</span>
          <span v-if="result.description" class="title-search-results__desc">{{
            result.description
          }}</span>
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.title-search-results {
  display: flex;
  flex-direction: column;
  margin: var(--spacing-25, 4px) 0 0;
  padding: 0;
  list-style: none;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  overflow: hidden;
}

.title-search-results--attached {
  margin: 0;
  border-top: none;
  border-radius: 0 0 var(--border-radius-base, 2px) var(--border-radius-base, 2px);
}

.title-search-results__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
  width: 100%;
  margin: 0;
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px);
  border: none;
  background: transparent;
  font: inherit;
  line-height: var(--line-height-small, 1.375);
  text-align: start;
  cursor: pointer;
}

.title-search-results__item:hover {
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.title-search-results li + li {
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
}

.title-search-results__thumb {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
  overflow: hidden;
  color: var(--color-subtle);
}

.title-search-results__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title-search-results__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.title-search-results__title {
  display: block;
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base);
}

.title-search-results__desc {
  display: block;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
