<script setup lang="ts">
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

defineProps<{
  tokens: TokenEntry[]
}>()
</script>

<template>
  <ul class="position-token-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="position-token-list__item"
      :class="{ 'position-token-list__item--deprecated': token.deprecated }"
    >
      <div class="position-token-list__preview" aria-hidden="true">
        <span class="position-token-list__component">Component</span>
        <span
          class="position-token-list__overlay"
          :style="{ inset: `var(${token.name})` }"
        />
      </div>

      <div class="position-token-list__meta">
        <code class="position-token-list__name">{{ token.name }}</code>
        <span class="position-token-list__value">{{ token.value }}</span>
        <p class="position-token-list__hint">
          Negative inset pulls the overlay outward by one border width so it aligns with the
          component edge.
        </p>
        <TokenDeprecatedLabel v-if="token.deprecated" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.position-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.position-token-list__item {
  display: grid;
  grid-template-columns: 6rem 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.position-token-list__preview {
  position: relative;
  width: 6rem;
  height: 4rem;
  border: var(--border-width-base) solid var(--border-color-progressive);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
}

.position-token-list__component {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.position-token-list__overlay {
  position: absolute;
  border: 1px solid var(--color-progressive);
  border-radius: calc(var(--border-radius-base) - 1px);
  background: var(--background-color-progressive-subtle);
  pointer-events: none;
}

.position-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.position-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.position-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.position-token-list__hint {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.position-token-list__item--deprecated .position-token-list__preview {
  opacity: 0.75;
}
</style>
