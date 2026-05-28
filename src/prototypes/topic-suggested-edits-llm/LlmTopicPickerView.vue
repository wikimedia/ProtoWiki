<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CdxAccordion,
  CdxButton,
  CdxIcon,
  CdxMessage,
  CdxProgressIndicator,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconArrowNext, cdxIconClose } from '@wikimedia/codex-icons'

import ResolutionDebugPanel from './ResolutionDebugPanel.vue'
import { useLlmQuickSuggestions } from './useLlmQuickSuggestions'
import { useLlmTopicSuggestedEdits } from './useLlmTopicSuggestedEdits'

const {
  interest,
  resolving,
  error,
  hasResolutionDebug,
  llmStreamText,
  initialLlmStreamText,
  parsedPageTitles,
  resolutionSteps,
  resolvedPages,
  suggestionTypeFilter,
  defaultPageMode,
  pageModes,
  pageSuggestionTypeFilters,
  pickerInputVersion,
  continueToFeed,
  returnToFeed,
} = useLlmTopicSuggestedEdits()

const {
  queries: quickQueries,
  loading: quickSuggestionsLoading,
} = useLlmQuickSuggestions()

const interestInput = ref('')
const debugAccordionOpen = ref(false)

watch(pickerInputVersion, () => {
  interestInput.value = ''
})

watch(resolving, (active) => {
  if (active) debugAccordionOpen.value = true
})

const showQuickSuggestions = computed(
  () => quickSuggestionsLoading.value || quickQueries.value.length > 0,
)

async function onQuickSuggestion(suggestion: string): Promise<void> {
  if (resolving.value || quickSuggestionsLoading.value) return
  interestInput.value = suggestion.trim()
  await onContinue()
}

async function onContinue(): Promise<void> {
  const query = interestInput.value.trim()
  if (!query || resolving.value) return
  await continueToFeed(query)
}

function onContinueKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    void onContinue()
  }
}
</script>

<template>
  <div class="topic-picker">
    <CdxButton
      class="topic-picker__close"
      weight="quiet"
      :icon-only="true"
      aria-label="Back to suggestions"
      @click="returnToFeed"
    >
      <CdxIcon :icon="cdxIconClose" />
    </CdxButton>

    <div class="topic-picker__content">
      <div class="topic-picker__welcome" role="heading" aria-level="1">Hello again</div>
      <p class="topic-picker__subtitle">What do you want to do today?</p>

      <CdxTextInput
        v-model="interestInput"
        class="topic-picker__input"
        :disabled="resolving"
        @keydown="onContinueKeydown"
      />

      <div v-if="showQuickSuggestions" class="topic-picker__quick">
        <div class="topic-picker__quick-list">
          <button
            v-for="(query, index) in quickQueries"
            :key="`${index}:${query}`"
            type="button"
            class="topic-picker__quick-button"
            :disabled="resolving || quickSuggestionsLoading"
            @click="onQuickSuggestion(query)"
          >
            {{ query }}
          </button>
          <div
            v-if="quickSuggestionsLoading && !quickQueries.length"
            class="topic-picker__quick-loading"
          >
            <CdxProgressIndicator />
          </div>
        </div>
      </div>

      <div v-if="resolving" class="topic-picker__resolving">
        <CdxProgressIndicator />
        <span class="topic-picker__resolving-label">Finding pages…</span>
      </div>

      <CdxAccordion
        v-if="hasResolutionDebug"
        v-model:open="debugAccordionOpen"
        class="topic-picker__debug"
        separation="minimal"
        heading-level="h3"
      >
        <template #title>Debug info</template>
        <ResolutionDebugPanel
          :interest="interest"
          :initial-llm-stream-text="initialLlmStreamText"
          :llm-stream-text="llmStreamText"
          :resolution-steps="resolutionSteps"
          :parsed-page-titles="parsedPageTitles"
          :resolved-pages="resolvedPages"
          :suggestion-type-filter="suggestionTypeFilter"
          :default-page-mode="defaultPageMode"
          :page-modes="pageModes"
          :page-suggestion-type-filters="pageSuggestionTypeFilters"
          :resolving="resolving"
        />
      </CdxAccordion>

      <CdxMessage v-if="error" type="error">
        {{ error }}
      </CdxMessage>
    </div>

    <div class="topic-picker__footer">
      <CdxButton
        class="topic-picker__continue"
        weight="primary"
        action="progressive"
        size="large"
        :icon-only="true"
        aria-label="Continue to suggestions"
        :disabled="!interestInput.trim() || resolving"
        @click="onContinue"
      >
        <CdxIcon :icon="cdxIconArrowNext" size="large" />
      </CdxButton>
    </div>
  </div>
</template>

<style scoped>
.topic-picker {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
  padding: var(--spacing-100, 16px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.topic-picker__close {
  position: absolute;
  top: var(--spacing-100, 16px);
  right: var(--spacing-100, 16px);
  z-index: 1;
}

.topic-picker__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.topic-picker__welcome {
  margin: 0;
  padding: var(--spacing-100, 16px) 0 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
  border: none;
}

.topic-picker__subtitle {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
}

.topic-picker__input {
  width: 100%;
}

.topic-picker__quick {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.topic-picker__quick-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}

.topic-picker__quick-button {
  appearance: none;
  box-sizing: border-box;
  width: auto;
  max-width: 100%;
  margin: 0;
  padding: var(--spacing-25, 4px) var(--spacing-75, 12px);
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-small, 1.375);
  text-align: start;
  white-space: normal;
  color: var(--color-base, #202122);
  cursor: pointer;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-pill, 999px);
  background-color: var(--background-color-base, #fff);
}

.topic-picker__quick-button:not(:disabled):hover {
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
  border-color: var(--border-color-muted, #dadde3);
}

.topic-picker__quick-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.topic-picker__quick-loading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: var(--min-size-interactive-medium, 32px);
}

.topic-picker__resolving {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.topic-picker__resolving-label {
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.topic-picker__debug {
  margin-top: calc(var(--spacing-100, 16px) * 5);
}

.topic-picker__debug :deep(.cdx-accordion__content) {
  padding-top: var(--spacing-50, 8px);
}

.topic-picker__footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: var(--spacing-150, 24px);
  padding-bottom: calc(var(--spacing-100, 16px) + env(safe-area-inset-bottom, 0px));
}

.topic-picker__continue {
  min-width: 3.5rem;
  min-height: 3.5rem;
}
</style>
