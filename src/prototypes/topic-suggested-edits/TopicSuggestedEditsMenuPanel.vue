<script setup lang="ts">
import { CdxButton } from '@wikimedia/codex'

import { useTopicSuggestedEdits } from './useTopicSuggestedEdits'

const { resetTopics } = useTopicSuggestedEdits()
</script>

<template>
  <div class="topic-suggested-edits-menu">
    <CdxButton weight="quiet" @click="resetTopics">Reset topics</CdxButton>
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
