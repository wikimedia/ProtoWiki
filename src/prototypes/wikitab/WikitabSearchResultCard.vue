<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import {
  CdxDialog,
  CdxIcon,
  CdxMenuButton,
  CdxThumbnail,
  CdxTooltip as vTooltip,
} from '@wikimedia/codex'
import {
  cdxIconChartLine,
  cdxIconEllipsis,
  cdxIconHelpNotice,
  cdxIconReference,
} from '@wikimedia/codex-icons'

import { formatSearchArticleRelationExplanation } from './data/formatSearchArticleRelation'
import { highlightSearchQuery } from './data/highlightSearchQuery'
import type { WikitabSearchArticle } from './data/fetchWikitabSearchArticles'
import { useThumbnailSlotReady } from './useThumbnailSlotReady'
import { useWikitabSearchArticleAttribution } from './useWikitabSearchArticleAttribution'

const props = defineProps<{
  article: WikitabSearchArticle
  searchQuery: string
}>()

const articleTitle = toRef(() => props.article.title)
const {
  pageViewsLabel,
  referenceCountLabel,
  lastUpdatedLabel,
  pageViewsTooltipText,
  referenceCountTooltipText,
  lastUpdatedTooltipText,
  loading: attributionLoading,
  showSupporting,
} = useWikitabSearchArticleAttribution(articleTitle)

const thumbnailUrl = toRef(() => props.article.thumbnailUrl)
const { showThumbnailPending } = useThumbnailSlotReady(thumbnailUrl)

const thumbnail = computed(() =>
  props.article.thumbnailUrl ? { url: props.article.thumbnailUrl } : null,
)

const descriptionHtml = computed(() =>
  props.article.description
    ? highlightSearchQuery(props.article.description, props.searchQuery)
    : null,
)

const extractHtml = computed(() =>
  props.article.extract
    ? highlightSearchQuery(props.article.extract, props.searchQuery)
    : null,
)

const selection = ref<string | number | null>(null)
const whyDialogOpen = ref(false)

const menuItems = [
  { value: 'why', label: 'Why am I seeing this?', icon: cdxIconHelpNotice },
]

const relationExplanation = computed(() =>
  formatSearchArticleRelationExplanation(props.article, props.searchQuery),
)

watch(selection, (value) => {
  if (value === 'why') whyDialogOpen.value = true
  if (value !== null) selection.value = null
})
</script>

<template>
  <div class="wikitab-search-result-card">
    <div class="wikitab-search-result-card__menu">
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-search-result-card__menu-button"
        weight="quiet"
        :menu-items="menuItems"
        :aria-label="`${article.title} options`"
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

    <CdxDialog
      v-model:open="whyDialogOpen"
      title="Why am I seeing this?"
      close-button-label="Close"
      :dismissable="true"
    >
      <p class="wikitab-search-result-card__why">
        <template v-if="relationExplanation.kind === 'textMatch'">
          Your query was found within the
          <strong>{{ article.title }}</strong> article.
        </template>
        <template v-else-if="relationExplanation.kind === 'nearMatch'">
          <strong>{{ article.title }}</strong> is the nearest match to your query "{{
            relationExplanation.quotedQuery
          }}".
        </template>
        <template v-else>
          <strong>{{ article.title }}</strong>
          {{ relationExplanation.tail }}
          <template v-if="relationExplanation.seedTitle">
            <strong>{{ relationExplanation.seedTitle }}</strong>.
          </template>
        </template>
      </p>
    </CdxDialog>

    <CdxThumbnail
      class="wikitab-search-result-card__thumbnail"
      :class="{ 'wikitab-search-result-card__thumbnail--pending': showThumbnailPending }"
      :thumbnail="thumbnail"
    />

    <div class="wikitab-search-result-card__content">
      <h3 class="wikitab-search-result-card__title">
        <a :href="article.href" target="_blank" rel="noreferrer">
          {{ article.title }}
        </a>
      </h3>
      <p
        v-if="descriptionHtml"
        class="wikitab-search-result-card__description"
        v-html="descriptionHtml"
      />
      <p
        v-if="article.matchSnippetHtml"
        class="wikitab-search-result-card__extract"
        v-html="article.matchSnippetHtml"
      />
      <p
        v-else-if="extractHtml"
        class="wikitab-search-result-card__extract"
        v-html="extractHtml"
      />
      <p
        v-if="attributionLoading"
        class="wikitab-search-result-card__supporting wikitab-search-result-card__supporting--loading"
        aria-hidden="true"
      >
        <span class="wikitab-search-result-card__supporting-skeleton-start">
          <span class="wikitab-search-result-card__supporting-skeleton-signal" />
          <span class="wikitab-search-result-card__supporting-skeleton-signal" />
        </span>
        <span class="wikitab-search-result-card__supporting-skeleton-end" />
      </p>
      <p v-else-if="showSupporting" class="wikitab-search-result-card__supporting">
        <span class="wikitab-search-result-card__supporting-start">
          <span
            v-if="pageViewsLabel"
            v-tooltip:top="pageViewsTooltipText ?? undefined"
            class="wikitab-search-result-card__supporting-signal"
          >
            <CdxIcon :icon="cdxIconChartLine" size="x-small" />
            {{ pageViewsLabel }}
          </span>
          <span
            v-if="referenceCountLabel"
            v-tooltip:top="referenceCountTooltipText ?? undefined"
            class="wikitab-search-result-card__supporting-signal"
          >
            <CdxIcon :icon="cdxIconReference" size="x-small" />
            {{ referenceCountLabel }}
          </span>
        </span>
        <span
          v-if="lastUpdatedLabel"
          v-tooltip:top="lastUpdatedTooltipText ?? undefined"
          class="wikitab-search-result-card__supporting-end"
        >
          {{ lastUpdatedLabel }}
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.wikitab-search-result-card {
  position: relative;
  display: flex;
  gap: var(--spacing-75);
  padding-block: var(--spacing-75);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

.wikitab-search-result-card__menu {
  position: absolute;
  top: var(--spacing-75);
  inset-inline-end: 0;
  z-index: 2;
}

.wikitab-search-result-card__menu-button :deep(.cdx-icon) {
  color: var(--color-subtle);
}

.wikitab-search-result-card__why {
  margin: 0;
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

.wikitab-search-result-card__thumbnail--pending :deep(.cdx-thumbnail),
.wikitab-search-result-card__thumbnail--pending :deep(.cdx-thumbnail__placeholder) {
  border: 0;
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-result-card__thumbnail--pending :deep(.cdx-icon) {
  display: none;
}

.wikitab-search-result-card__thumbnail--pending :deep(.cdx-thumbnail__image) {
  opacity: 0;
}

.wikitab-search-result-card__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
  padding-inline-end: var(--spacing-150);
}

.wikitab-search-result-card__title {
  margin: 0;
}

.wikitab-search-result-card__title a {
  color: var(--color-link);
  text-decoration: none;
}

.wikitab-search-result-card__title a:hover,
.wikitab-search-result-card__title a:focus-visible {
  text-decoration: underline;
}

.wikitab-search-result-card__description,
.wikitab-search-result-card__extract {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-result-card__extract {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.wikitab-search-result-card__description :deep(strong),
.wikitab-search-result-card__extract :deep(strong) {
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
}

.wikitab-search-result-card__supporting {
  display: flex;
  align-items: first baseline;
  justify-content: space-between;
  gap: var(--spacing-25);
  margin: 0;
  padding-top: var(--spacing-25);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikitab-search-result-card__supporting-start {
  display: inline-flex;
  align-items: first baseline;
  gap: var(--spacing-100);
  min-width: 0;
}

.wikitab-search-result-card__supporting-signal {
  display: inline-flex;
  align-items: first baseline;
  gap: var(--spacing-25);
  flex-shrink: 0;
  cursor: default;
}

.wikitab-search-result-card__supporting-end {
  flex-shrink: 0;
  cursor: default;
}

.wikitab-search-result-card__supporting--loading {
  align-items: center;
  min-height: var(--line-height-small);
}

.wikitab-search-result-card__supporting-skeleton-start {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-100);
}

.wikitab-search-result-card__supporting-skeleton-signal {
  width: 52px;
  height: var(--line-height-small);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-result-card__supporting-skeleton-end {
  flex-shrink: 0;
  width: 56px;
  height: var(--line-height-small);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
}
</style>
