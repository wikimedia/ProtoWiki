<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'article' | 'activity' | 'image'
    compact?: boolean
    aspectRatio?: string
  }>(),
  {
    variant: 'article',
    compact: false,
    aspectRatio: '4 / 3',
  },
)
</script>

<template>
  <div
    class="wikitab-search-loading-card"
    :class="{
      'wikitab-search-loading-card--compact': compact,
      'wikitab-search-loading-card--activity': variant === 'activity',
      'wikitab-search-loading-card--image': variant === 'image',
    }"
    :style="variant === 'image' ? { aspectRatio } : undefined"
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

/* Matches WikitabSearchActivityCard body row — no thumbnail column. */
.wikitab-search-loading-card--activity {
  box-sizing: border-box;
  min-height: calc(96px + 2 * var(--spacing-75));
  padding-block: var(--spacing-75);
  padding-inline: var(--spacing-75);
}

.wikitab-search-loading-card--image {
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
}
</style>
