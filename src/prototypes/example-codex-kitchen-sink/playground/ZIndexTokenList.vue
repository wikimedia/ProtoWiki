<script setup lang="ts">
import { computed } from 'vue'
import type { TokenEntry } from '../lib/parse-tokens'
import { getZIndexTokenGroup, parseZIndexValue } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'
import TokenListGroupHeading from './TokenListGroupHeading.vue'

const props = defineProps<{
  tokens: TokenEntry[]
}>()

type ListEntry = { type: 'group'; label: string } | { type: 'token'; token: TokenEntry }

const entries = computed(() => {
  const items: ListEntry[] = []
  let currentGroup: string | null = null

  for (const token of props.tokens) {
    const group = getZIndexTokenGroup(token.name)
    if (group !== currentGroup) {
      items.push({ type: 'group', label: group })
      currentGroup = group
    }
    items.push({ type: 'token', token })
  }

  return items
})

function tokenLayerStyle(token: TokenEntry): Record<string, string> {
  return { zIndex: `var(${token.name})` }
}
</script>

<template>
  <ul class="z-index-token-list">
    <template v-for="(entry, index) in entries" :key="index">
      <TokenListGroupHeading v-if="entry.type === 'group'" :label="entry.label" />
      <li
        v-else
        class="z-index-token-list__item"
        :class="{ 'z-index-token-list__item--deprecated': entry.token.deprecated }"
      >
        <div class="z-index-token-list__preview" aria-hidden="true">
          <span class="z-index-token-list__layer z-index-token-list__layer--back">0</span>
          <span class="z-index-token-list__layer z-index-token-list__layer--mid">1</span>
          <span
            class="z-index-token-list__layer z-index-token-list__layer--token"
            :style="tokenLayerStyle(entry.token)"
          >
            {{ parseZIndexValue(entry.token.value) }}
          </span>
        </div>

        <div class="z-index-token-list__meta">
          <code class="z-index-token-list__name">{{ entry.token.name }}</code>
          <span class="z-index-token-list__value">{{ entry.token.value }}</span>
          <TokenDeprecatedLabel v-if="entry.token.deprecated" />
        </div>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.z-index-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.z-index-token-list__item {
  display: grid;
  grid-template-columns: 6rem 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.z-index-token-list__preview {
  position: relative;
  isolation: isolate;
  width: 6rem;
  height: 4rem;
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.z-index-token-list__layer {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 1.75rem;
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  border-radius: var(--border-radius-base);
}

.z-index-token-list__layer--back {
  inset-block-start: var(--spacing-25);
  inset-inline-start: var(--spacing-25);
  z-index: 0;
  color: var(--color-subtle);
  background: var(--background-color-base);
  border: var(--border-subtle);
}

.z-index-token-list__layer--mid {
  inset-block-start: var(--spacing-75);
  inset-inline-start: var(--spacing-75);
  z-index: 1;
  color: var(--color-subtle);
  background: var(--background-color-neutral);
  border: var(--border-subtle);
}

.z-index-token-list__layer--token {
  inset-block-start: var(--spacing-125);
  inset-inline-start: var(--spacing-125);
  color: var(--color-inverted);
  background: var(--color-progressive);
  border: 1px solid var(--color-progressive--hover);
  box-shadow: var(--box-shadow-small);
}

.z-index-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.z-index-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.z-index-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.z-index-token-list__item--deprecated .z-index-token-list__preview {
  opacity: 0.75;
}
</style>
