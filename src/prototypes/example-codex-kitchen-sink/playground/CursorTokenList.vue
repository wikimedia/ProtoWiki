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
        aria-hidden="true"
      />
      <div class="cursor-token-list__meta">
        <code class="cursor-token-list__name">{{ token.name }}</code>
        <span class="cursor-token-list__value">{{ token.value }}</span>
        <TokenDeprecatedLabel v-if="token.deprecated" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.cursor-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cursor-token-list__item {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.cursor-token-list__preview {
  display: block;
  width: 3.5rem;
  height: 2.5rem;
  background: var(--background-color-neutral-subtle);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  cursor: default;
}

.cursor-token-list__item:hover .cursor-token-list__preview {
  cursor: var(--cursor-value);
  background: var(--background-color-base);
}

.cursor-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.cursor-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.cursor-token-list__value {
  font-family: var(--font-family-monospace);
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
