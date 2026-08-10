<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import PlaygroundGrid from './PlaygroundGrid.vue'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()

const sampleText = 'Long text that overflows the container'
</script>

<template>
  <PlaygroundGrid min="220px">
    <div
      v-for="token in tokens"
      :key="token.name"
      class="text-overflow-item"
      :class="{ 'text-overflow-item--deprecated': token.deprecated }"
    >
      <div class="text-overflow-item__preview">
        <span
          class="text-overflow-item__sample"
          :style="{ textOverflow: `var(${token.name})` }"
        >
          {{ sampleText }}
        </span>
      </div>
      <code class="text-overflow-item__name">
        {{ token.name }}
        <TokenDeprecatedLabel v-if="token.deprecated" />
      </code>
    </div>
  </PlaygroundGrid>
</template>

<style scoped>
.text-overflow-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-35);
  min-width: 0;
}

.text-overflow-item__preview {
  padding: var(--spacing-75);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.text-overflow-item__sample {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.text-overflow-item__name {
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

.text-overflow-item--deprecated .text-overflow-item__preview {
  opacity: 0.75;
}
</style>
