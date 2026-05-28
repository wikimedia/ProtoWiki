<script setup lang="ts">
import { computed } from 'vue'

import type { PageResolutionStep } from './fixtures'
import { defaultPageModeLabel, pageModeForPage, type PageMode } from './pageMode'
import PageResolutionTimeline from './PageResolutionTimeline.vue'
import {
  suggestionTypeFilterLabel,
  type SuggestionTypeFilter,
} from './suggestionTypeFilter'
import { formatLlmStreamForDisplay } from './formatLlmStreamForDisplay'

const props = defineProps<{
  interest?: string
  initialLlmStreamText?: string
  llmStreamText?: string
  resolutionSteps?: PageResolutionStep[]
  parsedPageTitles?: string[]
  resolvedPages?: string[]
  suggestionTypeFilter?: SuggestionTypeFilter | null
  defaultPageMode?: PageMode
  pageModes?: Record<string, PageMode>
  pageSuggestionTypeFilters?: Record<string, SuggestionTypeFilter>
  resolving?: boolean
}>()

const showInitialStream = computed(
  () =>
    Boolean(props.initialLlmStreamText?.trim()) &&
    props.initialLlmStreamText !== props.llmStreamText,
)

const showLatestStream = computed(() => Boolean(props.llmStreamText?.trim()))

const displayInitialStream = computed(() =>
  formatLlmStreamForDisplay(props.initialLlmStreamText ?? ''),
)

const displayLatestStream = computed(() => formatLlmStreamForDisplay(props.llmStreamText ?? ''))

const globalFilterLabel = computed(() => suggestionTypeFilterLabel(props.suggestionTypeFilter ?? null))

const defaultModeLabel = computed(() =>
  defaultPageModeLabel(props.defaultPageMode ?? 'edit'),
)

const resolvedPageDetails = computed(() => {
  const pages = props.resolvedPages ?? []
  const defaultMode = props.defaultPageMode ?? 'edit'
  const modeOverrides = props.pageModes ?? {}
  const filterOverrides = props.pageSuggestionTypeFilters ?? {}

  return pages.map((pageTitle) => {
    const mode = pageModeForPage(pageTitle, defaultMode, modeOverrides)
    const pageFilter = filterOverrides[pageTitle]
    const hasModeOverride = pageTitle in modeOverrides
    const hasFilterOverride = pageFilter !== undefined

    return {
      pageTitle,
      mode,
      filterLabel: hasFilterOverride ? suggestionTypeFilterLabel(pageFilter) : null,
      hasModeOverride,
      hasFilterOverride,
    }
  })
})
</script>

<template>
  <div class="resolution-debug">
    <section v-if="interest?.trim()" class="resolution-debug__section">
      <h4 class="resolution-debug__heading">Query</h4>
      <p class="resolution-debug__query">{{ interest }}</p>
    </section>

    <section v-if="showInitialStream" class="resolution-debug__section">
      <h4 class="resolution-debug__heading">Initial LLM response</h4>
      <pre class="resolution-debug__stream" aria-label="Initial LLM response">{{
        displayInitialStream
      }}</pre>
    </section>

    <section v-if="showLatestStream" class="resolution-debug__section">
      <h4 class="resolution-debug__heading">
        {{ showInitialStream ? 'Latest LLM response' : 'LLM response' }}
        <span v-if="resolving" class="resolution-debug__live">Streaming…</span>
      </h4>
      <pre
        class="resolution-debug__stream"
        aria-live="polite"
        aria-label="LLM response"
        >{{ displayLatestStream }}</pre
      >
    </section>

    <section
      v-if="globalFilterLabel || defaultPageMode !== 'edit' || parsedPageTitles?.length"
      class="resolution-debug__section"
    >
      <h4 class="resolution-debug__heading">Parsed plan</h4>
      <dl class="resolution-debug__meta">
        <div class="resolution-debug__meta-row">
          <dt>Default mode</dt>
          <dd>{{ defaultModeLabel }}</dd>
        </div>
        <div v-if="globalFilterLabel" class="resolution-debug__meta-row">
          <dt>Global filters</dt>
          <dd>{{ globalFilterLabel }}</dd>
        </div>
      </dl>
      <ul v-if="parsedPageTitles?.length" class="resolution-debug__titles">
        <li v-for="title in parsedPageTitles" :key="`parsed:${title}`" class="resolution-debug__title">
          {{ title }}
        </li>
      </ul>
    </section>

    <section v-if="resolutionSteps?.length" class="resolution-debug__section">
      <h4 class="resolution-debug__heading">Resolution steps</h4>
      <PageResolutionTimeline :steps="resolutionSteps" />
    </section>

    <section v-if="resolvedPageDetails.length" class="resolution-debug__section">
      <h4 class="resolution-debug__heading">Validated pages</h4>
      <ul class="resolution-debug__pages">
        <li
          v-for="page in resolvedPageDetails"
          :key="`resolved:${page.pageTitle}`"
          class="resolution-debug__page"
        >
          <span class="resolution-debug__page-title">{{ page.pageTitle }}</span>
          <span class="resolution-debug__page-tags">
            <span
              v-if="page.hasModeOverride"
              class="resolution-debug__tag"
              :data-mode="page.mode"
            >
              {{ page.mode === 'read' ? 'Read mode' : 'Edit mode' }}
            </span>
            <span
              v-if="page.hasFilterOverride && page.filterLabel"
              class="resolution-debug__tag resolution-debug__tag--filter"
            >
              {{ page.filterLabel }}
            </span>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.resolution-debug {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.resolution-debug__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.resolution-debug__heading {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.resolution-debug__live {
  margin-left: var(--spacing-50, 8px);
  font-weight: var(--font-weight-normal, 400);
  color: var(--color-progressive, #36c);
}

.resolution-debug__query {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375);
}

.resolution-debug__stream {
  margin: 0;
  padding: var(--spacing-75);
  overflow: auto;
  max-height: 12rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-neutral-subtle, #f8f9fa);
  font-family: var(--font-family-monospace, monospace);
  font-size: var(--font-size-small, 0.875rem);
  line-height: 1.4;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}

.resolution-debug__meta {
  margin: 0;
}

.resolution-debug__meta-row {
  display: grid;
  grid-template-columns: minmax(6rem, auto) 1fr;
  gap: var(--spacing-50, 8px);
  margin: 0 0 var(--spacing-25, 4px);
  font-size: var(--font-size-small, 0.875rem);
}

.resolution-debug__meta-row dt {
  margin: 0;
  color: var(--color-subtle, #54595d);
}

.resolution-debug__meta-row dd {
  margin: 0;
}

.resolution-debug__titles {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: var(--spacing-50, 8px);
}

.resolution-debug__title {
  margin: 0;
  padding: var(--spacing-25, 4px) var(--spacing-75);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-base, #fff);
  font-size: var(--font-size-small, 0.875rem);
}

.resolution-debug__pages {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.resolution-debug__page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  padding: var(--spacing-50, 8px) var(--spacing-75);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-base, #fff);
}

.resolution-debug__page-title {
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

.resolution-debug__page-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-25, 4px);
}

.resolution-debug__tag {
  padding: var(--spacing-25, 4px) var(--spacing-50, 8px);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-neutral-subtle, #f8f9fa);
  font-size: var(--font-size-x-small, 0.75rem);
  color: var(--color-base, #202122);
}

.resolution-debug__tag[data-mode='read'] {
  background: var(--background-color-progressive-subtle, #eaf3ff);
}

.resolution-debug__tag--filter {
  background: var(--background-color-warning-subtle, #fdf2d5);
}
</style>
