<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'article' | 'image'
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
      'wikitab-search-loading-card--image': variant === 'image',
    }"
    :style="variant === 'image' ? { aspectRatio } : undefined"
    aria-hidden="true"
  >
  </div>
</template>

<style scoped>
.wikitab-search-loading-card {
  min-height: 120px;
  border-radius: var(--border-radius-base);
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
}

.wikitab-search-loading-card--compact {
  min-height: 80px;
}

.wikitab-search-loading-card--image {
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
}
</style>
