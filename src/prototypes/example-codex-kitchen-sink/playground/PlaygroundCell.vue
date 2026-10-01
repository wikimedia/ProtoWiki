<script setup lang="ts">
interface Props {
  label?: string
  row?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="playground-cell" :class="{ 'playground-cell--row': row }">
    <div class="playground-cell__content">
      <slot />
    </div>
    <code v-if="label" class="playground-cell__label">{{ label }}</code>
  </div>
</template>

<style scoped>
.playground-cell {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-35);
  min-width: 0;
}

.playground-cell--row {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--spacing-100);
  padding-block: var(--spacing-35);
  border-bottom: var(--border-subtle);
}

.playground-cell--row:last-child {
  border-bottom: none;
}

.playground-cell--row .playground-cell__label {
  flex-shrink: 0;
  min-width: 5rem;
  padding-top: var(--spacing-35);
}

.playground-cell--row .playground-cell__content {
  flex: 1;
  max-width: 20rem;
}

.playground-cell__content {
  min-width: 0;
}

/* Codex form controls default to min-width: 256px; shrink to fit grid cells. */
.playground-cell__content :deep(.cdx-text-input),
.playground-cell__content :deep(.cdx-search-input),
.playground-cell__content :deep(.cdx-text-area),
.playground-cell__content :deep(.cdx-select),
.playground-cell__content :deep(.cdx-combobox),
.playground-cell__content :deep(.cdx-lookup),
.playground-cell__content :deep(.cdx-multiselect-lookup),
.playground-cell__content :deep(.cdx-chip-input) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.playground-cell__label {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  word-break: break-all;
}
</style>
