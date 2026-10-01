<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'
import type { TokenEntry } from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'
import TokenListGroupHeading from './TokenListGroupHeading.vue'

const props = defineProps<{
  tokens: TokenEntry[]
}>()

type ListEntry =
  | { type: 'group'; label: string }
  | { type: 'token'; token: TokenEntry }

function isIconOpacityToken(name: string): boolean {
  return name.startsWith('--opacity-icon-')
}

const entries = computed(() => {
  const items: ListEntry[] = []
  let currentGroup: string | null = null
  let skipNextGroupHeading = true

  for (const token of props.tokens) {
    const group = isIconOpacityToken(token.name) ? 'Icon' : 'General'
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
</script>

<template>
  <ul class="opacity-token-list">
    <template v-for="entry in entries" :key="entry.type === 'token' ? entry.token.name : entry.label">
      <TokenListGroupHeading v-if="entry.type === 'group'" :label="entry.label" />
      <li
        v-else
        class="opacity-token-list__item"
        :class="{ 'opacity-token-list__item--deprecated': entry.token.deprecated }"
      >
        <div
          class="opacity-token-list__host"
          :class="{
            'opacity-token-list__host--icon': isIconOpacityToken(entry.token.name),
            'opacity-token-list__host--fill': !isIconOpacityToken(entry.token.name),
          }"
        >
          <CdxIcon
            v-if="isIconOpacityToken(entry.token.name)"
            class="opacity-token-list__icon"
            :icon="cdxIconSearch"
            :style="{ opacity: `var(${entry.token.name})` }"
            aria-hidden="true"
          />
          <span
            v-else
            class="opacity-token-list__fill"
            :style="{ opacity: `var(${entry.token.name})` }"
            aria-hidden="true"
          />
        </div>
        <div class="opacity-token-list__meta">
          <code class="opacity-token-list__name">{{ entry.token.name }}</code>
          <span class="opacity-token-list__value">{{ entry.token.value }}</span>
          <TokenDeprecatedLabel v-if="entry.token.deprecated" />
        </div>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.opacity-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.opacity-token-list__item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.opacity-token-list__host {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 2.5rem;
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  overflow: hidden;
}

.opacity-token-list__host--fill {
  background:
    repeating-conic-gradient(var(--border-color-subtle) 0% 25%, transparent 0% 50%) 50% / 10px 10px,
    var(--background-color-base);
}

.opacity-token-list__host--icon {
  background: var(--background-color-base);
}

.opacity-token-list__icon {
  flex-shrink: 0;
  color: var(--color-base);
}

.opacity-token-list__fill {
  position: absolute;
  inset: 0;
  background: var(--color-progressive);
  pointer-events: none;
}

.opacity-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.opacity-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.opacity-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.opacity-token-list__item--deprecated .opacity-token-list__host {
  opacity: 0.75;
}
</style>
