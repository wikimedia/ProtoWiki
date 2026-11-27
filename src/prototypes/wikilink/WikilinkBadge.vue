<script lang="ts">
/** Shared across every badge, so a fresh one doesn't repeat the previous badge's alternative label. */
let lastBadgeLabel: string | undefined
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconLogoWikipedia } from '@wikimedia/codex-icons'

/**
 * The black "W" bar at the bottom of the custom card and the article panel. Hover (or focus)
 * types a phrase (usually "from Wikipedia") out behind a block caret. Leaving deletes it
 * instantly, the caret snaps back beside the W, and then the W and caret glide back to centre.
 * Rounds its bottom corners from its parent's (`border-*-radius: inherit`).
 */
defineProps<{
  /** Where the bar links: the wiki's main page. */
  href: string
}>()

const DEFAULT_BADGE_LABEL = 'from Wikipedia'
/** Occasional alternatives, picked at random 30% of the time. */
const ALT_BADGE_LABELS = [
  'written by humans',
  'typed by humans',
  'checked by humans',
  'shared from Wikipedia',
  'edited by you',
]
const pickBadgeLabel = () => {
  if (Math.random() < 0.7) {
    lastBadgeLabel = DEFAULT_BADGE_LABEL
    return DEFAULT_BADGE_LABEL
  }
  // Never repeat the same alternative twice in a row.
  const choices = ALT_BADGE_LABELS.filter((label) => label !== lastBadgeLabel)
  lastBadgeLabel = choices[Math.floor(Math.random() * choices.length)]
  return lastBadgeLabel
}
const badgeLabel = ref(Array.from(DEFAULT_BADGE_LABEL))
const TYPE_MS = 30
const GLIDE_MS = 200
const typed = ref(0)
const badgeActive = ref(false)
/** Letters and gap collapse without transitions while deleting. */
const deleting = ref(false)
/** The W (and caret) gliding back to centre after a delete. */
const gliding = ref(false)
const badgeInner = ref<HTMLElement | null>(null)
let typingTimer: ReturnType<typeof setInterval> | undefined
let glideTimer: ReturnType<typeof setTimeout> | undefined

/** Set once the owner starts closing: the bar then only deletes, so closing can't stall. */
let closing = false

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function stopGlide(): void {
  clearTimeout(glideTimer)
  gliding.value = false
  const inner = badgeInner.value
  if (inner) {
    inner.style.transition = ''
    inner.style.transform = ''
  }
}

function setBadgeActive(active: boolean): void {
  if (active && closing) return
  badgeActive.value = active
  clearInterval(typingTimer)
  if (active) {
    stopGlide()
    deleting.value = false
    // A fresh phrase each time typing starts from empty (not when resuming mid-word).
    if (typed.value === 0) badgeLabel.value = Array.from(pickBadgeLabel())
    if (reducedMotion()) {
      typed.value = badgeLabel.value.length
      return
    }
    typingTimer = setInterval(() => {
      if (typed.value < badgeLabel.value.length) typed.value++
      else clearInterval(typingTimer)
    }, TYPE_MS)
  } else if (typed.value > 0) {
    deleteAndGlide()
  }
}

/** FLIP: delete instantly, then animate the W from where it was to its new centred spot. */
async function deleteAndGlide(): Promise<void> {
  const inner = badgeInner.value
  const before = inner?.getBoundingClientRect().left ?? 0
  deleting.value = true
  typed.value = 0
  if (!inner || reducedMotion()) return
  gliding.value = true
  await nextTick()
  const after = inner.getBoundingClientRect().left
  inner.style.transition = 'none'
  inner.style.transform = `translateX(${before - after}px)`
  void inner.offsetWidth // commit the start position before transitioning from it
  inner.style.transition = `transform ${GLIDE_MS}ms ease`
  inner.style.transform = ''
  glideTimer = setTimeout(stopGlide, GLIDE_MS)
}

/** Caret shows from the first keystroke until the W has glided back. */
const caretVisible = computed(() => badgeActive.value || typed.value > 0 || gliding.value)

/** Resolves once the bar is back at rest, so its owner can wait for that before closing. */
function settle(): Promise<void> {
  closing = true
  if (badgeActive.value) setBadgeActive(false)
  if (!gliding.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(gliding, (isGliding) => {
      if (isGliding) return
      stop()
      resolve()
    })
  })
}

onBeforeUnmount(() => {
  clearInterval(typingTimer)
  clearTimeout(glideTimer)
})

defineExpose({ settle })
</script>

<template>
  <a
    class="wikilink-badge"
    :href="href"
    target="_blank"
    rel="noopener"
    aria-label="Wikipedia"
    @mouseenter="setBadgeActive(true)"
    @mouseleave="setBadgeActive(false)"
    @focus="setBadgeActive(true)"
    @blur="setBadgeActive(false)"
  >
    <span ref="badgeInner" class="wikilink-badge__inner">
      <CdxIcon :icon="cdxIconLogoWikipedia" />
      <span
        class="wikilink-badge__label"
        :class="{
          'wikilink-badge__label--filled': typed > 0,
          'wikilink-badge__label--deleting': deleting,
        }"
        aria-hidden="true"
      >
        <span
          v-for="(letter, i) in badgeLabel"
          :key="i"
          class="wikilink-badge__letter"
          :class="{ 'wikilink-badge__letter--typed': i < typed }"
          >{{ letter }}</span
        >
        <span
          v-if="caretVisible"
          class="wikilink-badge__caret"
          :class="{ 'wikilink-badge__caret--blink': badgeActive && typed === badgeLabel.length }"
        />
      </span>
    </span>
  </a>
</template>

<style scoped>
.wikilink-badge {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Fixed to the icon's height so revealing the label doesn't resize the bar. */
  height: calc(18px + 2 * var(--spacing-25));
  box-sizing: border-box;
  text-decoration: none;
  padding: var(--spacing-25) var(--spacing-100);
  background-color: var(--background-color-inverted);
}

.wikilink-badge:hover,
.wikilink-badge:focus-visible {
  text-decoration: none;
}

.wikilink-badge:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base) var(--outline-color-progressive--focus);
  outline-offset: calc(-1 * var(--border-width-thick));
}

/* The W and its label, centred together (and moved as one when gliding back). */
.wikilink-badge__inner {
  display: inline-flex;
  align-items: center;
}

.wikilink-badge .cdx-icon {
  color: var(--color-inverted-fixed);
  min-width: 18px;
  min-height: 18px;
  width: 18px;
  height: 18px;
}

/*
 * Each letter slides open rather than popping in, so the centred W and text glide left as the
 * line grows. The 4px gap after the W only opens once there's text, so at rest the W is
 * exactly centred.
 */
.wikilink-badge__label {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-inline-start: 0;
  transition: margin-inline-start 60ms linear;
  /*
   * Figma "Caption Regular" (badge hover state, node 219:378): 12px on 20px lines, in the
   * Codex system sans stack (the design uses Inter); ProtoWiki's --font-family-base is
   * plain sans-serif, which renders as Helvetica.
   */
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-x-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-x-small);
  color: var(--color-inverted-fixed);
  white-space: nowrap;
}

.wikilink-badge__label--filled {
  margin-inline-start: var(--spacing-25);
}

.wikilink-badge__letter {
  display: inline-block;
  max-width: 0;
  overflow: hidden;
  white-space: pre;
  transition: max-width 60ms linear;
}

/* Comfortably wider than any letter ("W" is about 1em), so none get clipped. */
.wikilink-badge__letter--typed {
  max-width: 1.5em;
}

/* Deleting is instant: no collapsing transitions. */
.wikilink-badge__label--deleting,
.wikilink-badge__label--deleting .wikilink-badge__letter {
  transition: none;
}

/*
 * Figma caret (badge, node 206:973): a 4 × 12px block, 2px after the text. Positioned outside
 * the layout so showing or hiding it never nudges the centred W.
 */
.wikilink-badge__caret {
  position: absolute;
  top: 50%;
  left: calc(100% + var(--spacing-12));
  width: 4px;
  height: 12px;
  transform: translateY(-50%);
  background-color: var(--color-inverted-fixed);
}

@keyframes wikilink-badge-caret-blink {
  50% {
    opacity: 0;
  }
}

.wikilink-badge__caret--blink {
  animation: wikilink-badge-caret-blink 1s steps(1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .wikilink-badge__label,
  .wikilink-badge__letter {
    transition: none;
  }

  .wikilink-badge__caret--blink {
    animation: none;
  }
}
</style>
