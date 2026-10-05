<script setup lang="ts">
import { computed } from 'vue'

/** Minimal SVG line chart — no external chart library. */
interface Props {
  values: number[]
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 80,
  height: 24,
})

const points = computed(() => {
  const max = Math.max(...props.values, 1)
  const min = Math.min(...props.values, 0)
  const range = max - min || 1
  const step = props.values.length > 1 ? props.width / (props.values.length - 1) : 0

  return props.values
    .map((value, index) => {
      const x = index * step
      const y = props.height - ((value - min) / range) * props.height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <svg
    class="sparkline"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    aria-hidden="true"
  >
    <polyline :points="points" fill="none" stroke="currentColor" stroke-width="1.5" />
  </svg>
</template>

<style scoped>
.sparkline {
  display: block;
  color: var(--color-progressive, #36c);
  overflow: visible;
}
</style>
