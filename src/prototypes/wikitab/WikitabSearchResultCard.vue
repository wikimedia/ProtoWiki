<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon, CdxThumbnail } from '@wikimedia/codex'
import { cdxIconLink, cdxIconSearch, cdxIconSuccess } from '@wikimedia/codex-icons'

import type { WikitabSearchArticle } from './data/fetchWikitabSearchArticles'

const props = defineProps<{
  article: WikitabSearchArticle
}>()

const supportingIcon = computed(() => {
  if (props.article.relation === 'exact') return cdxIconSuccess
  if (props.article.relation === 'near') return cdxIconSearch
  return cdxIconLink
})

const supportingText = computed(() => {
  if (props.article.relation === 'exact') return 'Exact match'
  if (props.article.relation === 'near') return 'Nearest match'
  return `Related to ${props.article.seedTitle ?? ''}`
})

const thumbnail = computed(() =>
  props.article.thumbnailUrl ? { url: props.article.thumbnailUrl } : null,
)
</script>

<template>
  <a
    class="wikitab-search-result-card"
    :href="article.href"
    target="_blank"
    rel="noreferrer"
  >
    <CdxThumbnail
      class="wikitab-search-result-card__thumbnail"
      :thumbnail="thumbnail"
    />

    <div class="wikitab-search-result-card__content">
      <p class="wikitab-search-result-card__title">{{ article.title }}</p>
      <p v-if="article.description" class="wikitab-search-result-card__description">
        {{ article.description }}
      </p>
      <p v-if="article.extract" class="wikitab-search-result-card__extract">
        {{ article.extract }}
      </p>
      <p class="wikitab-search-result-card__supporting">
        <CdxIcon :icon="supportingIcon" size="x-small" />
        {{ supportingText }}
      </p>
    </div>
  </a>
</template>

<style scoped>
.wikitab-search-result-card {
  display: flex;
  gap: var(--spacing-75);
  padding-block: var(--spacing-75);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  color: inherit;
  text-decoration: none;
}

.wikitab-search-result-card__thumbnail {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
}

.wikitab-search-result-card__thumbnail :deep(.cdx-thumbnail__image),
.wikitab-search-result-card__thumbnail :deep(.cdx-thumbnail__placeholder) {
  width: 96px;
  height: 96px;
}

.wikitab-search-result-card__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-search-result-card__title {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikitab-search-result-card__description,
.wikitab-search-result-card__extract {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-result-card__supporting {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  margin: 0;
  padding-top: var(--spacing-25);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}
</style>
