<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconArticle } from '@wikimedia/codex-icons'

import type { TaskColor } from '../data/microtaskCatalog'

interface Props {
  taskHeading: string
  taskColor: TaskColor
  articleTitle: string
  articleDescription: string
  taskDescription: string
  thumbnailSrc?: string
}

withDefaults(defineProps<Props>(), {
  thumbnailSrc: undefined,
})
</script>

<template>
  <article class="suggestion-card">
    <div class="suggestion-card__body">
      <p class="suggestion-card__task" :class="`suggestion-card__task--${taskColor}`">
        {{ taskHeading }}
      </p>
      <p class="suggestion-card__headline">
        <strong class="suggestion-card__title">{{ articleTitle }}</strong>
        <template v-if="articleDescription">
          <span class="suggestion-card__desc-sep"> &middot; </span>
          <span class="suggestion-card__desc">{{ articleDescription }}</span>
        </template>
      </p>
      <p class="suggestion-card__hint">{{ taskDescription }}</p>
    </div>

    <span class="suggestion-card__thumb">
      <img v-if="thumbnailSrc" :src="thumbnailSrc" alt="" />
      <CdxIcon v-else :icon="cdxIconArticle" />
    </span>
  </article>
</template>

<style scoped>
.suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  padding: 0.8125rem;
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base);
}

.suggestion-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  flex: 1;
  min-width: 0;
}

.suggestion-card__task {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small, 1.375);
}

.suggestion-card__task--green {
  color: var(--color-success, #177860);
}

.suggestion-card__task--amber {
  color: var(--color-warning, #886425);
}

.suggestion-card__headline {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.43);
  color: var(--color-base);
}

.suggestion-card__title {
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold);
}

.suggestion-card__desc {
  font-size: var(--font-size-small, 0.875rem);
}

.suggestion-card__hint {
  margin: 0;
  padding-top: var(--spacing-25, 4px);
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.suggestion-card__thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
  overflow: hidden;
  color: var(--color-placeholder, #72777d);
}

.suggestion-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
