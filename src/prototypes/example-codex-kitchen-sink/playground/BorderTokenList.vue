<script setup lang="ts">
import { computed } from 'vue'
import type { TokenEntry } from '../lib/parse-tokens'
import { getBorderTokenGroup, isPositionOffsetToken } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'
import TokenListGroupHeading from './TokenListGroupHeading.vue'

const props = defineProps<{
  tokens: TokenEntry[]
}>()

type ListEntry =
  | { type: 'group'; label: string }
  | { type: 'token'; token: TokenEntry }

const entries = computed(() => {
  const items: ListEntry[] = []
  let currentGroup: string | null = null
  let skipNextGroupHeading = true

  for (const token of props.tokens) {
    const group = getBorderTokenGroup(token.name)
    if (group !== currentGroup) {
      if (!skipNextGroupHeading) {
        items.push({ type: 'group', label: group })
      }
      currentGroup = group
      skipNextGroupHeading = false
    }
    items.push({ type: 'token', token })
  }

  return items
})

type PreviewKind = 'shorthand' | 'radius' | 'style' | 'width'

function previewKind(name: string): PreviewKind {
  if (name.startsWith('--border-radius-')) return 'radius'
  if (name.startsWith('--border-style-')) return 'style'
  if (name.startsWith('--border-width-')) return 'width'
  return 'shorthand'
}

function previewStyle(token: TokenEntry): Record<string, string> {
  const cssVar = `var(${token.name})`
  switch (previewKind(token.name)) {
    case 'radius':
      return { borderRadius: cssVar }
    case 'style':
      return { border: `var(--border-width-thick) ${cssVar} var(--border-color-progressive)` }
    case 'width':
      return { border: `${cssVar} solid var(--border-color-progressive)` }
    default:
      return { border: cssVar }
  }
}

function previewClass(name: string): Record<string, boolean> {
  return {
    'border-token-list__preview--radius': name.startsWith('--border-radius-'),
    'border-token-list__preview--pill': name === '--border-radius-pill',
    'border-token-list__preview--shorthand': previewKind(name) === 'shorthand',
  }
}
</script>

<template>
  <ul class="border-token-list">
    <template v-for="(entry, index) in entries" :key="index">
      <TokenListGroupHeading v-if="entry.type === 'group'" :label="entry.label" />
      <li
        v-else
        class="border-token-list__item"
        :class="{ 'border-token-list__item--deprecated': entry.token.deprecated }"
      >
        <div
          v-if="isPositionOffsetToken(entry.token.name)"
          class="border-token-list__offset-demo"
          aria-hidden="true"
        >
          <div class="border-token-list__offset-example">
            <span class="border-token-list__offset-caption">inset: 0</span>
            <div class="border-token-list__offset-box">
              <span class="border-token-list__overlay border-token-list__overlay--inset-zero" />
            </div>
          </div>
          <div class="border-token-list__offset-example">
            <span class="border-token-list__offset-caption">with token</span>
            <div class="border-token-list__offset-box">
              <span
                class="border-token-list__overlay border-token-list__overlay--with-offset"
              />
            </div>
          </div>
        </div>
        <div
          v-else
          class="border-token-list__preview"
          :class="previewClass(entry.token.name)"
          :style="previewStyle(entry.token)"
          aria-hidden="true"
        />
        <div class="border-token-list__meta">
          <code class="border-token-list__name">{{ entry.token.name }}</code>
          <span class="border-token-list__value">{{ entry.token.value }}</span>
          <p
            v-if="isPositionOffsetToken(entry.token.name)"
            class="border-token-list__hint"
          >
            Negative inset equal to <code>--border-width-base</code> pulls an overlay outward so
            its edges align with the component’s outer border.
          </p>
          <TokenDeprecatedLabel v-if="entry.token.deprecated" />
        </div>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.border-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.border-token-list__item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.border-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.border-token-list__preview {
  flex-shrink: 0;
  width: 3.5rem;
  height: 2.5rem;
  background: var(--background-color-base);
}

.border-token-list__preview--radius {
  background: var(--color-progressive);
}

.border-token-list__preview--pill {
  width: 5rem;
}

.border-token-list__preview--shorthand {
  box-sizing: border-box;
}

.border-token-list__offset-demo {
  display: flex;
  flex-shrink: 0;
  gap: var(--spacing-100);
}

.border-token-list__offset-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-25);
}

.border-token-list__offset-caption {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  white-space: nowrap;
}

.border-token-list__offset-box {
  position: relative;
  box-sizing: border-box;
  width: 3.5rem;
  height: 2.5rem;
  border: var(--border-width-base) solid var(--border-color-progressive);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
}

.border-token-list__overlay {
  position: absolute;
  box-sizing: border-box;
  border: var(--border-width-base) solid var(--color-progressive);
  border-radius: var(--border-radius-base);
  background: var(--background-color-progressive-subtle);
  pointer-events: none;
}

.border-token-list__overlay--inset-zero {
  inset: 0;
}

.border-token-list__overlay--with-offset {
  inset: calc(-1 * var(--border-width-base));
}

.border-token-list__hint code {
  font-family: var(--font-family-monospace);
  font-size: inherit;
}

.border-token-list__hint {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.border-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.border-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.border-token-list__item--deprecated .border-token-list__preview {
  opacity: 0.75;
}
</style>
