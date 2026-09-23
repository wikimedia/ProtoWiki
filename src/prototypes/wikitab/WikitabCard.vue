<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxCard, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import { cdxIconEllipsis, cdxIconEyeClosed } from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'
import type { WikitabCardData, WikitabCardVariant } from './sections'

const props = defineProps<{
  variant: WikitabCardVariant
  /** Fixed, so a placeholder and the card that replaces it are the same size. */
  height: number
  thumbnailSize: number
  card?: WikitabCardData
  supportingIcon?: Icon
  fullHook?: boolean
  loading?: boolean
  showHideMenu?: boolean
}>()

const emit = defineEmits<{
  'hide-article': [title: string]
}>()

const selection = ref<string | number | null>(null)

const hideMenuItems = [{ value: 'hide', label: 'Hide from Trending', icon: cdxIconEyeClosed }]

const hideArticleTitle = computed(() => props.card?.linkTitle ?? props.card?.title ?? '')

watch(selection, (value) => {
  if (value === 'hide' && hideArticleTitle.value) {
    emit('hide-article', hideArticleTitle.value)
  }
  if (value !== null) selection.value = null
})

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

const showOverlayLink = computed(() => {
  if (props.loading || !props.card?.href) return false
  if (props.variant === 'text') return true
  return props.showHideMenu === true && props.variant === 'thumbnail'
})

const cardUrl = computed(() => {
  if (props.loading || showOverlayLink.value) return undefined
  return props.card?.href
})

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
      'wikitab-card--has-menu': showHideMenu && card,
    }"
    :style="cardStyle"
  >
    <!--
      Card-wide overlay link when CdxCard `url` is omitted — text hooks with nested
      anchors, or thumbnail cards that expose an in-title menu button.
    -->
    <a
      v-if="showOverlayLink"
      class="wikitab-card__link"
      :href="card!.href"
      :aria-label="card!.linkTitle"
      target="_blank"
      rel="noreferrer"
    />

    <div v-if="showHideMenu && card" class="wikitab-card__menu">
      <CdxMenuButton
        v-model:selected="selection"
        class="wikitab-card__menu-button"
        weight="quiet"
        :menu-items="hideMenuItems"
        :menu-config="{ renderInPlace: true }"
        :aria-label="`${hideArticleTitle} options`"
        @click.stop
      >
        <CdxIcon :icon="cdxIconEllipsis" />
      </CdxMenuButton>
    </div>

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
      <template v-else-if="variant === 'text' && card?.description" #description>
        {{ card.description }}
      </template>
      <template v-if="card?.supportingSignals?.length" #supporting-text>
        <span
          class="wikitab-card__supporting"
          :class="{ 'wikitab-card__supporting--split': card.supportingTextEnd }"
        >
          <span class="wikitab-card__supporting-start">
            <span
              v-for="(signal, index) in card.supportingSignals"
              :key="index"
              class="wikitab-card__supporting-signal"
            >
              <CdxIcon :icon="signal.icon" size="x-small" />
              {{ signal.text }}
            </span>
          </span>
          <span v-if="card.supportingTextEnd" class="wikitab-card__supporting-end">
            {{ card.supportingTextEnd }}
          </span>
        </span>
      </template>
      <template v-else-if="card?.supportingText" #supporting-text>
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

/* Thumbnail cards with a menu use the overlay link instead of CdxCard `url`. */
.wikitab-card--thumbnail.wikitab-card--has-menu :deep(.cdx-card) {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.1s;
}

.wikitab-card--thumbnail.wikitab-card--has-menu:hover :deep(.cdx-card) {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikitab-card--thumbnail.wikitab-card--has-menu:active :deep(.cdx-card) {
  border-color: var(--border-color-interactive--active, #202122);
}

.wikitab-card--has-menu {
  overflow: visible;
  z-index: 0;
}

.wikitab-card--has-menu:has([aria-expanded='true']) {
  z-index: 2;
}

.wikitab-card--has-menu .wikitab-card__cdx {
  overflow: visible;
}

.wikitab-card--has-menu :deep(.cdx-card) {
  overflow: visible;
}

.wikitab-card--has-menu :deep(.cdx-card__text) {
  overflow: hidden;
  min-height: 0;
}

.wikitab-card--has-menu :deep(.cdx-card__text__title) {
  padding-inline-end: var(--spacing-200);
}

/* Quiet icon button — 32×32 hit target, tucked to the card corner (Figma). */
.wikitab-card__menu {
  position: absolute;
  top: var(--spacing-35);
  inset-inline-end: var(--spacing-35);
  z-index: 2;
}

/*
 * Desktop: hide the menu until the card is hovered. Keep it visible while the
 * menu is open or the button has keyboard focus; mobile always shows it.
 */
[data-skin='desktop'] .wikitab-card--has-menu .wikitab-card__menu {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s;
}

[data-skin='desktop'] .wikitab-card--has-menu:hover .wikitab-card__menu,
[data-skin='desktop'] .wikitab-card--has-menu:focus-within .wikitab-card__menu,
[data-skin='desktop'] .wikitab-card--has-menu:has([aria-expanded='true']) .wikitab-card__menu {
  opacity: 1;
  pointer-events: auto;
}

.wikitab-card__menu-button :deep(.cdx-icon) {
  color: var(--color-neutral);
}

/* MenuButton sizes to available width by default; shrink to label + icon. */
.wikitab-card__menu-button :deep(.cdx-menu) {
  width: max-content !important;
  min-width: 0 !important;
}

.wikitab-card__menu-button :deep(.cdx-menu-item__text) {
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
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
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
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
/*
 * class merges onto the CdxCard root (.cdx-card) — not a wrapper around it.
 * Fill the equalized slot and stretch the text column so supporting text can
 * pin to the bottom inner edge of the bordered card.
 */
.wikitab-card__cdx {
  flex: 1 1 auto;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  height: 100%;
  align-items: stretch;
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

/* Placeholder thumbnails stay Codex neutral grey, not the page color theme. */
.wikitab-card :deep(.cdx-card__thumbnail .cdx-thumbnail__placeholder) {
  background-color: var(--background-color-neutral-subtle);
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

/*
 * CdxCard always renders `.cdx-card__text__title` even when the slot is omitted
 * (In the news, Did you know, On this day). Hide the empty strut and drop the
 * description's 4px top margin that only applies below a title.
 */
.wikitab-card :deep(.cdx-card__text__title:empty) {
  display: none;
}

.wikitab-card :deep(.cdx-card__text__title:empty + .cdx-card__text__description) {
  margin-top: 0;
}

/*
 * Pin supporting text to the card bottom while keeping Codex spacing: 8px above
 * the supporting row (margin-top on the slot) and 12px card padding below it.
 * margin-top: auto would swallow the 8px and sit flush on the content edge.
 */
.wikitab-card :deep(.cdx-card__text:has(.cdx-card__text__supporting-text)::after) {
  content: '';
  display: block;
  flex: 1 1 auto;
  min-height: 0;
  order: 10;
}

.wikitab-card :deep(.cdx-card__text__supporting-text) {
  width: 100%;
  order: 11;
}

.wikitab-card__supporting {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
}

.wikitab-card__supporting--split {
  box-sizing: border-box;
  width: 100%;
  justify-content: space-between;
}

.wikitab-card__supporting-start {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
}

.wikitab-card__supporting-end {
  flex-shrink: 0;
}

.wikitab-card__supporting-signal {
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
