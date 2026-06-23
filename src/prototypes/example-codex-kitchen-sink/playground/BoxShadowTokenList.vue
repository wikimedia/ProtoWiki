<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TokenEntry } from '../lib/parse-tokens'
import { getBoxShadowTokenGroup } from '../lib/parse-tokens'
import { getSwatchTextToneForBackground } from '../lib/color-contrast'
import type { SwatchTextTone } from '../lib/color-contrast'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

const props = defineProps<{
  tokens: TokenEntry[]
}>()

type ListEntry =
  | { type: 'group'; label: string }
  | { type: 'token'; token: TokenEntry }

const shadowColorTokensWithDarkWrap = new Set(['--box-shadow-color-inverted'])

const textToneByToken = ref<Record<string, SwatchTextTone>>({})
const sampleRefs = new Map<string, HTMLElement>()

const entries = computed(() => {
  const items: ListEntry[] = []
  let currentGroup: string | null = null

  for (const token of props.tokens) {
    const group = getBoxShadowTokenGroup(token.name)
    if (group !== currentGroup) {
      items.push({ type: 'group', label: group })
      currentGroup = group
    }
    items.push({ type: 'token', token })
  }

  return items
})

function setSampleRef(name: string, el: unknown) {
  if (el instanceof HTMLElement) sampleRefs.set(name, el)
  else sampleRefs.delete(name)
}

function updateContrast() {
  nextTick(() => {
    const tones: Record<string, SwatchTextTone> = {}

    for (const token of props.tokens) {
      if (getBoxShadowTokenGroup(token.name) !== 'Color') continue
      const sample = sampleRefs.get(token.name)
      if (!sample) continue
      tones[token.name] = getSwatchTextToneForBackground(sample)
    }

    textToneByToken.value = tones
  })
}

function shadowColorForToken(name: string): string {
  if (name.includes('medium') || name.includes('large') || name.includes('around')) {
    return 'var(--box-shadow-color-alpha-base)'
  }
  return 'var(--box-shadow-color-base)'
}

function sampleStyle(token: TokenEntry): Record<string, string> {
  const cssVar = `var(${token.name})`
  const group = getBoxShadowTokenGroup(token.name)

  if (group === 'Color') {
    return { backgroundColor: cssVar }
  }

  if (group === 'Inset' || group === 'Outset') {
    return { boxShadow: `${cssVar} ${shadowColorForToken(token.name)}` }
  }

  return { boxShadow: cssVar }
}

function needsShadowHost(token: TokenEntry): boolean {
  return getBoxShadowTokenGroup(token.name) !== 'Color'
}

function needsInvertedWrap(name: string): boolean {
  return shadowColorTokensWithDarkWrap.has(name)
}

function isTransparentColor(name: string): boolean {
  return name === '--box-shadow-color-transparent'
}

let themeObserver: MutationObserver | null = null

onMounted(() => {
  updateContrast()
  themeObserver = new MutationObserver(updateContrast)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onBeforeUnmount(() => themeObserver?.disconnect())

watch(() => props.tokens, updateContrast, { deep: true })
</script>

<template>
  <ul class="box-shadow-token-list">
    <template v-for="(entry, index) in entries" :key="index">
      <li v-if="entry.type === 'group'" class="box-shadow-token-list__group">
        {{ entry.label }}
      </li>
      <li
        v-else
        class="box-shadow-token-list__item"
        :class="{ 'box-shadow-token-list__item--deprecated': entry.token.deprecated }"
      >
        <div
          class="box-shadow-token-list__host"
          :class="{
            'box-shadow-token-list__host--shadow': needsShadowHost(entry.token),
            'box-shadow-token-list__host--inverted': needsInvertedWrap(entry.token.name),
          }"
        >
          <span
            :ref="(el) => setSampleRef(entry.token.name, el)"
            class="box-shadow-token-list__sample"
            :class="{
              'box-shadow-token-list__sample--color': getBoxShadowTokenGroup(entry.token.name) === 'Color',
              'box-shadow-token-list__sample--transparent': isTransparentColor(entry.token.name),
              'box-shadow-token-list__sample--light-text':
                textToneByToken[entry.token.name] === 'light',
            }"
            :style="sampleStyle(entry.token)"
            aria-hidden="true"
          />
        </div>
        <div class="box-shadow-token-list__meta">
          <code class="box-shadow-token-list__name">{{ entry.token.name }}</code>
          <span class="box-shadow-token-list__value">{{ entry.token.value }}</span>
          <TokenDeprecatedLabel v-if="entry.token.deprecated" />
        </div>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.box-shadow-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.box-shadow-token-list__group {
  padding: var(--spacing-100) 0 var(--spacing-50);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.box-shadow-token-list__group:first-child {
  padding-top: 0;
}

.box-shadow-token-list__item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.box-shadow-token-list__host {
  display: inline-flex;
}

.box-shadow-token-list__host--shadow {
  padding: var(--spacing-200);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.box-shadow-token-list__host--inverted {
  padding: var(--spacing-75);
  background: var(--background-color-inverted);
}

.box-shadow-token-list__sample {
  display: block;
  width: 3.5rem;
  height: 2.5rem;
  background: var(--background-color-base);
  border-radius: var(--border-radius-base);
}

.box-shadow-token-list__sample--color {
  width: 5rem;
}

.box-shadow-token-list__sample--transparent {
  background:
    repeating-conic-gradient(var(--border-color-subtle) 0% 25%, transparent 0% 50%) 50% / 10px 10px,
    var(--background-color-base);
}

.box-shadow-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.box-shadow-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.box-shadow-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.box-shadow-token-list__item--deprecated .box-shadow-token-list__host {
  opacity: 0.75;
}
</style>
