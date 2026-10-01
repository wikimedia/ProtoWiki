<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ColorSubTab, TokenEntry } from '../lib/parse-tokens'
import { getSwatchTextToneForBackground, needsInvertedTextBackground } from '../lib/color-contrast'
import type { SwatchTextTone } from '../lib/color-contrast'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

const props = defineProps<{
  mode: ColorSubTab
  tokens: TokenEntry[]
}>()

const borderTokensWithDarkWrap = new Set([
  '--border-color-inverted',
  '--border-color-inverted-fixed',
])

const backgroundTokensWithDarkText = new Set([
  '--background-color-button-quiet--hover',
  '--background-color-button-quiet--active',
  '--background-color-transparent',
])

const textToneByToken = ref<Record<string, SwatchTextTone>>({})
const needsInvertedBgByToken = ref<Record<string, boolean>>({})
const sampleRefs = new Map<string, HTMLElement>()

const isFilledMode = computed(() => props.mode === 'background' || props.mode === 'accent')

function needsBorderDarkWrap(tokenName: string): boolean {
  return props.mode === 'border' && borderTokensWithDarkWrap.has(tokenName)
}

function setSampleRef(name: string, el: unknown) {
  if (el instanceof HTMLElement) sampleRefs.set(name, el)
  else sampleRefs.delete(name)
}

function updateContrast() {
  nextTick(() => {
    const tones: Record<string, SwatchTextTone> = {}
    const invertedBgs: Record<string, boolean> = {}

    for (const token of props.tokens) {
      const sample = sampleRefs.get(token.name)
      if (!sample) continue

      if (isFilledMode.value) {
        tones[token.name] = backgroundTokensWithDarkText.has(token.name)
          ? 'dark'
          : getSwatchTextToneForBackground(sample)
      } else if (props.mode === 'text') {
        invertedBgs[token.name] = needsInvertedTextBackground(sample)
      }
    }

    textToneByToken.value = tones
    needsInvertedBgByToken.value = invertedBgs
  })
}

function sampleStyle(token: TokenEntry) {
  if (props.mode === 'text') {
    return { color: `var(${token.name})` }
  }

  if (isFilledMode.value) {
    return { backgroundColor: `var(${token.name})` }
  }

  return { borderColor: `var(${token.name})` }
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

watch(() => [props.tokens, props.mode], updateContrast, { deep: true })
</script>

<template>
  <ul class="color-token-list">
    <li
      v-for="token in tokens"
      :key="token.name"
      class="color-token-list__item"
      :class="{ 'color-token-list__item--deprecated': token.deprecated }"
    >
      <div
        class="color-token-list__sample-host"
        :class="{ 'color-token-list__sample-host--inverted-border': needsBorderDarkWrap(token.name) }"
      >
        <span
          :ref="(el) => setSampleRef(token.name, el)"
          class="color-token-list__sample"
          :class="{
            'color-token-list__sample--filled': isFilledMode,
            'color-token-list__sample--bordered': mode === 'border',
            'color-token-list__sample--inverted-border-inner': needsBorderDarkWrap(token.name),
            'color-token-list__sample--light-text': textToneByToken[token.name] === 'light',
            'color-token-list__sample--inverted-bg':
              mode === 'text' && needsInvertedBgByToken[token.name],
          }"
          :style="sampleStyle(token)"
        >
          {{ token.name }}
          <span class="color-token-list__value">{{ token.value }}</span>
        </span>
      </div>
      <TokenDeprecatedLabel v-if="token.deprecated" />
    </li>
  </ul>
</template>

<style scoped>
.color-token-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin: 0;
  padding: 0;
  list-style: none;
}

.color-token-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
}

.color-token-list__sample-host {
  display: inline-flex;
}

.color-token-list__sample-host--inverted-border {
  padding: var(--spacing-75);
  border-radius: var(--border-radius-base);
  background: var(--background-color-inverted);
}

.color-token-list__sample {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.color-token-list__value {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: inherit;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.color-token-list__sample--filled,
.color-token-list__sample--bordered {
  padding: var(--spacing-35) var(--spacing-50);
  border-radius: var(--border-radius-base);
}

.color-token-list__sample--filled {
  color: #202122;
}

.color-token-list__sample--filled .color-token-list__value {
  color: inherit;
  opacity: 0.85;
}

.color-token-list__sample--filled.color-token-list__sample--light-text {
  color: #fff;
}

.color-token-list__sample--bordered {
  border: var(--border-width-base) solid;
  background: var(--background-color-base);
  color: #202122;
}

.color-token-list__sample--bordered.color-token-list__sample--inverted-border-inner {
  background: var(--background-color-inverted);
  color: #fff;
}

.color-token-list__sample--bordered.color-token-list__sample--inverted-border-inner
  .color-token-list__value {
  color: inherit;
  opacity: 0.85;
}

.color-token-list__sample--inverted-bg {
  padding: var(--spacing-35) var(--spacing-50);
  border-radius: var(--border-radius-base);
  background: var(--background-color-inverted);
}

.color-token-list__sample--inverted-bg .color-token-list__value {
  color: inherit;
  opacity: 0.85;
}

.color-token-list__item--deprecated .color-token-list__sample {
  opacity: 0.75;
}
</style>
