<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxCard, CdxIcon, CdxMenuButton } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkOutline,
  cdxIconEllipsis,
  cdxIconEyeClosed,
} from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'
import { useSkin } from '@/composables/useSkin'
import type { WikitabCardData, WikitabCardVariant } from './sections'

const props = defineProps<{
  variant: WikitabCardVariant
  /** Fixed, so a placeholder and the card that replaces it are the same size. */
  height: number
  thumbnailSize: number
  card?: WikitabCardData
  supportingIcon?: Icon
  /** Inline glyph before a text-variant html hook (saved Snippets). */
  hookLeadingIcon?: Icon
  fullHook?: boolean
  loading?: boolean
  showArticleMenu?: boolean
  isSaved?: boolean
  /** When set, adds a "Hide from {heading}" row (feed sections, including discussions). */
  hideMenuSectionHeading?: string
  /** Suggested-edits task row — progressive colour + bold label. */
  supportingProgressive?: boolean
}>()

const emit = defineEmits<{
  'hide-article': [title: string]
  'toggle-save': []
}>()

const selection = ref<string | number | null>(null)

const articleTitle = computed(() => props.card?.linkTitle ?? props.card?.title ?? '')

const menuItems = computed(() => {
  const items: Array<{ value: string; label: string; icon: Icon }> = []
  if (props.showArticleMenu) {
    items.push({
      value: 'save',
      label: props.isSaved ? 'Unsave' : 'Save',
      icon: props.isSaved ? cdxIconBookmark : cdxIconBookmarkOutline,
    })
  }
  if (props.hideMenuSectionHeading) {
    items.push({
      value: 'hide',
      label: `Hide from ${props.hideMenuSectionHeading}`,
      icon: cdxIconEyeClosed,
    })
  }
  return items
})

watch(selection, (value) => {
  if (value === 'save') emit('toggle-save')
  if (value === 'hide' && articleTitle.value) emit('hide-article', articleTitle.value)
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

const skin = useSkin()

const showCardMenu = computed(
  () => !!(props.card && (props.showArticleMenu || props.hideMenuSectionHeading)),
)

/** Desktop: all cards. Mobile: only text cards with an inline-end thumbnail. */
const menuRevealOnInteraction = computed(() => {
  if (!showCardMenu.value) return false
  if (skin.value === 'desktop') return true
  return props.variant === 'text' && showThumbnail.value
})

const showOverlayLink = computed(() => {
  if (props.loading || !props.card?.href) return false
  if (props.variant === 'text') return true
  return showCardMenu.value && props.variant === 'thumbnail'
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
      'wikitab-card--has-menu': showCardMenu,
      'wikitab-card--menu-on-hover': menuRevealOnInteraction,
      'wikitab-card--progressive-supporting': supportingProgressive,
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

    <div v-if="showCardMenu" class="wikitab-card__menu">
      <div class="wikitab-card__menu-surface">
        <CdxMenuButton
          v-model:selected="selection"
          class="wikitab-card__menu-button"
          weight="quiet"
          :menu-items="menuItems"
          :menu-config="{ renderInPlace: true }"
          :aria-label="`${articleTitle} options`"
          @click.stop
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </div>
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
        <span class="wikitab-card__hook">
          <CdxIcon
            v-if="hookLeadingIcon"
            class="wikitab-card__hook-icon"
            :icon="hookLeadingIcon"
            size="x-small"
          />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="wikitab-card__hook-text" v-html="card.html" />
        </span>
      </template>
      <template v-else-if="variant === 'text' && card?.description" #description>
        {{ card.description }}
      </template>
      <template v-if="card?.supportingSignals?.length || card?.supportingTextEnd" #supporting-text>
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
              <span class="wikitab-card__supporting-label">{{ signal.text }}</span>
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
          <span class="wikitab-card__supporting-label">{{ card.supportingText }}</span>
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
 * Text cards omit CdxCard `url` (hooks carry nested anchors), and thumbnail
 * cards with a menu use the overlay link instead — so Codex never adds
 * `.cdx-card--is-link`, and the overlay sits above the card anyway. Drive
 * hover/active from the wrapper through the --wikitab-card-* aliases in
 * wikitab-surface.css, which mirror CdxCard on stock and patched Codex.
 */
.wikitab-card--text :deep(.cdx-card),
.wikitab-card--thumbnail.wikitab-card--has-menu :deep(.cdx-card) {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: var(--wikitab-card-transition-duration);
}

/* ⋯ hover / press / open — card shell stays at rest. */
.wikitab-card--text:hover:not(:has(.wikitab-card__menu:hover)):not(:has(.wikitab-card__menu:focus-within)):not(
    :has(.wikitab-card__menu [aria-expanded='true'])
  )
  :deep(.cdx-card),
.wikitab-card--thumbnail.wikitab-card--has-menu:hover:not(:has(.wikitab-card__menu:hover)):not(
    :has(.wikitab-card__menu:focus-within)
  ):not(:has(.wikitab-card__menu [aria-expanded='true']))
  :deep(.cdx-card) {
  border-color: var(--wikitab-card-border-color--hover);
  box-shadow: var(--wikitab-card-box-shadow--hover);
}

.wikitab-card--text:active:not(:has(.wikitab-card__menu :active)):not(:has(.wikitab-card__menu:focus-within))
  :deep(.cdx-card),
.wikitab-card--thumbnail.wikitab-card--has-menu:active:not(:has(.wikitab-card__menu :active)):not(
    :has(.wikitab-card__menu:focus-within)
  )
  :deep(.cdx-card) {
  border-color: var(--wikitab-card-border-color--active);
  box-shadow: var(--wikitab-card-box-shadow--active);
}

.wikitab-card--has-menu {
  overflow: visible;
  z-index: 0;
}

.wikitab-card--has-menu:has([aria-expanded='true']) {
  z-index: 3;
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

/*
 * Quiet MenuButton is a 32×32 hit target, inset from the card corner — reserve
 * that width so titles truncate before reaching the ⋯.
 */
.wikitab-card--has-menu {
  --wikitab-card-menu-reserve: calc(2rem + var(--spacing-75));
}

.wikitab-card--has-menu :deep(.cdx-card__text__title) {
  box-sizing: border-box;
  padding-inline-end: var(--wikitab-card-menu-reserve);
  overflow: hidden;
}

.wikitab-card--has-menu:not(.wikitab-card--clamped) :deep(.cdx-card__text__title) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

/*
 * Quiet icon button — 32×32 hit target, tucked to the card corner (Figma).
 * Above hook inline links (z-index: 2) so the dropdown is never covered.
 */
.wikitab-card__menu {
  position: absolute;
  top: var(--spacing-35);
  inset-inline-end: var(--spacing-35);
  z-index: 3;
}

/*
 * Hide the menu until the card is hovered or focused. Desktop: every card.
 * Mobile: text cards with an inline-end thumbnail only (menu sits on the image).
 */
.wikitab-card--menu-on-hover .wikitab-card__menu {
  opacity: 0;
  pointer-events: none;
}

.wikitab-card--menu-on-hover:hover .wikitab-card__menu,
.wikitab-card--menu-on-hover:focus-within .wikitab-card__menu,
.wikitab-card--menu-on-hover:has([aria-expanded='true']) .wikitab-card__menu {
  opacity: 1;
  pointer-events: auto;
}

/* Opaque card surface behind the quiet button — keeps Codex hover on the button. */
.wikitab-card__menu-surface {
  display: flex;
  line-height: 0;
  background-color: var(--background-color-base);
  border-radius: var(--border-radius-base);
}

/* Collapse the inline-flex button strut (Codex MenuButton is 33px otherwise). */
.wikitab-card__menu-button {
  line-height: 0;
}

/* MenuButton sizes to available width by default; shrink to label + icon. */
.wikitab-card__menu-button :deep(.cdx-menu) {
  width: max-content !important;
  min-width: 0 !important;
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
 * Thumbnail size is layout CSS only, keyed off sections.ts thumbnailSize — never
 * CdxCard's thumbnailSize prop (absent in stock 2.7, removed by the card patch).
 */
.wikitab-card :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  flex-shrink: 0;
  align-self: flex-start;
  width: var(--wikitab-thumbnail-size);
  height: var(--wikitab-thumbnail-size);
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
  align-items: baseline;
  gap: var(--spacing-25);
}

.wikitab-card__supporting--split {
  box-sizing: border-box;
  width: 100%;
  justify-content: space-between;
}

.wikitab-card__supporting-start {
  display: inline-flex;
  align-items: baseline;
  gap: var(--spacing-100);
  min-width: 0;
}

.wikitab-card__supporting-end {
  flex-shrink: 0;
}

.wikitab-card__supporting-signal {
  display: inline-flex;
  align-items: baseline;
  gap: var(--spacing-25);
}

.wikitab-card__supporting :deep(.cdx-icon) {
  flex-shrink: 0;
  /*
   * x-small icons sit on the small-text baseline — a hair above the SVG box
   * bottom so they optically match the label cap height.
   */
  translate: 0 0.0625em;
}

/* Suggested-edits task label — matches Contribute tab (progressive + bold). */
.wikitab-card--progressive-supporting .wikitab-card__supporting-label {
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive);
}

.wikitab-card--progressive-supporting .wikitab-card__supporting-signal :deep(.cdx-icon) {
  color: var(--color-progressive);
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

/* Saved image cards — caption-only (no title slot), same depth as text cards. */
.wikitab-card--clamped.wikitab-card--thumbnail
  :deep(.cdx-card__text__title:empty + .cdx-card__text__description) {
  -webkit-line-clamp: 4;
  line-clamp: 4;
}

.wikitab-card--clamped.wikitab-card--text :deep(.cdx-card__text__description) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.wikitab-card__hook {
  display: inline;
  min-width: 0;
}

/* Layout only — color from Codex .cdx-card__text__description .cdx-icon (same as supporting). */
.wikitab-card__hook-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  vertical-align: -0.125em;
  width: 1.125em;
  height: 1.125em;
  margin-inline-end: var(--spacing-25);
  line-height: 1;
}

.wikitab-card__hook-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.wikitab-card__hook-text {
  display: inline;
  min-width: 0;
}

/* Above the card-wide overlay, so an inline link still wins the click. */
.wikitab-card__hook-text :deep(a) {
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
