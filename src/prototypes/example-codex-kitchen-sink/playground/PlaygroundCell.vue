<script setup lang="ts">
interface Props {
  label?: string
}

defineProps<Props>()
</script>

<template>
  <div class="playground-cell">
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
