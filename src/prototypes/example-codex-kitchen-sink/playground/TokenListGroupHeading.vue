<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <li class="token-list-group">
    <h4 class="token-list-group__heading">{{ label }}</h4>
  </li>
</template>

<style scoped>
.token-list-group {
  padding: var(--spacing-100) 0 var(--spacing-50);
  list-style: none;
}

.token-list-group:first-child {
  padding-top: 0;
}

.token-list-group__heading {
  margin: 0;
}
</style>
