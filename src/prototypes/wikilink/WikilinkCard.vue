<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import type { WikilinkCardData } from './fetchCardData'
import WikilinkBadge from './WikilinkBadge.vue'
import WikilinkPreview from './WikilinkPreview.vue'

/**
 * Custom link preview card — Figma "Lu: popover" (Codex Attribution file, node 214:335).
 * Wider than the design (450px, like the native landscape preview). Absolutely positioned in
 * page coordinates: below the hovered link if it fits, else above, else beside it (right,
 * then left), vertically centred on the link and kept on screen. With no room beside the
 * link either, the summary loses lines; if it still doesn't fit, it goes below.
 * The image always stays.
 */
const props = defineProps<{
  data: WikilinkCardData
  anchor: HTMLElement
  /** "Styled": recoloured in todepond.com's palette (styled.css). */
  styled?: boolean
}>()

const emit = defineEmits<{
  /** Image or "Read full article" clicked: open the article panel. */
  open: [title: string, section?: string]
}>()

const root = ref<HTMLElement | null>(null)
type Placement = 'below' | 'above' | 'right' | 'left'
const position = ref({ top: 0, left: 0, placement: 'below' as Placement })
/** Hidden until placed, so it never flashes at the wrong spot or size. */
const placed = ref(false)
/** Summary line limit; the native preview shows a similarly short excerpt. */
const MAX_LINES = 6
const MIN_LINES = 2
const extractLines = ref(MAX_LINES)

const GAP = 8
const EDGE = 8
/** todepond.com's hovered links get a 2px outline; line the card's edge up with it. */
const NUDGE = 2

/** The wiki's main page (https://en.wikipedia.org/ by default), for the W bar. */
const wikiHome = computed(() => `${new URL(props.data.url).origin}/`)

async function place(): Promise<void> {
  const el = root.value
  if (!el) return
  const rects = props.anchor.getClientRects()
  const rect = rects[0] ?? props.anchor.getBoundingClientRect()
  const last = rects[rects.length - 1] ?? rect
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - last.bottom - GAP - EDGE
  const spaceAbove = rect.top - GAP - EDGE
  const spaceRight = viewportWidth - last.right - GAP - EDGE
  const spaceLeft = rect.left - GAP - EDGE

  await nextTick()
  let placement: Placement | null = null
  if (el.offsetHeight <= spaceBelow) placement = 'below'
  else if (el.offsetHeight <= spaceAbove) placement = 'above'
  else if (el.offsetWidth <= spaceRight) placement = 'right'
  else if (el.offsetWidth <= spaceLeft) placement = 'left'

  if (placement === 'right' || placement === 'left') {
    // Beside the link the whole screen height is available; only shrink if taller than that.
    while (el.offsetHeight > viewportHeight - 2 * EDGE && extractLines.value > MIN_LINES) {
      extractLines.value--
      await nextTick()
    }
  } else if (!placement) {
    // No room anywhere: drop summary lines until it fits above or below, else go below
    // (past the bottom the page can scroll to it; past the top it'd be cut off).
    for (;;) {
      if (el.offsetHeight <= spaceBelow) placement = 'below'
      else if (el.offsetHeight <= spaceAbove) placement = 'above'
      if (placement || extractLines.value <= MIN_LINES) break
      extractLines.value--
      await nextTick()
    }
    placement ??= 'below'
  }

  const height = el.offsetHeight
  const width = el.offsetWidth
  let top: number
  let left: number
  if (placement === 'right' || placement === 'left') {
    const line = placement === 'right' ? last : rect
    const centred = line.top + line.height / 2 - height / 2
    top = window.scrollY + Math.max(EDGE, Math.min(centred, viewportHeight - EDGE - height))
    left = window.scrollX + (placement === 'right' ? last.right + GAP : rect.left - GAP - width)
  } else {
    top =
      placement === 'above'
        ? rect.top + window.scrollY - GAP - height
        : last.bottom + window.scrollY + GAP
    // The line of the link the card sits against.
    const near = placement === 'above' ? rect : last
    const minLeft = window.scrollX + EDGE
    const maxLeft = window.scrollX + viewportWidth - width - EDGE
    left = Math.max(minLeft, Math.min(near.left + window.scrollX - NUDGE, maxLeft))
  }
  position.value = { top, left, placement }
  placed.value = true
}

onMounted(place)

const badge = ref<InstanceType<typeof WikilinkBadge> | null>(null)

/** Resolves once the W bar is back at rest, so the card can wait for that before closing. */
const settle = () => badge.value?.settle() ?? Promise.resolve()

defineExpose({ el: root, settle })
</script>

<template>
  <div
    ref="root"
    class="wikilink-card"
    :class="{
      'wikilink-card--placed': placed,
      'wikilink-styled': styled,
      [`wikilink-card--${position.placement}`]: true,
    }"
    :style="{
      top: `${position.top}px`,
      left: `${position.left}px`,
      '--wikilink-card-extract-lines': extractLines,
      '--wikilink-card-gap': `${GAP}px`,
    }"
  >
    <!-- Everything but the W bar, so the white border goes around it and not the bar. -->
    <div class="wikilink-card__frame">
      <WikilinkPreview :data="data" @open="(title, section) => emit('open', title, section)" />
    </div>
    <WikilinkBadge ref="badge" :href="wikiHome" />
  </div>
</template>

<style scoped>
@keyframes wikilink-card-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}

@keyframes wikilink-card-in-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
}

@keyframes wikilink-card-in-from-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
}

@keyframes wikilink-card-in-from-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
}

.wikilink-card {
  position: absolute;
  z-index: 110;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 450px;
  /*
   * No overflow clipping here: the frame clips inside its own border and the W bar rounds
   * its own bottom corners. Clipping the card too would shave the frame's border at the corners.
   */
  border-radius: 16px;
  background-color: var(--background-color-base);
  /* Same elevation as CdxPopover. */
  box-shadow: var(--box-shadow-medium);
  color: var(--color-base);
  text-align: start;
  visibility: hidden;
}

.wikilink-card--placed {
  visibility: visible;
  animation: wikilink-card-in-up 0.2s ease;
}

/* White border on three sides; the W bar closes the bottom. Top corners follow the card's. */
.wikilink-card__frame {
  border: var(--border-width-base) var(--border-style-base) var(--border-color-inverted);
  border-bottom: 0;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  overflow: hidden;
}

.wikilink-card--placed.wikilink-card--above {
  animation-name: wikilink-card-in-down;
}

/*
 * Dead zone: an invisible strip filling the gap between the link and the card, so moving the
 * pointer from one to the other never counts as leaving (the card is the strip's parent).
 */
.wikilink-card::before {
  content: '';
  position: absolute;
}

.wikilink-card--below::before {
  bottom: 100%;
  left: 0;
  right: 0;
  height: var(--wikilink-card-gap);
}

.wikilink-card--above::before {
  top: 100%;
  left: 0;
  right: 0;
  height: var(--wikilink-card-gap);
}

.wikilink-card--right::before {
  right: 100%;
  top: 0;
  bottom: 0;
  width: var(--wikilink-card-gap);
}

.wikilink-card--left::before {
  left: 100%;
  top: 0;
  bottom: 0;
  width: var(--wikilink-card-gap);
}

/* Every placement slides towards the link (below: up, above: down, beside: sideways in). */
.wikilink-card--placed.wikilink-card--right {
  animation-name: wikilink-card-in-from-right;
}

.wikilink-card--placed.wikilink-card--left {
  animation-name: wikilink-card-in-from-left;
}
</style>
