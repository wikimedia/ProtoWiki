<script setup lang="ts">
import { CdxButton } from '@wikimedia/codex'

import { useLlmQuickSuggestions } from './useLlmQuickSuggestions'
import { useLlmTopicSuggestedEdits } from './useLlmTopicSuggestedEdits'

const { resetInterest } = useLlmTopicSuggestedEdits()
const { loading: quickSuggestionsLoading, refreshQuickSuggestions } = useLlmQuickSuggestions()
</script>

<template>
  <div class="topic-suggested-edits-menu">
    <CdxButton
      weight="quiet"
      :disabled="quickSuggestionsLoading"
      @click="refreshQuickSuggestions"
    >
      Refresh suggestions
    </CdxButton>
    <CdxButton weight="quiet" @click="resetInterest">Reset interest</CdxButton>
  </div>
</template>

<style scoped>
.topic-suggested-edits-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  min-width: 12rem;
  padding: var(--spacing-50, 8px);
}
</style>
