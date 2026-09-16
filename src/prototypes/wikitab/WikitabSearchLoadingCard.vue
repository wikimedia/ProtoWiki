<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'article' | 'activity'
    compact?: boolean
  }>(),
  {
    variant: 'article',
    compact: false,
  },
)
</script>

<template>
  <div
    class="wikitab-search-loading-card"
    :class="{
      'wikitab-search-loading-card--compact': compact,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.wikitab-search-loading-card {
  min-height: 120px;
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-search-loading-card--compact {
  min-height: 80px;
}
</style>
