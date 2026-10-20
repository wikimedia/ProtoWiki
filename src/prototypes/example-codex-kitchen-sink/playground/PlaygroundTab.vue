<script setup lang="ts">
defineProps<{}>()
</script>

<template>
  <div>
    <slot />
  </div>
</template>

<style scoped>
div {
  padding: 0px var(--spacing-100);
}
</style>
