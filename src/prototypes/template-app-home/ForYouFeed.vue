<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { CdxButton, CdxIcon, CdxProgressBar, CdxThumbnail } from '@wikimedia/codex'
import { cdxIconEllipsis, cdxIconHistory } from '@wikimedia/codex-icons'

import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import AppChromeHeader from '@/components/app/AppChromeHeader.vue'

import { extractDarkenedColor, type Rgb } from './extractAverageColor'
import { fetchForYouStories, type ForYouSlide, type ForYouStory } from './fetchForYouStories'
import HomeTabsRow from './HomeTabsRow.vue'

interface Props {
  isIos: boolean
  headerLeft: AppHeaderItem[]
  headerRight: AppHeaderItem[]
  activeTab: 'community' | 'foryou'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:activeTab': [value: 'community' | 'foryou']
}>()

const loading = ref(true)
const stories = ref<ForYouStory[]>([])
const storiesEl = ref<HTMLElement | null>(null)

/** Horizontal slide index per story, for that story's own dot row. */
const activeSlideIndex = reactive<Record<number, number>>({})

/** iOS only — the darkened average color of each loaded image, keyed by pageid. */
const extractedColors = reactive<Record<number, Rgb>>({})

const slidesEls: Record<number, HTMLElement> = {}

function setSlidesEl(storyIndex: number, el: Element | null): void {
  if (el instanceof HTMLElement) slidesEls[storyIndex] = el
}

function onSlideScroll(storyIndex: number): void {
  const el = slidesEls[storyIndex]
  if (!el || el.clientWidth === 0) return
  activeSlideIndex[storyIndex] = Math.round(el.scrollLeft / el.clientWidth)
}

/**
 * Mouse-drag-to-swipe for desktop preview — touch devices already get this
 * for free from the browser, so only `mouse` pointers drive this.
 */
interface DragState {
  pointerId: number
  startX: number
  startY: number
  axis: 'x' | 'y' | null
  startScrollTop: number
  startScrollLeft: number
  slidesEl: HTMLElement | null
}

let dragState: DragState | null = null
const DRAG_AXIS_THRESHOLD = 6

/** A modest drag past the start is enough to advance — no need to push a slide most of the way off-screen. */
const SWIPE_ADVANCE_FRACTION = 0.18

function settleToNearest(el: HTMLElement, axis: 'x' | 'y', startIndex: number): void {
  const size = axis === 'x' ? el.clientWidth : el.clientHeight
  if (!size) return
  const pos = axis === 'x' ? el.scrollLeft : el.scrollTop
  const delta = pos - startIndex * size
  const threshold = size * SWIPE_ADVANCE_FRACTION
  const scrollExtent = axis === 'x' ? el.scrollWidth : el.scrollHeight
  const maxIndex = Math.round(scrollExtent / size) - 1

  let targetIndex = startIndex
  if (delta > threshold) targetIndex = startIndex + 1
  else if (delta < -threshold) targetIndex = startIndex - 1
  targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))

  const target = targetIndex * size
  if (axis === 'x') el.scrollTo({ left: target, behavior: 'smooth' })
  else el.scrollTo({ top: target, behavior: 'smooth' })
}

/**
 * Move/up listen on `window` rather than the element — the standard pattern
 * for drag interactions, since a fast drag can easily carry the cursor
 * outside the element's bounds mid-gesture.
 */
function onWindowPointerMove(event: PointerEvent): void {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const stories_ = storiesEl.value
  if (!stories_) return

  const dx = event.clientX - dragState.startX
  const dy = event.clientY - dragState.startY

  if (!dragState.axis) {
    if (Math.abs(dx) < DRAG_AXIS_THRESHOLD && Math.abs(dy) < DRAG_AXIS_THRESHOLD) return
    dragState.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    stories_.classList.add('foryou__stories--dragging')
  }

  event.preventDefault()

  if (dragState.axis === 'y') {
    stories_.scrollTop = dragState.startScrollTop - dy
  } else if (dragState.slidesEl) {
    dragState.slidesEl.scrollLeft = dragState.startScrollLeft - dx
  }
}

function onWindowPointerUp(event: PointerEvent): void {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const { axis, slidesEl, startScrollTop, startScrollLeft } = dragState
  const stories_ = storiesEl.value

  // Read the drag-end scroll position and decide the settle target BEFORE
  // re-enabling scroll-snap — flipping snap back on can instantly re-snap
  // the element on its own, clobbering the position we're about to read.
  if (axis === 'y' && stories_) {
    settleToNearest(stories_, 'y', Math.round(startScrollTop / stories_.clientHeight))
  } else if (axis === 'x' && slidesEl) {
    settleToNearest(slidesEl, 'x', Math.round(startScrollLeft / slidesEl.clientWidth))
  }
  stories_?.classList.remove('foryou__stories--dragging')

  dragState = null
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
}

function onStoriesPointerDown(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return
  const stories_ = storiesEl.value
  if (!stories_) return

  const slidesEl = (event.target as HTMLElement).closest<HTMLElement>('.foryou__slides')
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    axis: null,
    startScrollTop: stories_.scrollTop,
    startScrollLeft: slidesEl?.scrollLeft ?? 0,
    slidesEl,
  }
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp)
}

async function onImageLoad(slide: ForYouSlide): Promise<void> {
  if (!props.isIos || !slide.heroImageUrl || extractedColors[slide.pageid]) return
  const color = await extractDarkenedColor(slide.heroImageUrl)
  if (color) extractedColors[slide.pageid] = color
}

/** The text card on an image-less slide — a lighter tint of that slide's own background color. */
function lightenCardColor(hex: string): string {
  return `color-mix(in srgb, ${hex} 45%, white 55%)`
}

const DEFAULT_SCRIM: Rgb = { r: 0, g: 0, b: 0 }

function scrimStyle(slide: ForYouSlide): { backgroundImage: string } {
  const { r, g, b } = extractedColors[slide.pageid] ?? DEFAULT_SCRIM
  return {
    backgroundImage: `linear-gradient(to top, rgba(${r}, ${g}, ${b}, 0.92), rgba(${r}, ${g}, ${b}, 0) 65%)`,
  }
}

async function load(): Promise<void> {
  loading.value = true
  stories.value = await fetchForYouStories()
  loading.value = false
}

onMounted(() => {
  void load()
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
})
</script>

<template>
  <div class="foryou">
    <div class="foryou__chrome">
      <AppChromeHeader
        class="foryou__header"
        theme="dark"
        :left="headerLeft"
        :right="headerRight"
      />
      <div class="foryou__tabs-row">
        <HomeTabsRow
          overlay
          :active-tab="activeTab"
          @update:active-tab="emit('update:activeTab', $event)"
        />
      </div>
    </div>

    <div
      v-if="loading"
      class="foryou__loading"
    >
      <CdxProgressBar
        inline
        aria-label="Loading"
      />
    </div>

    <div
      v-else
      ref="storiesEl"
      class="foryou__stories"
      @pointerdown="onStoriesPointerDown"
    >
      <div
        v-for="(story, sIndex) in stories"
        :key="sIndex"
        class="foryou__story"
      >
        <div
          :ref="(el) => setSlidesEl(sIndex, el as Element | null)"
          class="foryou__slides"
          @scroll="onSlideScroll(sIndex)"
        >
          <div
            v-for="slide in story.slides"
            :key="slide.pageid"
            class="foryou__slide"
          >
            <img
              v-if="slide.heroImageUrl"
              class="foryou__image"
              draggable="false"
              :src="slide.heroImageUrl"
              :alt="slide.displayTitle"
              @load="onImageLoad(slide)"
            >
            <div
              v-else
              class="foryou__card"
              :style="{ backgroundColor: slide.cardColor }"
            />

            <div
              v-if="slide.heroImageUrl"
              class="foryou__scrim"
              :style="scrimStyle(slide)"
            />

            <div class="foryou__content">
              <template v-if="slide.heroImageUrl">
                <div class="foryou__title-row">
                  <h3 class="foryou__title">
                    {{ slide.displayTitle }}
                  </h3>
                  <CdxButton
                    weight="quiet"
                    aria-label="More options"
                  >
                    <CdxIcon :icon="cdxIconEllipsis" />
                  </CdxButton>
                </div>
                <p class="foryou__description">
                  {{ slide.description || slide.extract }}
                </p>
              </template>

              <div
                v-else
                class="foryou__text-card"
                :style="{ backgroundColor: lightenCardColor(slide.cardColor) }"
              >
                <p class="foryou__quote">
                  {{ slide.extract }}
                </p>
                <hr class="foryou__card-divider">
                <div class="foryou__card-footer">
                  <CdxThumbnail
                    v-if="slide.thumbnailUrl"
                    class="foryou__card-thumb"
                    :thumbnail="{ url: slide.thumbnailUrl }"
                  />
                  <div class="foryou__card-footer-text">
                    <strong class="foryou__card-title">{{ slide.displayTitle }}</strong>
                    <span
                      v-if="slide.description"
                      class="foryou__card-description"
                    >{{ slide.description }}</span>
                  </div>
                  <CdxButton
                    weight="quiet"
                    aria-label="More options"
                  >
                    <CdxIcon :icon="cdxIconEllipsis" />
                  </CdxButton>
                </div>
              </div>

              <div class="foryou__reason">
                <CdxIcon :icon="cdxIconHistory" />
                {{ story.reasonLabel }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="story.slides.length > 1"
          class="foryou__dots"
        >
          <span
            v-for="(_, dotIndex) in story.slides"
            :key="dotIndex"
            class="foryou__dot"
            :class="{ 'foryou__dot--active': dotIndex === (activeSlideIndex[sIndex] ?? 0) }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.foryou {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #111;
  color: #fff;
}

.foryou__chrome {
  position: absolute;
  inset-inline: 0;
  top: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));
}

/* Doubled selector beats AppChromeHeader's own same-specificity background rule. */
.foryou__chrome .foryou__header {
  background-color: transparent;
}

/* Same top/bottom gap as the Community tab's tabs row gets from
   `.template-app-home`'s padding-block + gap, so nothing shifts on toggle. */
.foryou__tabs-row {
  padding: var(--spacing-100, 16px) var(--spacing-150, 24px);
}

.foryou__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.foryou__stories {
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  cursor: grab;
}

.foryou__stories::-webkit-scrollbar {
  display: none;
}

.foryou__stories--dragging {
  scroll-snap-type: none;
  cursor: grabbing;
  user-select: none;
}

.foryou__story {
  position: relative;
  height: 100%;
  scroll-snap-align: start;
}

.foryou__slides {
  display: flex;
  height: 100%;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.foryou__slides::-webkit-scrollbar {
  display: none;
}

.foryou__stories--dragging .foryou__slides {
  scroll-snap-type: none;
}

.foryou__slide {
  position: relative;
  flex: 0 0 100%;
  height: 100%;
  scroll-snap-align: start;
  overflow: hidden;
}

.foryou__image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foryou__card {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.foryou__scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.foryou__content {
  position: absolute;
  inset-inline: 0;
  bottom: 40px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-150, 24px);
  padding-top: 96px;
  padding-bottom: 0;
}

.foryou__quote {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large, 1.75rem);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.foryou__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75, 12px);
}

.foryou__title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-normal, 400);
  color: #fff;
}

.foryou__title-row .cdx-button {
  flex-shrink: 0;
  color: #fff;
}

/* Image-less slides — all their text lives in a card tinted a lighter shade
   of the slide's own background color, instead of sitting directly on it.
   The card is light, so its text goes dark instead of inheriting the
   slide's white. */
.foryou__text-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-150, 24px);
  border-radius: var(--border-radius-large, 12px);
  /* Hardcoded, not `var(--color-base)` — that token flips to a light color
     under this screen's dark theme, but this card's own background is light. */
  color: #202122;
}

.foryou__card-divider {
  margin: 0;
  border: 0;
  border-top: var(--border-width-base, 1px) solid rgba(0, 0, 0, 0.15);
}

.foryou__card-footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-75, 12px);
}

.foryou__card-footer-text {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  gap: var(--spacing-12, 2px);
}

.foryou__card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--font-weight-bold, 700);
}

.foryou__card-description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #54595d;
  font-size: var(--font-size-small, 0.875rem);
}

.foryou__card-footer .cdx-button {
  flex-shrink: 0;
  color: inherit;
}

.foryou__description {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.foryou__reason {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  margin-top: var(--spacing-50, 8px);
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--font-size-small, 0.875rem);
}

/* Fixed to the story, not the slide — stays put while slides scroll
   horizontally underneath it; only the active dot's highlight changes. */
.foryou__dots {
  position: absolute;
  inset-inline: 0;
  bottom: var(--spacing-150, 24px);
  z-index: 3;
  display: flex;
  justify-content: center;
  gap: var(--spacing-50, 8px);
  pointer-events: none;
}

.foryou__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--border-radius-circle, 50%);
  background-color: rgba(255, 255, 255, 0.4);
}

.foryou__dot--active {
  background-color: #fff;
}
</style>
