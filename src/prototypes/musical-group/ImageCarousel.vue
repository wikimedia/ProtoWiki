<script setup lang="ts">
import { carouselSlideWidth, CAROUSEL_SLIDE_HEIGHT } from './data/carouselLayout'
import type { CarouselImage } from './data/types'

interface Props {
  images: CarouselImage[]
  description?: string
  loading?: boolean
}

defineProps<Props>()

function slideStyle(image: CarouselImage) {
  return { width: `${carouselSlideWidth(image)}px` }
}
</script>

<template>
  <div class="image-carousel">
    <p v-if="description" class="image-carousel__description">{{ description }}</p>

    <div v-if="!loading" class="image-carousel__track">
      <template v-if="images.length">
        <div
          v-for="(image, index) in images"
          :key="`${image.url}-${index}`"
          class="image-carousel__slide"
          :style="slideStyle(image)"
        >
          <img :src="image.url" :alt="''" loading="lazy" draggable="false" />
        </div>
      </template>

      <p v-else class="image-carousel__empty">No images available</p>
    </div>
  </div>
</template>

<style scoped>
.image-carousel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.image-carousel__description {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-emphasized);
}

.image-carousel__track {
  display: flex;
  gap: 10px;
  height: v-bind('`${CAROUSEL_SLIDE_HEIGHT}px`');
  margin-inline: calc(-1 * var(--spacing-50));
  overflow-x: auto;
  overscroll-behavior-x: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.image-carousel__track::-webkit-scrollbar {
  display: none;
}

.image-carousel__slide {
  flex: 0 0 auto;
  height: v-bind('`${CAROUSEL_SLIDE_HEIGHT}px`');
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--background-color-interactive-subtle);
}

.image-carousel__slide:first-child {
  margin-inline-start: var(--spacing-50);
}

.image-carousel__slide:last-child {
  margin-inline-end: var(--spacing-50);
}

.image-carousel__slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
}

.image-carousel__empty {
  margin: 0;
  color: var(--color-subtle);
}
</style>
