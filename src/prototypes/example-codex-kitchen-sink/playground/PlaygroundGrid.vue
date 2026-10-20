<script setup lang="ts">
interface Props {
  min?: string
  dense?: boolean
}

withDefaults(defineProps<Props>(), {
  min: '160px',
  dense: false,
})
</script>

<template>
  <div
    class="playground-grid"
    :class="{ 'playground-grid--dense': dense }"
    :style="{ '--playground-grid-min': min }"
  >
    <slot />
  </div>
</template>

<style scoped>
.playground-grid {
  display: grid;
  gap: var(--spacing-100);
  grid-template-columns: repeat(auto-fill, minmax(var(--playground-grid-min, 160px), 1fr));
  align-items: start;
}

.playground-grid--dense {
  gap: var(--spacing-50);
  grid-template-columns: repeat(auto-fill, minmax(var(--playground-grid-min, 120px), 1fr));
}
</style>
