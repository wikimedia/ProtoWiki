<script setup lang="ts">
import type { PageResolutionStep } from './fixtures'

defineProps<{
  steps: PageResolutionStep[]
}>()

const outcomeLabel: Record<PageResolutionStep['outcome'], string> = {
  miss: 'No match',
  hit: 'Matched',
  retry: 'Retry',
  pick: 'Selected',
}
</script>

<template>
  <ol v-if="steps.length" class="resolve-steps">
    <li
      v-for="(step, index) in steps"
      :key="`${step.label}-${index}`"
      class="resolve-steps__item"
      :data-outcome="step.outcome"
    >
      <div class="resolve-steps__header">
        <span class="resolve-steps__index">{{ index + 1 }}</span>
        <span class="resolve-steps__label">{{ step.label }}</span>
        <span class="resolve-steps__outcome">{{ outcomeLabel[step.outcome] }}</span>
      </div>
      <p v-if="step.query" class="resolve-steps__query">
        <code>{{ step.query }}</code>
      </p>
      <p v-if="step.detail" class="resolve-steps__detail">{{ step.detail }}</p>
    </li>
  </ol>
</template>

<style scoped>
.resolve-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.resolve-steps__item {
  padding: var(--spacing-75);
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background: var(--background-color-neutral-subtle, #f8f9fa);
}

.resolve-steps__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
}

.resolve-steps__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: var(--background-color-interactive, #eaecf0);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: 600;
}

.resolve-steps__label {
  font-weight: 600;
}

.resolve-steps__outcome {
  margin-left: auto;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.resolve-steps__item[data-outcome='hit'] .resolve-steps__outcome,
.resolve-steps__item[data-outcome='pick'] .resolve-steps__outcome {
  color: var(--color-success, #14866d);
}

.resolve-steps__item[data-outcome='retry'] .resolve-steps__outcome {
  color: var(--color-progressive, #36c);
}

.resolve-steps__query {
  margin: var(--spacing-50) 0 0;
  word-break: break-word;
}

.resolve-steps__query code {
  font-size: var(--font-size-small, 0.875rem);
}

.resolve-steps__detail {
  margin: var(--spacing-50) 0 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}
</style>
