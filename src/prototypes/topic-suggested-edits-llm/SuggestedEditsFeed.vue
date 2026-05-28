<script setup lang="ts">
import { CdxButton, CdxIcon, CdxProgressIndicator } from '@wikimedia/codex'
import { cdxIconReload, cdxIconSettings } from '@wikimedia/codex-icons'

import SuggestionFeedView from '@/prototypes/template-homepage/SuggestionFeedView.vue'
import { useLlmTopicSuggestedEdits } from './useLlmTopicSuggestedEdits'

import '@/prototypes/template-homepage/recent-changes-feed.css'
import '@/prototypes/template-homepage/suggestion-feed.css'

const { feedProps, openSettings, refreshFeed } = useLlmTopicSuggestedEdits()
</script>

<template>
  <div class="suggested-edits-feed">
    <header class="suggested-edits-feed__header">
      <div class="suggested-edits-feed__title" role="heading" aria-level="1">Suggestions</div>
      <div class="suggested-edits-feed__actions">
        <div
          v-if="feedProps.refreshing"
          class="suggested-edits-feed__refresh-status"
          role="status"
          aria-live="polite"
          aria-label="Loading suggestions"
        >
          <CdxProgressIndicator />
        </div>
        <CdxButton
          v-else
          weight="quiet"
          :icon-only="true"
          aria-label="Load suggestions"
          @click="refreshFeed"
        >
          <CdxIcon :icon="cdxIconReload" />
        </CdxButton>
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Change interest"
          @click="openSettings"
        >
          <CdxIcon :icon="cdxIconSettings" />
        </CdxButton>
      </div>
    </header>

    <div
      class="suggested-edits-feed__body"
      :class="{ 'suggested-edits-feed__body--scrollable': (feedProps.items?.length ?? 0) > 0 }"
    >
      <SuggestionFeedView v-bind="feedProps" />
    </div>
  </div>
</template>

<style scoped>
.suggested-edits-feed {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background-color: var(--background-color-neutral, #eaecf0);
}

.suggested-edits-feed__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.suggested-edits-feed__body :deep(.review-changes-view) {
  overflow: hidden;
}

.suggested-edits-feed__body--scrollable :deep(.review-changes-view) {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.suggested-edits-feed__body :deep(.review-changes-view .review-changes__feed) {
  flex: 0 0 auto;
  margin-top: 0;
  justify-content: flex-start;
}

.suggested-edits-feed__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-100, 16px);
  background-color: var(--background-color-base, #fff);
  border-bottom: 1px solid var(--border-color-muted, #dadde3);
}

.suggested-edits-feed__title {
  flex: 1;
  margin: 0;
  padding: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
  border: none;
}

.suggested-edits-feed__actions {
  display: flex;
  gap: var(--spacing-25, 4px);
}

.suggested-edits-feed__refresh-status {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--min-size-interactive-medium, 32px);
  height: var(--min-size-interactive-medium, 32px);
}
</style>
