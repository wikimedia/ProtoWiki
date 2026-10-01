<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import PlaygroundGrid from './PlaygroundGrid.vue'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()
</script>

<template>
  <PlaygroundGrid min="220px">
    <div
      v-for="token in tokens"
      :key="token.name"
      class="line-height-item"
      :class="{ 'line-height-item--deprecated': token.deprecated }"
    >
      <div
        class="line-height-item__preview"
        :style="{ lineHeight: `var(${token.name})` }"
      >
        Line one<br />
        Line two<br />
        Line three
      </div>
      <code class="line-height-item__name">
        {{ token.name }}
        <TokenDeprecatedLabel v-if="token.deprecated" />
      </code>
    </div>
  </PlaygroundGrid>
</template>

<style scoped>
.line-height-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-35);
  min-width: 0;
}

.line-height-item__preview {
  padding: var(--spacing-75);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  color: var(--color-base);
}

.line-height-item__name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  word-break: break-all;
}

.line-height-item--deprecated .line-height-item__preview {
  opacity: 0.75;
}
</style>
