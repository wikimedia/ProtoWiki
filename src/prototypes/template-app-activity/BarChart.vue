<script setup lang="ts">
/** Flat bar-chart strip — one bar per value, height normalized to the tallest. */
interface Props {
  values: number[]
}

const props = defineProps<Props>()

function heightPercent(value: number): number {
  const max = Math.max(...props.values, 1)
  const MIN_VISIBLE_PERCENT = 8
  return Math.max((value / max) * 100, MIN_VISIBLE_PERCENT)
}
</script>

<template>
  <div class="bar-chart" role="img" aria-label="Activity chart">
    <span
      v-for="(value, index) in values"
      :key="index"
      class="bar-chart__bar"
      :style="{ height: `${heightPercent(value)}%` }"
    />
  </div>
</template>

<style scoped>
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 3rem;
}

.bar-chart__bar {
  flex: 1 1 0;
  min-width: 2px;
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral, #eaecf0);
}
</style>
