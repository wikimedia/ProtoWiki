<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()

function isOutlineColorToken(name: string): boolean {
  return name.startsWith('--outline-color-')
}

function sampleStyle(token: TokenEntry): Record<string, string> {
  if (isOutlineColorToken(token.name)) {
    return {
      outline: 'var(--outline-base--focus)',
      outlineColor: `var(${token.name})`,
    }
  }

  return {
    outline: `var(${token.name})`,
    outlineColor: 'var(--outline-color-progressive--focus)',
  }
}
</script>

<template>
  <ul class="outline-token-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="outline-token-list__item"
      :class="{ 'outline-token-list__item--deprecated': token.deprecated }"
    >
      <div class="outline-token-list__host">
        <span class="outline-token-list__preview" :style="sampleStyle(token)" aria-hidden="true" />
      </div>
      <div class="outline-token-list__meta">
        <code class="outline-token-list__name">{{ token.name }}</code>
        <span class="outline-token-list__value">{{ token.value }}</span>
        <TokenDeprecatedLabel v-if="token.deprecated" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.outline-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.outline-token-list__item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.outline-token-list__host {
  display: inline-flex;
  padding: var(--spacing-50);
}

.outline-token-list__preview {
  display: block;
  width: 3.5rem;
  height: 2.5rem;
  background: var(--background-color-base);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
}

.outline-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.outline-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.outline-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.outline-token-list__item--deprecated .outline-token-list__host {
  opacity: 0.75;
}
</style>
