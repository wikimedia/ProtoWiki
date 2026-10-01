<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { codexPaletteGroups } from '../lib/palette-colors'
import type { PaletteColor } from '../lib/palette-colors'
import { getSwatchTextToneForBackground } from '../lib/color-contrast'
import type { SwatchTextTone } from '../lib/color-contrast'

const accentFamilies = new Set(['White', 'Black'])

const accentGroups = computed(() =>
  codexPaletteGroups.filter((group) => accentFamilies.has(group.family)),
)

const rampGroups = computed(() =>
  codexPaletteGroups.filter((group) => !accentFamilies.has(group.family)),
)

const textToneByColor = ref<Record<string, SwatchTextTone>>({})
const sampleRefs = new Map<string, HTMLElement>()

function setSampleRef(name: string, el: unknown) {
  if (el instanceof HTMLElement) sampleRefs.set(name, el)
  else sampleRefs.delete(name)
}

function updateContrast() {
  nextTick(() => {
    const next: Record<string, SwatchTextTone> = {}
    for (const color of codexPaletteGroups.flatMap((group) => group.colors)) {
      const sample = sampleRefs.get(color.name)
      if (sample) next[color.name] = getSwatchTextToneForBackground(sample)
    }
    textToneByColor.value = next
  })
}

function sampleStyle(color: PaletteColor) {
  return { backgroundColor: color.value }
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

watch(() => codexPaletteGroups, updateContrast, { deep: true })
</script>

<template>
  <div class="color-palette">
    <div class="color-palette__accent">
      <section v-for="group in accentGroups" :key="group.family" class="color-palette__family">
        <h3 class="color-palette__title">{{ group.family }}</h3>
        <ul class="color-palette__stack">
          <li v-for="color in group.colors" :key="color.name" class="color-palette__item">
            <div class="color-palette__sample-host">
              <span
                :ref="(el) => setSampleRef(color.name, el)"
                class="color-palette__sample color-palette__sample--filled"
                :class="{ 'color-palette__sample--light-text': textToneByColor[color.name] === 'light' }"
                :style="sampleStyle(color)"
              >
                {{ color.name }}
                <span class="color-palette__value">{{ color.value }}</span>
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div class="color-palette__ramps">
      <section v-for="group in rampGroups" :key="group.family" class="color-palette__family">
        <h3 class="color-palette__title">{{ group.family }}</h3>
        <ul class="color-palette__stack">
          <li v-for="color in group.colors" :key="color.name" class="color-palette__item">
            <div class="color-palette__sample-host">
              <span
                :ref="(el) => setSampleRef(color.name, el)"
                class="color-palette__sample color-palette__sample--filled"
                :class="{ 'color-palette__sample--light-text': textToneByColor[color.name] === 'light' }"
                :style="sampleStyle(color)"
              >
                {{ color.name }}
                <span class="color-palette__value">{{ color.value }}</span>
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.color-palette {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.color-palette__accent {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50) var(--spacing-75);
}

.color-palette__ramps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: var(--spacing-50) var(--spacing-75);
}

.color-palette__family {
  min-width: 0;
}

.color-palette__title {
  margin: 0 0 var(--spacing-35);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.color-palette__stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  margin: 0;
  padding: 0;
  list-style: none;
}

.color-palette__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.color-palette__sample-host {
  display: inline-flex;
}

.color-palette__sample {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: #202122;
}

.color-palette__value {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.color-palette__sample--filled {
  padding: var(--spacing-35) var(--spacing-50);
  border-radius: var(--border-radius-base);
}

.color-palette__sample--filled .color-palette__value {
  color: inherit;
  opacity: 0.85;
}

.color-palette__sample--filled.color-palette__sample--light-text {
  color: #fff;
}
</style>
