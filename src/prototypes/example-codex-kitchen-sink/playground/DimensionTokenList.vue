<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TokenEntry } from '../lib/parse-tokens'
import {
  getBreakpointTokenGroup,
  getSizeTokenGroup,
  getSpacingTokenGroup,
  isBackgroundPositionToken,
  isBackgroundSizeToken,
  isZeroDimensionToken,
  parsePlainPercentage,
  usesDimensionBarDemo,
} from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

const props = defineProps<{
  kind: 'spacing' | 'size' | 'breakpoint'
  tokens: TokenEntry[]
}>()

type ListEntry =
  | { type: 'group'; label: string }
  | { type: 'token'; token: TokenEntry }

const overflowEnd = ref(new Set<string>())
const demoRefs = new Map<string, HTMLElement>()

const entries = computed(() => {
  const items: ListEntry[] = []
  let currentGroup: string | null = null

  for (const token of props.tokens) {
    const group =
      props.kind === 'spacing'
        ? getSpacingTokenGroup(token.name)
        : props.kind === 'breakpoint'
          ? getBreakpointTokenGroup(token.name)
          : getSizeTokenGroup(token.name)

    if (group !== currentGroup) {
      items.push({ type: 'group', label: group })
      currentGroup = group
    }

    items.push({ type: 'token', token })
  }

  return items
})

const barReference = '8rem'

function barWidthStyle(token: TokenEntry): Record<string, string> | undefined {
  if (isZeroDimensionToken(token)) return undefined
  const pct = parsePlainPercentage(token.value)
  if (pct !== null) return { width: `calc(${barReference} * ${pct} / 100)` }
  return { width: `calc(var(${token.name}))` }
}

function trackStyle(token: TokenEntry): Record<string, string> {
  const barWidth = barWidthStyle(token)?.width
  if (!barWidth) return { minWidth: '100%' }
  return { minWidth: `max(100%, ${barWidth})` }
}

function hasOverflowEnd(el: HTMLElement): boolean {
  return (
    el.scrollWidth > el.clientWidth + 1 &&
    el.scrollLeft + el.clientWidth < el.scrollWidth - 1
  )
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}

function updateOverflow() {
  const next = new Set<string>()

  for (const [name, el] of demoRefs) {
    if (hasOverflowEnd(el)) next.add(name)
  }

  if (setsEqual(next, overflowEnd.value)) return
  overflowEnd.value = next
}

let overflowUpdateQueued = false

function scheduleOverflowUpdate() {
  if (overflowUpdateQueued) return
  overflowUpdateQueued = true
  nextTick(() => {
    overflowUpdateQueued = false
    updateOverflow()
  })
}

function setDemoRef(name: string, el: unknown) {
  const existing = demoRefs.get(name)
  if (existing === el) return

  if (existing) {
    existing.removeEventListener('scroll', scheduleOverflowUpdate)
    resizeObserver?.unobserve(existing)
    demoRefs.delete(name)
  }

  if (el instanceof HTMLElement) {
    demoRefs.set(name, el)
    el.addEventListener('scroll', scheduleOverflowUpdate, { passive: true })
    resizeObserver?.observe(el)
  }

  scheduleOverflowUpdate()
}

let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleOverflowUpdate)
  themeObserver = new MutationObserver(scheduleOverflowUpdate)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  scheduleOverflowUpdate()
})

onBeforeUnmount(() => {
  for (const el of demoRefs.values()) {
    el.removeEventListener('scroll', scheduleOverflowUpdate)
  }
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
})

watch(() => props.tokens, scheduleOverflowUpdate, { deep: true })
watch(entries, scheduleOverflowUpdate)
</script>

<template>
  <ul class="dimension-token-list">
    <template v-for="(entry, index) in entries" :key="index">
      <li v-if="entry.type === 'group'" class="dimension-token-list__group">
        {{ entry.label }}
      </li>
      <li
        v-else
        class="dimension-token-list__item"
        :class="{ 'dimension-token-list__item--deprecated': entry.token.deprecated }"
      >
        <div v-if="usesDimensionBarDemo(entry.token)" class="dimension-token-list__demo">
          <div
            class="dimension-token-list__scroll-wrap"
            :class="{ 'dimension-token-list__scroll-wrap--overflow-end': overflowEnd.has(entry.token.name) }"
          >
            <div
              :ref="(el) => setDemoRef(entry.token.name, el)"
              class="dimension-token-list__scroll"
            >
              <span
                class="dimension-token-list__track"
                :class="{ 'dimension-token-list__track--zero': isZeroDimensionToken(entry.token) }"
                :style="trackStyle(entry.token)"
              >
                <span
                  v-if="!isZeroDimensionToken(entry.token)"
                  class="dimension-token-list__box"
                  :style="barWidthStyle(entry.token)"
                  aria-hidden="true"
                />
                <span class="dimension-token-list__label">
                  <span class="dimension-token-list__name">{{ entry.token.name }}</span>
                  <span class="dimension-token-list__value">{{ entry.token.value }}</span>
                  <TokenDeprecatedLabel v-if="entry.token.deprecated" />
                </span>
              </span>
            </div>
          </div>
        </div>
        <div
          v-else-if="isBackgroundPositionToken(entry.token.name) || isBackgroundSizeToken(entry.token.name)"
          class="dimension-token-list__demo dimension-token-list__demo--background"
        >
          <div
            class="dimension-token-list__background-preview"
            :class="{
              'dimension-token-list__background-preview--position': isBackgroundPositionToken(entry.token.name),
              'dimension-token-list__background-preview--size': isBackgroundSizeToken(entry.token.name),
            }"
            :style="
              isBackgroundPositionToken(entry.token.name)
                ? { backgroundPosition: `var(${entry.token.name})` }
                : { backgroundSize: `var(${entry.token.name})` }
            "
            aria-hidden="true"
          />
          <div class="dimension-token-list__background-meta">
            <span class="dimension-token-list__name">{{ entry.token.name }}</span>
            <span class="dimension-token-list__value">{{ entry.token.value }}</span>
            <TokenDeprecatedLabel v-if="entry.token.deprecated" />
          </div>
        </div>
        <div v-else class="dimension-token-list__demo">
          <span class="dimension-token-list__swatch dimension-token-list__swatch--generic">
            <span class="dimension-token-list__label">
              <span class="dimension-token-list__name">{{ entry.token.name }}</span>
              <span class="dimension-token-list__value">{{ entry.token.value }}</span>
              <TokenDeprecatedLabel v-if="entry.token.deprecated" />
            </span>
          </span>
        </div>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.dimension-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dimension-token-list__group {
  padding: var(--spacing-100) 0 var(--spacing-50);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dimension-token-list__group:first-child {
  padding-top: 0;
}

.dimension-token-list__item {
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.dimension-token-list__demo {
  min-width: 0;
}

.dimension-token-list__scroll-wrap {
  position: relative;
  min-width: 0;
}

.dimension-token-list__scroll-wrap--overflow-end::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  z-index: 2;
  width: 1.5rem;
  pointer-events: none;
  background-image: linear-gradient(
    to left,
    var(--background-color-base) 0,
    var(--background-color-transparent) 100%
  );
}

.dimension-token-list__scroll {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.dimension-token-list__track {
  position: relative;
  display: block;
  min-height: 2.75rem;
}

.dimension-token-list__demo--background {
  display: grid;
  grid-template-columns: 6rem 1fr;
  align-items: center;
  gap: var(--spacing-100);
}

.dimension-token-list__background-preview {
  width: 6rem;
  height: 4rem;
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
  background-repeat: no-repeat;
}

.dimension-token-list__background-preview--position {
  background-image: radial-gradient(
    circle at center,
    var(--color-progressive) 0.65rem,
    var(--color-progressive) 0.65rem,
    transparent 0.66rem
  );
  background-size: 200% 200%;
}

.dimension-token-list__background-preview--size {
  background-image: linear-gradient(
    135deg,
    var(--color-progressive) 0%,
    var(--color-progressive) 45%,
    var(--background-color-neutral) 45%,
    var(--background-color-neutral) 100%
  );
  background-position: center;
}

.dimension-token-list__background-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.dimension-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.dimension-token-list__swatch {
  position: relative;
  display: inline-block;
}

.dimension-token-list__box {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  z-index: 0;
  border-radius: var(--border-radius-base);
  background: var(--background-color-progressive-subtle);
}

.dimension-token-list__label {
  position: sticky;
  inset-inline-start: 0;
  z-index: 1;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  padding: var(--spacing-35) var(--spacing-50);
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.dimension-token-list__name {
  white-space: nowrap;
}

.dimension-token-list__swatch--generic .dimension-token-list__label {
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.dimension-token-list__item--deprecated .dimension-token-list__track,
.dimension-token-list__item--deprecated .dimension-token-list__swatch {
  opacity: 0.75;
}
</style>
