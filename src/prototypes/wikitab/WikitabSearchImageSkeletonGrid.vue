<script setup lang="ts">
import { computed } from 'vue'

import WikitabSearchLoadingCard from './WikitabSearchLoadingCard.vue'
import { WIKITAB_IMAGE_GRID_GAP_PX } from './useWikitabSearchImageColumns'
import {
  parseSkeletonAspectRatio,
  skeletonAspectRatioForIndex,
} from './wikitabSearchImageSkeletons'

const props = defineProps<{
  columnCount: number
  count: number
}>()

function distributeSkeletonsToColumns(count: number, columnCount: number): string[][] {
  const columns = Array.from({ length: columnCount }, () => [] as string[])
  const heights = new Array<number>(columnCount).fill(0)

  for (let index = 0; index < count; index++) {
    const aspectRatio = skeletonAspectRatioForIndex(index)
    const itemHeight = parseSkeletonAspectRatio(aspectRatio)

    let shortestIndex = 0
    for (let columnIndex = 1; columnIndex < columnCount; columnIndex++) {
      if (heights[columnIndex] < heights[shortestIndex]) shortestIndex = columnIndex
    }

    columns[shortestIndex].push(aspectRatio)
    heights[shortestIndex] += itemHeight + WIKITAB_IMAGE_GRID_GAP_PX
  }

  return columns
}

const columns = computed(() =>
  distributeSkeletonsToColumns(props.count, Math.max(1, props.columnCount)),
)
</script>

<template>
  <div
    class="wikitab-search-image-skeleton-grid"
    :style="{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }"
  >
    <div
      v-for="(column, columnIndex) in columns"
      :key="columnIndex"
      class="wikitab-search-image-skeleton-grid__column"
    >
      <WikitabSearchLoadingCard
        v-for="(aspectRatio, index) in column"
        :key="`${columnIndex}-${index}`"
        variant="image"
        :aspect-ratio="aspectRatio"
      />
    </div>
  </div>
</template>

<style scoped>
.wikitab-search-image-skeleton-grid {
  display: grid;
  gap: 2px;
  width: 100%;
}

.wikitab-search-image-skeleton-grid__column {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
</style>
