<script setup lang="ts">
import { carouselSlideWidth, CAROUSEL_SLIDE_HEIGHT } from './data/carouselLayout'
import type { CarouselImage } from './data/types'

interface Props {
  images: CarouselImage[]
  loading?: boolean
}

defineProps<Props>()

function slideStyle(image: CarouselImage) {
  return { width: `${carouselSlideWidth(image)}px` }
}
</script>

<template>
  <div class="image-carousel">
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
  margin-inline: calc(-1 * var(--spacing-50));
}

.image-carousel__track {
  display: flex;
  gap: 10px;
  height: v-bind('`${CAROUSEL_SLIDE_HEIGHT}px`');
  overflow-x: auto;
  overscroll-behavior-x: none;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.image-carousel__track::-webkit-scrollbar {
  display: none;
}

.image-carousel__slide {
  flex: 0 0 auto;
  height: v-bind('`${CAROUSEL_SLIDE_HEIGHT}px`');
  border-radius: 6px;
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
