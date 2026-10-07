<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconEllipsis,
  cdxIconEyeClosed,
} from '@wikimedia/codex-icons'

import {
  formatImageAttribution,
  imageCardTitle,
  imageHasAttribution,
  type WikitabSearchImage,
} from './data/fetchWikitabSearchImages'
import { useThumbnailSlotReady } from './useThumbnailSlotReady'

const props = defineProps<{
  image: WikitabSearchImage
  isSaved?: boolean
}>()

const emit = defineEmits<{
  decoded: []
  hide: [pageid: number]
  'toggle-save': []
}>()

const selection = ref<string | number | null>(null)

const menuItems = computed(() => [
  {
    value: 'save',
    label: props.isSaved ? 'Unsave' : 'Save',
    icon: props.isSaved ? cdxIconBookmark : cdxIconBookmarkOutline,
  },
  { value: 'hide', label: 'Hide', icon: cdxIconEyeClosed },
])

watch(selection, (value) => {
  if (value === 'save') emit('toggle-save')
  if (value === 'hide') emit('hide', props.image.pageid)
  if (value !== null) selection.value = null
})

const thumbnailUrl = toRef(() => props.image.thumbnailUrl)
const { showThumbnailPending } = useThumbnailSlotReady(thumbnailUrl)

const aspectRatio = computed(() => `${props.image.width} / ${props.image.height}`)

const altText = computed(() => imageCardTitle(props.image))

const showAttribution = computed(() => imageHasAttribution(props.image))

const attributionText = computed(() => formatImageAttribution(props.image))

watch(
  showThumbnailPending,
  (pending) => {
    if (!pending && thumbnailUrl.value) emit('decoded')
  },
  { immediate: true },
)
</script>

<template>
  <div class="wikitab-search-image-card cdx-card cdx-card--is-link wikitab-surface--subtle">
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

      <a
        class="wikitab-search-image-card__link"
        :href="image.filePageUrl"
        target="_blank"
        rel="noreferrer"
        :aria-label="altText"
      />

      <figcaption v-if="showAttribution" class="wikitab-search-image-card__attribution">
        {{ attributionText }}
      </figcaption>
    </div>

    <div class="wikitab-search-image-card__menu">
      <div class="wikitab-search-image-card__menu-surface">
        <CdxMenuButton
          v-model:selected="selection"
          class="wikitab-search-image-card__menu-button"
          weight="quiet"
          :menu-items="menuItems"
          :menu-config="{ renderInPlace: true }"
          :aria-label="`${altText} options`"
          @click.stop
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Border, radius and hover come from .cdx-card. The photo fills the frame
 * edge to edge, so drop the card padding and base background.
 */
.wikitab-search-image-card {
  display: block;
  box-sizing: border-box;
  width: 100%;
  overflow: visible;
  padding: 0;
  background-color: transparent;
  border-radius: var(--border-radius-base);
  text-decoration: none;
}

.wikitab-search-image-card:has([aria-expanded='true']) {
  z-index: 2;
}

.wikitab-search-image-card__frame {
  position: relative;
  width: 100%;
  overflow: hidden;
  /*
   * Inset radius for flush media inside a bordered .cdx-card — outer corners use
   * --border-radius-base; padding-box corners sit one border-width inside that curve.
   */
  border-radius: calc(var(--border-radius-base) - var(--border-width-base));
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

.wikitab-search-image-card__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.wikitab-search-image-card__link:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base)
    var(--outline-color-progressive--focus);
  outline-offset: calc(var(--border-width-thick) * -1);
}

.wikitab-search-image-card__attribution {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 2;
  margin: 0;
  /* padding-block-start: var(--spacing-10); */
  padding-inline: var(--spacing-12) 0;
  /* background-image: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%); */
  /* Legibility over arbitrary photos — pure black, deliberately not a theme colour. */
  text-shadow: 0.5px 0.5px 0px rgba(0, 0, 0, 1);
  color: var(--color-inverted-fixed);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: 1.25;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  pointer-events: none;
}

.wikitab-search-image-card__menu {
  position: absolute;
  top: var(--spacing-35);
  inset-inline-end: var(--spacing-35);
  z-index: 3;
  opacity: 0;
  pointer-events: none;
}

.wikitab-search-image-card:hover .wikitab-search-image-card__menu,
.wikitab-search-image-card:focus-within .wikitab-search-image-card__menu,
.wikitab-search-image-card:has([aria-expanded='true']) .wikitab-search-image-card__menu {
  opacity: 1;
  pointer-events: auto;
}

.wikitab-search-image-card__menu-surface {
  display: flex;
  line-height: 0;
  background-color: var(--background-color-base);
  border-radius: var(--border-radius-base);
}

.wikitab-search-image-card__menu-button {
  line-height: 0;
}

.wikitab-search-image-card__menu-button :deep(.cdx-menu) {
  width: max-content !important;
  min-width: 0 !important;
}
</style>
