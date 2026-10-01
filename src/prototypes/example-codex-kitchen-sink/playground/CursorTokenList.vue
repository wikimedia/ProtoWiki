<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()
</script>

<template>
  <ul class="cursor-token-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="cursor-token-list__item"
      :class="{ 'cursor-token-list__item--deprecated': token.deprecated }"
    >
      <span
        class="cursor-token-list__preview"
        :style="{ '--cursor-value': `var(${token.name})` }"
      >
        {{ token.name }}
        <span class="cursor-token-list__value">{{ token.value }}</span>
      </span>
      <TokenDeprecatedLabel v-if="token.deprecated" />
    </li>
  </ul>
</template>

<style scoped>
.cursor-token-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cursor-token-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
}

.cursor-token-list__preview {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  padding: var(--spacing-35) var(--spacing-50);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
  background: var(--background-color-neutral-subtle);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  cursor: default;
}

.cursor-token-list__item:hover .cursor-token-list__preview {
  cursor: var(--cursor-value);
  background: var(--background-color-base);
}

.cursor-token-list__value {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.cursor-token-list__item--deprecated .cursor-token-list__preview {
  opacity: 0.75;
}
</style>
