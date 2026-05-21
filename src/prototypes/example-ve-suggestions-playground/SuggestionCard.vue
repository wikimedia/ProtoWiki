<script setup lang="ts">
import { computed } from 'vue'

import { CdxAccordion } from '@wikimedia/codex'

import { shouldShowSnippet, type SuggestionCardData } from '@/lib/ve-suggestions'

const props = defineProps<{
  card: SuggestionCardData
}>()

const showSnippet = computed(() => shouldShowSnippet(props.card))

const debugPayload = computed(() => {
  if (props.card.groupedSuggestions?.length) {
    return {
      methodName: props.card.methodName,
      suggestionType: props.card.suggestionType,
      suggestions: props.card.groupedSuggestions,
      diagnostics: props.card.diagnostics,
      responseMeta: props.card.responseMeta,
    }
  }

  return {
    methodName: props.card.methodName,
    suggestionType: props.card.suggestionType,
    rawSnippetWikitext: props.card.rawSnippetWikitext,
    suggestion: props.card.raw,
    diagnostics: props.card.diagnostics,
    responseMeta: props.card.responseMeta,
  }
})

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <article class="suggestion-card">
    <div class="suggestion-card__header">
      <p class="suggestion-card__title">{{ card.heading }}</p>
      <p class="suggestion-card__description" v-html="card.descriptionHtml" />
    </div>
    <div
      v-if="showSnippet"
      class="suggestion-card__snippet mw-parser-output"
      v-html="card.renderedSnippetHtml"
    />
    <CdxAccordion
      class="suggestion-card__debug"
      separation="minimal"
      heading-level="h6"
    >
      <template #title>Debug data</template>
      <pre>{{ formatJson(debugPayload) }}</pre>
    </CdxAccordion>
  </article>
</template>

<style scoped>
.suggestion-card {
  background-color: var(--background-color-base, #fff);
  padding: var(--spacing-75, 12px) 0 var(--spacing-100, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}

.suggestion-card__title {
  margin: 0;
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-content, 1.57);
}

.suggestion-card__description {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-base, 1.6);
  color: var(--color-base, #202122);
}

.suggestion-card__description :deep(.suggestion-card__more-links) {
  color: var(--color-subtle, #54595d);
}

.suggestion-card__header {
  width: 100%;
}

.suggestion-card__snippet {
  width: 100%;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-content, 1.57);
  color: var(--color-subtle, #54595d);
  padding: var(--spacing-50, 8px);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
}

.suggestion-card__snippet :deep(> *:first-child) {
  margin-top: 0;
}

.suggestion-card__snippet :deep(> *:last-child) {
  margin-bottom: 0;
}

.suggestion-card__snippet :deep(p),
.suggestion-card__snippet :deep(ul),
.suggestion-card__snippet :deep(ol) {
  margin: 0;
}

.suggestion-card__snippet :deep(ul),
.suggestion-card__snippet :deep(ol) {
  padding-inline-start: 1.25em;
}

.suggestion-card__snippet :deep(p + p),
.suggestion-card__snippet :deep(p + ul),
.suggestion-card__snippet :deep(p + ol),
.suggestion-card__snippet :deep(ul + p),
.suggestion-card__snippet :deep(ol + p),
.suggestion-card__snippet :deep(ul + ul),
.suggestion-card__snippet :deep(ol + ol) {
  margin-top: var(--spacing-50, 8px);
}

.suggestion-card__debug {
  width: 100%;
  margin-top: var(--spacing-25, 4px);
}

.suggestion-card__debug :deep(.cdx-accordion__header) {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  color: var(--color-subtle);
}

.suggestion-card__debug :deep(summary:before) {
  background-color: var(--color-subtle);
}

.suggestion-card__debug :deep(summary:hover),
.suggestion-card__debug :deep(summary:active) {
  background-color: transparent;
  color: var(--color-subtle);
}

.suggestion-card__debug :deep(summary:hover:before),
.suggestion-card__debug :deep(summary:active:before) {
  background-color: var(--color-subtle);
}

.suggestion-card__debug pre {
  margin: var(--spacing-50, 8px) 0 0;
  padding: var(--spacing-75, 12px);
  overflow: auto;
  font-size: var(--font-size-small);
  background: var(--background-color-neutral-subtle, #f8f9fa);
  border-radius: var(--border-radius-base, 2px);
}
</style>
