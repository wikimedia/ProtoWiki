<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()
</script>

<template>
  <ul class="text-decoration-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="text-decoration-list__item"
      :class="{ 'text-decoration-list__item--deprecated': token.deprecated }"
      :style="{ textDecoration: `var(${token.name})` }"
    >
      <span>{{ token.name }}</span>
      <TokenDeprecatedLabel v-if="token.deprecated" />
    </li>
  </ul>
</template>

<style scoped>
.text-decoration-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin: 0;
  padding: 0;
  list-style: none;
}

.text-decoration-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.text-decoration-list__item--deprecated {
  color: var(--color-subtle);
}
</style>
