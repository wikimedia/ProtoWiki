<script setup lang="ts">
import { computed } from 'vue'
import type { TokenEntry } from '../lib/parse-tokens'
import {
  getAnimationTokenGroup,
  getTransitionTokenGroup,
} from '../lib/parse-tokens'
import TokenDeprecatedLabel from './TokenDeprecatedLabel.vue'

const props = defineProps<{
  kind: 'animation' | 'transition'
  tokens: TokenEntry[]
}>()

type ListEntry =
  | { type: 'group'; label: string }
  | { type: 'token'; token: TokenEntry }

type PreviewKind =
  | 'transition-property'
  | 'transition-timing-function'
  | 'animation-timing-function'
  | 'animation-iteration-count'
  | 'transform'
  | 'transition-duration'
  | 'animation-duration'
  | 'delay'

const entries = computed(() => {
  const items: ListEntry[] = []
  let currentGroup: string | null = null

  for (const token of props.tokens) {
    const group =
      props.kind === 'transition'
        ? getTransitionTokenGroup(token.name)
        : getAnimationTokenGroup(token.name)

    if (group !== currentGroup) {
      items.push({ type: 'group', label: group })
      currentGroup = group
    }

    items.push({ type: 'token', token })
  }

  return items
})

function previewKind(token: TokenEntry): PreviewKind {
  if (props.kind === 'transition') {
    if (token.name.startsWith('--transition-property-')) return 'transition-property'
    if (token.name.startsWith('--transition-timing-function-')) return 'transition-timing-function'
    return 'transition-duration'
  }

  if (token.name.startsWith('--animation-timing-function-')) return 'animation-timing-function'
  if (token.name.startsWith('--animation-iteration-count-')) return 'animation-iteration-count'
  if (token.name.startsWith('--animation-duration-')) return 'animation-duration'
  if (token.name.startsWith('--animation-delay-')) return 'delay'
  return 'transform'
}

function previewHint(kind: PreviewKind): string | null {
  if (kind === 'transition-property' || kind === 'transition-timing-function' || kind === 'transition-duration') {
    return 'Hover to preview'
  }
  return null
}
</script>

<template>
  <ul class="animation-token-list">
    <template v-for="(entry, index) in entries" :key="index">
      <li v-if="entry.type === 'group'" class="animation-token-list__group">
        {{ entry.label }}
      </li>
      <li
        v-else
        class="animation-token-list__item"
        :class="{ 'animation-token-list__item--deprecated': entry.token.deprecated }"
      >
        <div class="animation-token-list__preview">
          <span
            v-if="previewKind(entry.token) === 'transition-property'"
            class="animation-token-list__sample animation-token-list__sample--property"
            :style="{
              transitionProperty: `var(${entry.token.name})`,
              transitionDuration: '600ms',
              transitionTimingFunction: 'ease',
            }"
            aria-hidden="true"
          />

          <div
            v-else-if="previewKind(entry.token) === 'transition-timing-function'"
            class="animation-token-list__track"
          >
            <span
              class="animation-token-list__bar animation-token-list__bar--transition"
              :style="{
                transitionProperty: 'transform',
                transitionDuration: '800ms',
                transitionTimingFunction: `var(${entry.token.name})`,
              }"
              aria-hidden="true"
            />
          </div>

          <div
            v-else-if="previewKind(entry.token) === 'animation-timing-function'"
            class="animation-token-list__track"
          >
            <span
              class="animation-token-list__bar animation-token-list__bar--animated"
              :style="{ animationTimingFunction: `var(${entry.token.name})` }"
              aria-hidden="true"
            />
          </div>

          <div
            v-else-if="previewKind(entry.token) === 'animation-iteration-count'"
            class="animation-token-list__track"
          >
            <span
              class="animation-token-list__bar animation-token-list__bar--animated animation-token-list__bar--pulse"
              :style="{ animationIterationCount: `var(${entry.token.name})` }"
              aria-hidden="true"
            />
          </div>

          <span
            v-else-if="previewKind(entry.token) === 'transform'"
            class="animation-token-list__transform-host"
            aria-hidden="true"
          >
            <span
              class="animation-token-list__transform-arm"
              :style="{ transform: `var(${entry.token.name})` }"
            />
          </span>

          <div
            v-else-if="previewKind(entry.token) === 'transition-duration'"
            class="animation-token-list__track"
          >
            <span
              class="animation-token-list__bar animation-token-list__bar--transition"
              :style="{
                transitionProperty: 'transform',
                transitionDuration: `var(${entry.token.name})`,
                transitionTimingFunction: 'ease',
              }"
              aria-hidden="true"
            />
          </div>

          <div
            v-else-if="previewKind(entry.token) === 'animation-duration'"
            class="animation-token-list__track"
          >
            <span
              class="animation-token-list__bar animation-token-list__bar--animated"
              :style="{ animationDuration: `var(${entry.token.name})` }"
              aria-hidden="true"
            />
          </div>

          <div v-else class="animation-token-list__track">
            <span
              class="animation-token-list__bar animation-token-list__bar--delayed"
              :style="{ animationDelay: `var(${entry.token.name})` }"
              aria-hidden="true"
            />
          </div>
        </div>

        <div class="animation-token-list__meta">
          <code class="animation-token-list__name">{{ entry.token.name }}</code>
          <span class="animation-token-list__value">{{ entry.token.value }}</span>
          <span v-if="previewHint(previewKind(entry.token))" class="animation-token-list__hint">
            {{ previewHint(previewKind(entry.token)) }}
          </span>
          <TokenDeprecatedLabel v-if="entry.token.deprecated" />
        </div>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.animation-token-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.animation-token-list__group {
  padding: var(--spacing-100) 0 var(--spacing-50);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.animation-token-list__group:first-child {
  padding-top: 0;
}

.animation-token-list__item {
  display: grid;
  grid-template-columns: 12rem 1fr;
  align-items: center;
  gap: var(--spacing-100);
  padding-block: var(--spacing-75);
  border-bottom: var(--border-subtle);
}

.animation-token-list__preview {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
}

.animation-token-list__sample {
  display: block;
  width: 100%;
  min-height: 2.75rem;
  background: var(--background-color-neutral-subtle);
  border: var(--border-base);
  border-radius: var(--border-radius-base);
  box-shadow: none;
  opacity: 1;
  transform: scale(1);
}

.animation-token-list__item:hover .animation-token-list__sample--property {
  background: var(--color-progressive);
  color: var(--color-inverted);
  border-color: var(--color-progressive--hover);
  box-shadow: var(--box-shadow-medium);
  opacity: 0.85;
  transform: scale(1.02);
}

.animation-token-list__track {
  position: relative;
  width: 100%;
  height: 0.5rem;
  background: var(--background-color-neutral);
  border-radius: var(--border-radius-pill);
  overflow: hidden;
}

.animation-token-list__bar {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 2rem;
  background: var(--color-progressive);
  border-radius: var(--border-radius-pill);
}

.animation-token-list__bar--transition {
  transform: translateX(0);
}

.animation-token-list__item:hover .animation-token-list__bar--transition {
  transform: translateX(calc(12rem - 2rem));
}

.animation-token-list__bar--animated {
  animation: animation-token-list-slide 2s ease-in-out infinite alternate;
}

.animation-token-list__bar--pulse {
  width: 100%;
  transform-origin: left center;
  animation-name: animation-token-list-pulse;
}

.animation-token-list__bar--delayed {
  animation: animation-token-list-slide 2s linear infinite;
}

.animation-token-list__transform-host {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: var(--background-color-neutral-subtle);
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
}

.animation-token-list__transform-arm {
  display: block;
  width: 0.125rem;
  height: 1.25rem;
  background: var(--color-progressive);
  border-radius: var(--border-radius-pill);
  transform-origin: center bottom;
}

.animation-token-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-25);
  min-width: 0;
}

.animation-token-list__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.animation-token-list__value {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.animation-token-list__hint {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.animation-token-list__item--deprecated .animation-token-list__preview {
  opacity: 0.75;
}

@keyframes animation-token-list-slide {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(12rem - 2rem));
  }
}

@keyframes animation-token-list-pulse {
  0%,
  100% {
    transform: scaleX(0.2);
    opacity: 0.35;
  }

  50% {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>
