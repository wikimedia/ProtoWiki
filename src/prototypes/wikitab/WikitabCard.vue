<script setup lang="ts">
import { computed } from 'vue'
import { CdxCard, CdxIcon } from '@wikimedia/codex'
import type { WikitabCardData, WikitabCardVariant } from './sections'

const props = defineProps<{
  variant: WikitabCardVariant
  /** Fixed, so a placeholder and the card that replaces it are the same size. */
  height: number
  thumbnailSize: number
  card?: WikitabCardData
  supportingIcon?: string
  fullHook?: boolean
  loading?: boolean
}>()

const thumbnail = computed(() =>
  props.card?.thumbnailUrl ? { url: props.card.thumbnailUrl } : null,
)

const slotVars = computed(() => ({
  '--wikitab-thumbnail-size': `${props.thumbnailSize}px`,
}))

/** Placeholder: exact px height so the no-jump contract holds. */
const loadingStyle = computed(() => ({
  ...slotVars.value,
  height: `${props.height}px`,
}))

/** Real card: height comes from the grid row / flex line, not percentage sizing. */
const cardStyle = computed(() => ({
  ...slotVars.value,
  minHeight: `${props.height}px`,
}))

/*
 * Two loading modes, driven by section variant (see sections.ts):
 * - `thumbnail` (Trending): card shell + text paint as soon as feed data lands;
 *   only the thumbnail slot stays in a flat pending block until decode.
 * - `text` (On this day, Did you know, In the news): thumbnail is optional, so the whole
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

const cardUrl = computed(() => {
  if (props.variant === 'text' || props.loading) return undefined
  return props.card?.href
})

const showOverlayLink = computed(
  () => props.variant === 'text' && !!props.card?.href && !props.loading,
)

const cardThumbnail = computed(() => {
  if (props.loading && props.variant === 'thumbnail') return null
  if (!showThumbnail.value) return null
  return thumbnail.value
})

const forceThumbnail = computed(() => props.variant === 'thumbnail' || showThumbnail.value)
</script>

<template>
  <div v-if="showFullLoading" class="wikitab-card wikitab-card--loading" :style="loadingStyle" />
  <div
    v-else
    class="wikitab-card"
    :class="{
      'wikitab-card--full-hook': fullHook,
      'wikitab-card--clamped': !fullHook,
      'wikitab-card--thumbnail': variant === 'thumbnail',
      'wikitab-card--text': variant === 'text',
      'wikitab-card--thumbnail-pending': loading && variant === 'thumbnail',
    }"
    :style="cardStyle"
  >
    <!--
      Text variant only: card-wide link as an overlay rather than CdxCard `url`,
      because hooks and news stories carry nested inline anchors.
    -->
    <a
      v-if="showOverlayLink"
      class="wikitab-card__link"
      :href="card!.href"
      :aria-label="card!.linkTitle"
      target="_blank"
      rel="noreferrer"
    />

    <CdxCard
      class="wikitab-card__cdx"
      :url="cardUrl"
      :thumbnail="cardThumbnail"
      :force-thumbnail="forceThumbnail"
    >
      <template v-if="card?.title" #title>
        {{ card.title }}
      </template>
      <template v-if="variant === 'thumbnail' && card?.description" #description>
        {{ card.description }}
      </template>
      <template v-else-if="variant === 'text' && card?.html" #description>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="wikitab-card__hook" v-html="card.html" />
      </template>
      <template v-if="card?.supportingText" #supporting-text>
        <span class="wikitab-card__supporting">
          <CdxIcon v-if="supportingIcon" :icon="supportingIcon" size="x-small" />
          {{ card.supportingText }}
        </span>
      </template>
    </CdxCard>
  </div>
</template>

<style scoped>
.wikitab-card {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
}

.wikitab-card__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/*
 * Text cards omit CdxCard `url` (hooks carry nested anchors), so Codex never
 * adds `.cdx-card--is-link`. Drive hover/active border from the wrapper so
 * nested inline links still show the interactive border.
 */
.wikitab-card--text :deep(.cdx-card) {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.1s;
}

.wikitab-card--text:hover :deep(.cdx-card) {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikitab-card--text:active :deep(.cdx-card) {
  border-color: var(--border-color-interactive--active, #202122);
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

/*
 * CdxCard root is the .cdx-card element (flex row). Do not override display —
 * a block override breaks thumbnail + text alignment and lets content spill
 * past the fixed-height slot.
 */
/*
 * In-flow so the flex/grid line can measure content height, then stretch every
 * slot in the row to the tallest. flex: 1 + height 100% fills the stretched slot.
 */
.wikitab-card__cdx {
  flex: 1 1 auto;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.wikitab-card--full-hook {
  overflow: visible;
}

.wikitab-card--full-hook .wikitab-card__cdx {
  overflow: visible;
}

/*
 * Codex 2.6.x CdxCard has no thumbnailSize prop — large (96px) thumbnails are
 * set via layout CSS only, keyed off sections.ts thumbnailSize.
 */
.wikitab-card :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  flex-shrink: 0;
}

.wikitab-card :deep(.cdx-card__thumbnail .cdx-thumbnail__placeholder),
.wikitab-card :deep(.cdx-card__thumbnail .cdx-thumbnail__image) {
  width: var(--wikitab-thumbnail-size);
  min-width: var(--wikitab-thumbnail-size);
  height: var(--wikitab-thumbnail-size);
  min-height: var(--wikitab-thumbnail-size);
}

/* Text cards place the thumbnail after the hook (Codex DYK pattern). */
.wikitab-card--text :deep(.cdx-card__text) {
  order: 0;
  flex: 1;
  min-width: 0;
}

.wikitab-card--text :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  order: 1;
  margin-right: 0;
  margin-left: var(--spacing-50);
}

.wikitab-card--clamped :deep(.cdx-card__text) {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.wikitab-card--clamped.wikitab-card--thumbnail :deep(.cdx-card__text__supporting-text) {
  flex-shrink: 0;
}

/* Thumbnail-slot loading: flat neutral block, no Codex image icon. */
.wikitab-card--thumbnail-pending :deep(.cdx-card__thumbnail .cdx-thumbnail__placeholder) {
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-card--thumbnail-pending :deep(.cdx-card__thumbnail .cdx-icon) {
  display: none;
}

.wikitab-card__supporting {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
}

/*
 * Clamping keeps the fixed height honest. Layout only — typography comes from
 * Codex's card text styles.
 */
.wikitab-card--clamped.wikitab-card--thumbnail :deep(.cdx-card__text__title),
.wikitab-card--clamped.wikitab-card--thumbnail :deep(.cdx-card__text__description) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.wikitab-card--clamped.wikitab-card--text :deep(.cdx-card__text__description) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.wikitab-card__hook {
  display: block;
}

/* Above the card-wide overlay, so an inline link still wins the click. */
.wikitab-card__hook :deep(a) {
  position: relative;
  z-index: 2;
}

/* Feed cards keep progressive link colour even after the URL is visited. */
.wikitab-card :deep(a:visited) {
  color: var(--color-progressive);
}

.wikitab-card :deep(a:visited:hover) {
  color: var(--color-progressive--hover);
}
</style>
