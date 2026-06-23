<script setup lang="ts">
import type { CarouselImage, CarouselImageOrientation } from './data/types'

interface Props {
  images: CarouselImage[]
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="image-carousel">
    <div class="image-carousel__track">
      <template v-if="loading">
        <div
          v-for="n in 2"
          :key="n"
          class="image-carousel__slide image-carousel__slide--landscape image-carousel__slide--placeholder"
        />
      </template>

      <template v-else-if="images.length">
        <div
          v-for="(image, index) in images"
          :key="`${image.url}-${index}`"
          class="image-carousel__slide"
          :class="`image-carousel__slide--${image.orientation}`"
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
  height: 154px;
  overflow-x: auto;
  overscroll-behavior-x: none;
  scroll-snap-type: x mandatory;
  scroll-padding-inline-start: var(--spacing-50);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.image-carousel__track::-webkit-scrollbar {
  display: none;
}

.image-carousel__slide {
  flex: 0 0 auto;
  height: 154px;
  scroll-snap-align: start;
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--background-color-interactive-subtle);
}

.image-carousel__slide--landscape {
  width: 231px;
}

.image-carousel__slide--square {
  width: 154px;
}

.image-carousel__slide--portrait {
  width: 103px;
}

.image-carousel__slide--tall {
  width: 77px;
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

.image-carousel__slide--placeholder {
  background: linear-gradient(
    90deg,
    var(--background-color-interactive-subtle),
    var(--background-color-base),
    var(--background-color-interactive-subtle)
  );
}

.image-carousel__empty {
  margin: 0;
  color: var(--color-subtle);
}
</style>
