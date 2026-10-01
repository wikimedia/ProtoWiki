<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()
</script>

<template>
  <ul class="font-family-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="font-family-list__item"
      :class="{ 'font-family-list__item--deprecated': token.deprecated }"
      :style="{ fontFamily: `var(${token.name})` }"
    >
      <span>{{ token.name }}</span>
      <TokenDeprecatedLabel v-if="token.deprecated" />
    </li>
  </ul>
</template>

<style scoped>
.font-family-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin: 0;
  padding: 0;
  list-style: none;
}

.font-family-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.font-family-list__item--deprecated {
  color: var(--color-subtle);
}
</style>
