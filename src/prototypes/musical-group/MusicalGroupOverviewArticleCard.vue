<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconNewspaper } from '@wikimedia/codex-icons'

import OverviewSummaryCard from './OverviewSummaryCard.vue'
import type { MusicalGroupOverviewArticle } from './data/types'

interface Props {
  article?: MusicalGroupOverviewArticle
  loading?: boolean
  noArticle?: boolean
}

defineProps<Props>()
</script>

<template>
  <OverviewSummaryCard>
    <template #header>
      <div class="overview-article-card__title-row">
        <CdxIcon :icon="cdxIconNewspaper" class="overview-article-card__icon" />
        <span class="overview-article-card__title">Article</span>
      </div>
    </template>

    <template v-if="loading" #meta>
      <span class="overview-article-card__skeleton overview-article-card__skeleton--line" />
      <span class="overview-article-card__skeleton overview-article-card__skeleton--line" />
    </template>
    <template v-else-if="article && !noArticle" #meta>
      <span>English Wikipedia</span>
      <span v-if="article.wordCountLabel">{{ article.wordCountLabel }}</span>
    </template>
    <template v-else-if="noArticle" #meta>
      <span>No English Wikipedia article</span>
    </template>

    <template v-if="loading" #body>
      <span class="overview-article-card__skeleton overview-article-card__skeleton--extract" />
    </template>
    <template v-else-if="article?.extractHtml && !noArticle" #body>
      <div class="overview-article-card__extract" v-html="article.extractHtml" />
    </template>

    <template v-if="article?.thumbnailUrl && !loading && !noArticle" #thumbnail>
      <img
        class="overview-summary-card__thumb"
        :src="article.thumbnailUrl"
        alt=""
        loading="lazy"
        draggable="false"
      />
    </template>

    <template v-if="loading" #footer>
      <span class="overview-article-card__skeleton overview-article-card__skeleton--footer" />
      <span class="overview-article-card__skeleton overview-article-card__skeleton--footer" />
    </template>
    <template v-else-if="article && !noArticle" #footer>
      <span>{{ article.lastEditedLabel }}</span>
      <span v-if="article.viewsLabel !== '—'">{{ article.viewsLabel }}</span>
    </template>
  </OverviewSummaryCard>
</template>

<style scoped>
.overview-article-card__title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.overview-article-card__icon {
  flex-shrink: 0;
}

.overview-article-card__title {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.overview-article-card__extract {
  display: -webkit-box;
  max-height: calc(var(--line-height-small) * 3);
  overflow: hidden;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.overview-article-card__extract :deep(p) {
  margin: 0;
}

.overview-article-card__extract :deep(b),
.overview-article-card__extract :deep(strong) {
  font-weight: var(--font-weight-normal);
}

.overview-article-card__extract :deep(.overview-extract__link) {
  color: var(--color-base);
  text-decoration: underline;
  cursor: default;
}

.overview-article-card__skeleton {
  display: block;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--background-color-interactive-subtle),
    var(--background-color-base),
    var(--background-color-interactive-subtle)
  );
}

.overview-article-card__skeleton--line {
  width: 140px;
  height: 22px;
}

.overview-article-card__skeleton--line + .overview-article-card__skeleton--line {
  width: 100px;
}

.overview-article-card__skeleton--extract {
  width: 100%;
  height: calc(var(--line-height-small) * 3);
}

.overview-article-card__skeleton--footer {
  width: 120px;
  height: 22px;
}
</style>
