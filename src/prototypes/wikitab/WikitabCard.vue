<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon, CdxThumbnail } from '@wikimedia/codex'
import type { WikitabCardData, WikitabCardVariant } from './sections'

const props = defineProps<{
  variant: WikitabCardVariant
  /** Fixed, so a placeholder and the card that replaces it are the same size. */
  height: number
  thumbnailSize: number
  card?: WikitabCardData
  supportingIcon?: string
  loading?: boolean
}>()

const thumbnail = computed(() =>
  props.card?.thumbnailUrl ? { url: props.card.thumbnailUrl } : null,
)

const cardStyle = computed(() => ({
  height: `${props.height}px`,
  '--wikitab-thumbnail-size': `${props.thumbnailSize}px`,
}))

/*
 * A full-height thumbnail needs the card's padding to match it, whereas a small
 * one sits beside text that should use the height instead.
 */
const roomy = computed(() => props.thumbnailSize >= 96)

/*
 * Two loading modes, driven by section variant (see sections.ts):
 * - `thumbnail` (Trending): card shell + text paint as soon as feed data lands;
 *   only the thumbnail slot stays in a flat pending block until decode.
 * - `text` (Did you know, In the news): thumbnail is optional, so the whole
 *   slot stays a full-card skeleton until the page is ready — no empty thumbnail
 *   column while DYK summaries resolve or while a missing thumbnail is ruled out.
 */
const showFullLoading = computed(
  () => props.loading && (props.variant === 'text' || !props.card),
)

const showThumbnail = computed(() => {
  if (props.variant === 'thumbnail') return true
  return !!props.card?.thumbnailUrl
})
</script>

<template>
  <div v-if="showFullLoading" class="wikitab-card wikitab-card--loading" :style="cardStyle" />
  <div
    v-else
    class="wikitab-card"
    :class="[
      `wikitab-card--${variant}`,
      {
        'wikitab-card--linked': card?.href && !loading,
        'wikitab-card--roomy': roomy,
      },
    ]"
    :style="cardStyle"
  >
    <!--
      A card-wide link as an overlay rather than an ancestor: an anchor cannot
      legally contain another one, and hooks and news stories carry their own
      inline links. The overlay sits under those links in the stacking order, so
      clicking the text follows the inner link and clicking anywhere else follows
      the card.
    -->
    <a
      v-if="card?.href && !loading"
      class="wikitab-card__link"
      :href="card.href"
      :aria-label="card.linkTitle"
      target="_blank"
      rel="noreferrer"
    />

    <template v-if="variant === 'thumbnail'">
      <div
        v-if="loading"
        class="wikitab-card__thumbnail wikitab-card__thumbnail--pending"
        aria-hidden="true"
      />
      <CdxThumbnail v-else class="wikitab-card__thumbnail" :thumbnail="thumbnail" />
      <div class="wikitab-card__body">
        <p class="wikitab-card__title">{{ card?.title }}</p>
        <p v-if="card?.description" class="wikitab-card__description">
          {{ card.description }}
        </p>
        <p v-if="card?.supportingText" class="wikitab-card__supporting">
          <CdxIcon v-if="supportingIcon" :icon="supportingIcon" size="x-small" />
          <span>{{ card.supportingText }}</span>
        </p>
      </div>
    </template>

    <template v-else>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="wikitab-card__hook" v-html="card?.html" />
      <div
        v-if="loading && showThumbnail"
        class="wikitab-card__thumbnail wikitab-card__thumbnail--pending"
        aria-hidden="true"
      />
      <CdxThumbnail
        v-else-if="showThumbnail"
        class="wikitab-card__thumbnail"
        :thumbnail="thumbnail"
      />
    </template>
  </div>
</template>

<style scoped>
.wikitab-card {
  position: relative;
  display: flex;
  box-sizing: border-box;
  gap: var(--spacing-50);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  text-decoration: none;
  color: var(--color-base);
  overflow: hidden;
}

.wikitab-card--linked:hover {
  border-color: var(--border-color-base);
}

.wikitab-card__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* Drawn inside the card, which clips its overflow. */
.wikitab-card__link:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base)
    var(--outline-color-progressive--focus);
  outline-offset: calc(var(--border-width-thick) * -1);
}

/*
 * The reserved slot: a flat block at the exact height of the card that replaces
 * it, with no border, so nothing moves when the data lands.
 */
.wikitab-card--loading {
  border: 0;
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-card--thumbnail {
  padding: var(--spacing-75);
}

.wikitab-card--text {
  align-items: flex-start;
  padding: var(--spacing-25) var(--spacing-50);
}

.wikitab-card--text.wikitab-card--roomy {
  padding: var(--spacing-75);
}

.wikitab-card__thumbnail {
  flex-shrink: 0;
  /* Codex spaces thumbnails with a margin; this layout uses flex gap instead. */
  margin-right: 0;
}

/* Figma loading state: flat neutral block, no Codex image icon. */
.wikitab-card__thumbnail--pending {
  width: var(--wikitab-thumbnail-size);
  min-width: var(--wikitab-thumbnail-size);
  height: var(--wikitab-thumbnail-size);
  min-height: var(--wikitab-thumbnail-size);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-neutral-subtle);
}

/* Codex fixes thumbnails at 40px, including a min, so both have to be reset. */
.wikitab-card__thumbnail :deep(.cdx-thumbnail__placeholder),
.wikitab-card__thumbnail :deep(.cdx-thumbnail__image) {
  width: var(--wikitab-thumbnail-size);
  min-width: var(--wikitab-thumbnail-size);
  height: var(--wikitab-thumbnail-size);
  min-height: var(--wikitab-thumbnail-size);
}

.wikitab-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-12);
  min-width: 0;
  overflow: hidden;
}

.wikitab-card__title,
.wikitab-card__description,
.wikitab-card__supporting,
.wikitab-card__hook {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.wikitab-card__title {
  font-weight: var(--font-weight-bold);
}

.wikitab-card__description {
  color: var(--color-subtle);
}

/*
 * Clamping is what keeps the fixed height honest: long titles and descriptions
 * cannot grow the card. The supporting row never shrinks, so an unusually long
 * title costs the description a line rather than overflowing.
 */
.wikitab-card__title,
.wikitab-card__description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.wikitab-card__supporting {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  flex-shrink: 0;
  color: var(--color-subtle);
}

.wikitab-card__hook {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* Above the card-wide overlay, so an inline link still wins the click. */
.wikitab-card__hook :deep(a) {
  position: relative;
  z-index: 2;
  color: var(--color-progressive);
  text-decoration: none;
}

.wikitab-card__hook :deep(a:hover) {
  text-decoration: underline;
}
</style>
