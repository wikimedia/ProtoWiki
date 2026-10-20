<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconImage } from '@wikimedia/codex-icons'

import type { TitleSearchResult } from './titleSearch'

defineProps<{
  results: TitleSearchResult[]
  /**
   * Each row's real destination: rows are links, so a ⌘- or middle-click opens a
   * new tab and the status bar tells the truth. `select` decides plain clicks.
   */
  resolveHref: (title: string) => string
}>()

defineEmits<{
  /** A row was clicked: the title and the event, to `preventDefault()` and handle in place. */
  select: [title: string, event: MouseEvent]
}>()
</script>

<template>
  <ul class="title-search-results">
    <li v-for="result in results" :key="result.title">
      <a
        class="title-search-results__item"
        :href="resolveHref(result.title)"
        @click="$emit('select', result.title, $event)"
      >
        <span class="title-search-results__thumb">
          <img v-if="result.thumbnailSrc" :src="result.thumbnailSrc" alt="" />
          <CdxIcon v-else :icon="cdxIconImage" size="small" />
        </span>
        <span class="title-search-results__text">
          <span class="title-search-results__title">{{ result.title }}</span>
          <span v-if="result.description" class="title-search-results__description">
            {{ result.description }}
          </span>
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.title-search-results {
  margin: 0;
  padding: 0;
  list-style: none;
}

.title-search-results li + li {
  border-top: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
}

/* A row: thumbnail, then title over description. A link, minus the link look. */
.title-search-results__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  padding: var(--spacing-50) var(--spacing-100);
  color: var(--color-base);
  text-decoration: none;
}

.title-search-results__item:visited,
.title-search-results__item:hover {
  color: var(--color-base);
  text-decoration: none;
}

.title-search-results__item:hover {
  background-color: var(--background-color-interactive-subtle);
}

.title-search-results__thumb {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--size-250);
  height: var(--size-250);
  overflow: hidden;
  border: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-interactive-subtle);
}

/* On the icon itself: Codex's `.cdx-icon` sets its own colour, so inheriting doesn't reach it. */
.title-search-results__thumb .cdx-icon {
  color: var(--color-placeholder);
}

.title-search-results__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title-search-results__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* Codex Body bold; the description is Codex Small, cut to one line. */
.title-search-results__title {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.title-search-results__description {
  overflow: hidden;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
