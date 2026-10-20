<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()
</script>

<template>
  <ul class="font-size-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="font-size-list__item"
      :class="{ 'font-size-list__item--deprecated': token.deprecated }"
      :style="{ fontSize: `var(${token.name})` }"
    >
      <span>{{ token.name }}</span>
      <TokenDeprecatedLabel v-if="token.deprecated" />
    </li>
  </ul>
</template>

<style scoped>
.font-size-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin: 0;
  padding: 0;
  list-style: none;
}

.font-size-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  font-family: var(--font-family-monospace);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.font-size-list__item--deprecated {
  color: var(--color-subtle);
}
</style>
