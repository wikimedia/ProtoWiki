<script setup lang="ts">
import { computed, toRef, watch } from 'vue'

import type { WikitabSearchImage } from './data/fetchWikitabSearchImages'
import { useThumbnailSlotReady } from './useThumbnailSlotReady'

const props = defineProps<{
  image: WikitabSearchImage
}>()

const emit = defineEmits<{
  decoded: []
}>()

const thumbnailUrl = toRef(() => props.image.thumbnailUrl)
const { showThumbnailPending } = useThumbnailSlotReady(thumbnailUrl)

const aspectRatio = computed(() => `${props.image.width} / ${props.image.height}`)

const altText = computed(() => {
  const title = props.image.title
  return title.startsWith('File:') ? title.slice(5) : title
})

watch(
  showThumbnailPending,
  (pending) => {
    if (!pending && thumbnailUrl.value) emit('decoded')
  },
  { immediate: true },
)
</script>

<template>
  <a
    class="wikitab-search-image-card"
    :href="image.filePageUrl"
    target="_blank"
    rel="noreferrer"
  >
    <div class="wikitab-search-image-card__frame" :style="{ aspectRatio }">
      <div
        v-if="showThumbnailPending"
        class="wikitab-search-image-card__pending"
        aria-hidden="true"
      />
      <img
        class="wikitab-search-image-card__img"
        :class="{ 'wikitab-search-image-card__img--loading': showThumbnailPending }"
        :src="image.thumbnailUrl"
        :alt="altText"
        loading="lazy"
        decoding="async"
      />
    </div>
  </a>
</template>

<style scoped>
.wikitab-search-image-card {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  text-decoration: none;
  transition-property: border-color;
  transition-duration: 0.1s;
}

.wikitab-search-image-card:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikitab-search-image-card:active {
  border-color: var(--border-color-interactive--active, #202122);
}

.wikitab-search-image-card__frame {
  position: relative;
  width: 100%;
}

.wikitab-search-image-card__pending {
  position: absolute;
  inset: 0;
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
}

.wikitab-search-image-card__img {
  display: block;
  width: 100%;
  height: auto;
}

.wikitab-search-image-card__img--loading {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}
</style>
