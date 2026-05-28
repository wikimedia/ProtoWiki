<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowNext, cdxIconArrowPrevious } from '@wikimedia/codex-icons'

import type { LifeEventCard } from './einstein-events'

interface Props {
  events: LifeEventCard[]
}

const props = defineProps<Props>()

const railRef = ref<HTMLElement | null>(null)
const slideRefs = ref<(HTMLElement | null)[]>([])
const activeIndex = ref(0)

const totalSlides = computed(() => props.events.length)
const counterLabel = computed(() => `${activeIndex.value + 1} of ${totalSlides.value}`)

function setSlideRef(index: number, el: Element | null) {
  slideRefs.value[index] = el instanceof HTMLElement ? el : null
}

function scrollToIndex(index: number) {
  const slide = slideRefs.value[index]
  if (!slide) return
  slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

function goPrevious() {
  if (activeIndex.value <= 0) return
  scrollToIndex(activeIndex.value - 1)
}

function goNext() {
  if (activeIndex.value >= totalSlides.value - 1) return
  scrollToIndex(activeIndex.value + 1)
}

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  observer = null

  const rail = railRef.value
  if (!rail || props.events.length === 0) return

  observer = new IntersectionObserver(
    (entries) => {
      let bestIndex = activeIndex.value
      let bestRatio = 0

      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = slideRefs.value.findIndex((slide) => slide === entry.target)
        if (index === -1) continue
        if (entry.intersectionRatio >= bestRatio) {
          bestRatio = entry.intersectionRatio
          bestIndex = index
        }
      }

      activeIndex.value = bestIndex
    },
    {
      root: rail,
      threshold: [0.4, 0.6, 0.8],
    },
  )

  slideRefs.value.forEach((slide) => {
    if (slide) observer?.observe(slide)
  })
}

onMounted(() => {
  void nextTick(() => setupObserver())
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

watch(
  () => props.events,
  () => {
    slideRefs.value = []
    activeIndex.value = 0
    void nextTick(() => setupObserver())
  },
  { deep: true },
)
</script>

<template>
  <section
    class="personal-life-carousel"
    aria-roledescription="carousel"
    aria-label="Personal life events"
  >
    <div ref="railRef" class="personal-life-carousel__rail">
      <article
        v-for="(event, index) in events"
        :key="event.title"
        :ref="(el) => setSlideRef(index, el as Element | null)"
        class="personal-life-carousel__slide"
        role="group"
        :aria-label="`${index + 1} of ${totalSlides}: ${event.title}`"
      >
        <div class="life-event-card">
          <h3 class="life-event-card__title">{{ event.title }}</h3>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="mw-parser-output life-event-card__body" v-html="event.html" />
        </div>
      </article>
    </div>

    <div class="personal-life-carousel__footer">
      <div class="personal-life-carousel__dots" aria-hidden="true">
        <span
          v-for="(_, index) in events"
          :key="`dot-${index}`"
          class="personal-life-carousel__dot"
          :class="{ 'personal-life-carousel__dot--active': index === activeIndex }"
        />
      </div>

      <div class="personal-life-carousel__controls">
        <CdxButton
          aria-label="Previous event"
          weight="quiet"
          :disabled="activeIndex <= 0"
          @click="goPrevious"
        >
          <CdxIcon :icon="cdxIconArrowPrevious" />
        </CdxButton>

        <p class="personal-life-carousel__counter" aria-live="polite">
          {{ counterLabel }}
        </p>

        <CdxButton
          aria-label="Next event"
          weight="quiet"
          :disabled="activeIndex >= totalSlides - 1"
          @click="goNext"
        >
          <CdxIcon :icon="cdxIconArrowNext" />
        </CdxButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.personal-life-carousel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  min-height: calc(100dvh - 14rem);
}

.personal-life-carousel__rail {
  display: flex;
  gap: var(--spacing-75, 12px);
  flex: 1 1 auto;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-block: var(--spacing-50, 8px);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.personal-life-carousel__rail::-webkit-scrollbar {
  display: none;
}

.personal-life-carousel__slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
}

.life-event-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  min-height: 18rem;
  padding: var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.life-event-card__title {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.life-event-card__body {
  flex: 1;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.6);
}

.life-event-card__body :deep(p) {
  margin-block: 0 0.75em;
}

.life-event-card__body :deep(p:last-child) {
  margin-block-end: 0;
}

.life-event-card__body :deep(figure) {
  margin: 0 0 var(--spacing-75, 12px);
}

.life-event-card__body :deep(figcaption) {
  margin-block-start: var(--spacing-25, 4px);
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.life-event-card__body :deep(img) {
  max-width: 100%;
  height: auto;
}

.personal-life-carousel__footer {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-50, 8px);
  margin-top: auto;
  padding-block: var(--spacing-100, 16px);
  background-color: var(--background-color-base, #fff);
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.06);
}

.personal-life-carousel__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-100, 16px);
  width: 100%;
}

.personal-life-carousel__counter {
  margin: 0;
  min-width: 4rem;
  text-align: center;
  font-size: var(--font-size-small, 0.875rem);
  color: var(--color-subtle, #54595d);
}

.personal-life-carousel__dots {
  display: flex;
  justify-content: center;
  gap: var(--spacing-50, 8px);
}

.personal-life-carousel__dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background-color: var(--border-color-subtle, #c8ccd1);
}

.personal-life-carousel__dot--active {
  width: 1.25rem;
  background-color: var(--color-progressive, #36c);
}
</style>
