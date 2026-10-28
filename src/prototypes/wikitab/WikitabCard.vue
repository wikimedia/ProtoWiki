<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { CdxCard, CdxIcon, CdxInfoChip, CdxMenuButton } from '@wikimedia/codex'
import { cdxIconEllipsis } from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'
import { useSkin } from '@/composables/useSkin'
import type {
  WikitabCardChip,
  WikitabCardData,
  WikitabCardDescriptionFormat,
  WikitabCardLoading,
  WikitabCardMenuItem,
  WikitabCardThumbnail,
  WikitabCardThumbnailLayout,
  WikitabCardThumbnailSizePx,
} from './sections'
import {
  WIKITAB_CARD_THUMBNAIL_SIZE_DEFAULT,
  resolveWikitabCardLoading,
  wikitabCardIsLoading,
} from './data/wikitabCardPresentation'
import { useThumbnailSlotReady } from './useThumbnailSlotReady'
import {
  wikitabCardMenuArticleTitle,
  wikitabCardWideLinkAriaLabel,
} from './data/wikitabCardLinkLabel'
import { WIKITAB_SUPPORTING_ICON_TEXT_LEADING } from './data/wikitabSupportingIconText'

const props = withDefaults(
  defineProps<{
  descriptionFormat: WikitabCardDescriptionFormat
  descriptionLineClamp?: 2 | 4
  titleLineClamp?: 1 | 2 | 4
  thumbnailType: WikitabCardThumbnail
  /** Loading placeholder only — exact px height for the no-jump contract (`wikitabCardSlotHeights.ts`). */
  loadingHeight?: number
  thumbnailSize?: WikitabCardThumbnailSizePx
  /** `block-start` — Codex portrait card: full-width thumbnail above text. */
  thumbnailLayout?: WikitabCardThumbnailLayout
  card?: WikitabCardData
  supportingIcon?: Icon
  /** Codex Card `icon` prop (word / quote when no thumbnail column). */
  icon?: Icon
  /** `true` — whole-card skeleton. `{ description: true }` — only those fields skeleton. */
  loading?: WikitabCardLoading
  /** Full-width info chips rendered above the CdxCard row (not in `#title`). */
  chips?: WikitabCardChip[]
  /** Overflow ⋯ menu items (`value` `save` / `hide` still emit legacy events). */
  menu?: WikitabCardMenuItem[]
  }>(),
  {
    thumbnailSize: WIKITAB_CARD_THUMBNAIL_SIZE_DEFAULT,
    thumbnailLayout: 'inline-start',
  },
)

const emit = defineEmits<{
  'hide-article': [title: string]
  'toggle-save': []
  'menu-select': [value: string]
}>()

const selection = ref<string | number | null>(null)

const articleTitle = computed(() => wikitabCardMenuArticleTitle(props.card))
const wideLinkAriaLabel = computed(() =>
  props.card ? wikitabCardWideLinkAriaLabel(props.card) : '',
)

const menuItems = computed((): WikitabCardMenuItem[] => props.menu ?? [])

watch(selection, (value) => {
  if (value === null) return
  if (value === 'save') emit('toggle-save')
  if (value === 'hide' && articleTitle.value) emit('hide-article', articleTitle.value)
  emit('menu-select', String(value))
  selection.value = null
})

const thumbnail = computed(() =>
  props.card?.thumbnailUrl ? { url: props.card.thumbnailUrl } : null,
)

const slotVars = computed(() => ({
  '--wikitab-thumbnail-size': `${props.thumbnailSize}px`,
  '--wikitab-block-start-thumb-aspect': '4 / 3',
}))

/** Placeholder floor for the no-jump contract; row stretch sets definite height on the slot. */
const loadingStyle = computed(() => ({
  ...slotVars.value,
  ...(props.loadingHeight != null ? { minHeight: `${props.loadingHeight}px` } : {}),
}))

/** Resolved cards hug content; row stretch is applied on the section slot (`useEqualRowHeights`). */
const cardStyle = computed(() => slotVars.value)

const loadingFlags = computed(() => resolveWikitabCardLoading(props.loading))
const isLoading = computed(() => wikitabCardIsLoading(props.loading))

const thumbnailUrl = toRef(() => props.card?.thumbnailUrl)
const { showThumbnailPending, thumbnailFailed } = useThumbnailSlotReady(thumbnailUrl)

/*
 * An optional thumbnail column that might still appear would reflow the text,
 * so the whole card waits until it is known whether there is an image.
 */
const showFullLoading = computed(() => {
  const flags = loadingFlags.value
  if (flags.all) return true
  if (!isLoading.value) return false
  if (!props.card) return true
  return flags.thumbnail && props.thumbnailType === 'optional' && !props.card.thumbnailUrl
})

/** Thumbnail column is a flat skeleton while its URL is pending or the image is decoding. */
const thumbnailLoading = computed(
  () => loadingFlags.value.thumbnail || showThumbnailPending.value,
)

/*
 * CdxThumbnail preloads its URL again and only swaps in the image on its own async
 * `onload`, so its stock placeholder (icon + border) would flash for at least a frame.
 * Keep the skeleton look on that placeholder unless the image actually failed.
 */
const thumbnailSkeletonStyle = computed(
  () => thumbnailLoading.value || (!!props.card?.thumbnailUrl && !thumbnailFailed.value),
)

const hasSupportingEnd = computed(
  () => !!props.card?.supportingTextEnd || loadingFlags.value.supportingEnd,
)

const showThumbnail = computed(() => {
  switch (props.thumbnailType) {
    case 'none':
      return false
    case 'force':
      return true
    case 'optional':
      return !!props.card?.thumbnailUrl
    default:
      return false
  }
})

const skin = useSkin()

const showCardMenu = computed(
  () => !!(props.card && menuItems.value.length > 0 && !loadingFlags.value.title),
)

const hasChips = computed(
  () => loadingFlags.value.chips || (props.chips?.length ?? 0) > 0,
)

/** Desktop: all cards. Mobile: cards with an optional inline-end thumbnail. */
const menuRevealOnInteraction = computed(() => {
  if (!showCardMenu.value) return false
  if (skin.value === 'desktop') return true
  return showThumbnail.value
})

/** Card-wide navigation — overlay so `#description` html can include nested anchors. */
const showOverlayLink = computed(
  () => !loadingFlags.value.title && Boolean(props.card?.url),
)

const cardThumbnail = computed(() => {
  if (thumbnailLoading.value) return null
  if (!showThumbnail.value) return null
  return thumbnail.value
})

const forceThumbnail = computed(
  () => props.thumbnailType === 'force' || showThumbnail.value,
)

/** Stock CdxCard leading icon — omitted when a thumbnail column is shown. */
const cdxCardIcon = computed(() =>
  props.icon && !showThumbnail.value ? props.icon : undefined,
)

const textIsClamped = computed(
  () =>
    props.titleLineClamp === 1 ||
    props.titleLineClamp === 2 ||
    props.titleLineClamp === 4 ||
    props.descriptionLineClamp === 2 ||
    props.descriptionLineClamp === 4,
)
</script>

<template>
  <div
    v-if="showFullLoading"
    class="wikitab-card wikitab-card--loading"
    :style="loadingStyle"
    aria-busy="true"
  />
  <div
    v-else
    class="wikitab-card"
    :aria-busy="isLoading || undefined"
    :class="{
      'wikitab-card--full-hook': !textIsClamped,
      'wikitab-card--clamped': textIsClamped,
      'wikitab-card--clamp-title-1': titleLineClamp === 1,
      'wikitab-card--clamp-title-2': titleLineClamp === 2,
      'wikitab-card--clamp-title-4': titleLineClamp === 4,
      'wikitab-card--clamp-desc-2': descriptionLineClamp === 2,
      'wikitab-card--clamp-desc-4': descriptionLineClamp === 4,
      'wikitab-card--link-overlay': showOverlayLink,
      'wikitab-card--thumbnail-slot-loading': thumbnailSkeletonStyle,
      'wikitab-card--has-menu': showCardMenu,
      'wikitab-card--menu-on-hover': menuRevealOnInteraction,
      'wikitab-card--block-start': thumbnailLayout === 'block-start',
      'wikitab-card--inline-start': thumbnailLayout === 'inline-start',
      'wikitab-card--inline-end': thumbnailLayout === 'inline-end',
      'wikitab-card--has-chips': hasChips,
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
      :href="card!.url"
      :aria-label="wideLinkAriaLabel"
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

    <div
      class="wikitab-card__body"
      :class="{ 'wikitab-card__shell cdx-card': hasChips }"
    >
      <div v-if="hasChips" class="wikitab-card__chips-row">
        <span v-if="loadingFlags.chips" class="wikitab-card__chips" aria-hidden="true">
          <span class="wikitab-card__skeleton-chip" />
        </span>
        <span v-else class="wikitab-card__chips">
          <CdxInfoChip
            v-for="(chip, index) in chips"
            :key="`${chip.text}-${index}`"
            class="wikitab-card__chip"
            :status="chip.type"
            :icon="chip.icon"
          >
            {{ chip.text }}
          </CdxInfoChip>
        </span>
      </div>

      <CdxCard
        class="wikitab-card__cdx"
        :icon="cdxCardIcon"
        :thumbnail="cardThumbnail"
        :force-thumbnail="forceThumbnail"
        :separation="hasChips ? 'none' : 'outline'"
        :thumbnail-position="
          thumbnailLayout === 'block-start'
            ? 'block-start'
            : thumbnailLayout === 'inline-end'
              ? 'inline-end'
              : 'inline-start'
        "
      >
      <template v-if="loadingFlags.title" #title>
        <span class="wikitab-card__skeleton" aria-hidden="true">
          <span class="wikitab-card__skeleton-line" />
        </span>
      </template>
      <template v-else-if="card?.title" #title>
        <span class="wikitab-card__title-text">{{ card.title }}</span>
      </template>
      <template v-if="loadingFlags.description" #description>
        <span class="wikitab-card__skeleton" aria-hidden="true">
          <span v-for="line in 2" :key="line" class="wikitab-card__skeleton-line" />
        </span>
      </template>
      <template v-else-if="descriptionFormat === 'plain' && card?.description" #description>
        <p class="wikitab-card__description-plain">{{ card.description }}</p>
      </template>
      <template v-else-if="descriptionFormat === 'html' && card?.description" #description>
        <span class="wikitab-card__hook">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="wikitab-card__hook-text" v-html="card.description" />
        </span>
      </template>
      <template v-if="loadingFlags.supporting" #supporting-text>
        <span class="wikitab-card__skeleton wikitab-card__skeleton--supporting" aria-hidden="true">
          <span class="wikitab-card__skeleton-line" />
        </span>
      </template>
      <template v-else-if="card?.supportingHtml" #supporting-text>
        <span
          class="wikitab-card__supporting wikitab-supporting-icon-row"
          :class="{ 'wikitab-card__supporting--split': hasSupportingEnd }"
        >
          <span class="wikitab-card__supporting-start"
            ><CdxIcon v-if="supportingIcon" :icon="supportingIcon" size="x-small" /><span
              class="wikitab-card__supporting-label"
              ><template v-if="supportingIcon">{{ WIKITAB_SUPPORTING_ICON_TEXT_LEADING }}</template
              ><!-- eslint-disable-next-line vue/no-v-html --><span v-html="card.supportingHtml" /></span
          ></span>
          <span
            v-if="loadingFlags.supportingEnd"
            class="wikitab-card__skeleton-line wikitab-card__skeleton-end"
            aria-hidden="true"
          />
          <span v-else-if="card.supportingTextEnd" class="wikitab-card__supporting-end">{{
            card.supportingTextEnd
          }}</span>
        </span>
      </template>
      <template v-else-if="card?.supportingText || hasSupportingEnd" #supporting-text>
        <span
          class="wikitab-card__supporting wikitab-supporting-icon-row"
          :class="{ 'wikitab-card__supporting--split': hasSupportingEnd }"
        >
          <template v-if="hasSupportingEnd">
            <span v-if="card.supportingText" class="wikitab-card__supporting-start"
              ><CdxIcon v-if="supportingIcon" :icon="supportingIcon" size="x-small" /><span
                class="wikitab-card__supporting-label"
                ><template v-if="supportingIcon">{{ WIKITAB_SUPPORTING_ICON_TEXT_LEADING }}</template
                >{{ card.supportingText }}</span
              ></span
            >
            <span
              v-if="loadingFlags.supportingEnd"
              class="wikitab-card__skeleton-line wikitab-card__skeleton-end"
              aria-hidden="true"
            />
            <span v-else class="wikitab-card__supporting-end">{{ card.supportingTextEnd }}</span>
          </template>
          <template v-else-if="card.supportingText">
            <span class="wikitab-card__supporting-start"
              ><CdxIcon v-if="supportingIcon" :icon="supportingIcon" size="x-small" /><span
                class="wikitab-card__supporting-label"
                ><template v-if="supportingIcon">{{ WIKITAB_SUPPORTING_ICON_TEXT_LEADING }}</template
                >{{ card.supportingText }}</span
              ></span
            >
          </template>
        </span>
      </template>
      </CdxCard>
    </div>
  </div>
</template>

<style scoped>
.wikitab-card {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 0;
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
.wikitab-card--link-overlay :deep(.cdx-card),
.wikitab-card--link-overlay .wikitab-card__shell {
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: var(--wikitab-card-transition-duration);
}

/* ⋯ hover / press / open — card shell stays at rest. */
.wikitab-card--link-overlay:hover:not(:has(.wikitab-card__menu:hover)):not(:has(.wikitab-card__menu:focus-within)):not(
    :has(.wikitab-card__menu [aria-expanded='true'])
  )
  :deep(.cdx-card),
.wikitab-card--link-overlay:hover:not(:has(.wikitab-card__menu:hover)):not(:has(.wikitab-card__menu:focus-within)):not(
    :has(.wikitab-card__menu [aria-expanded='true'])
  )
  .wikitab-card__shell {
  border-color: var(--wikitab-card-border-color--hover);
  box-shadow: var(--wikitab-card-box-shadow--hover);
}

.wikitab-card--link-overlay:active:not(:has(.wikitab-card__menu :active)):not(:has(.wikitab-card__menu:focus-within))
  :deep(.cdx-card),
.wikitab-card--link-overlay:active:not(:has(.wikitab-card__menu :active)):not(:has(.wikitab-card__menu:focus-within))
  .wikitab-card__shell {
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
 * The reserved slot: a flat block at the card floor height that replaces it, with
 * no border, so nothing moves when the data lands. Row equalization may grow it.
 */
.wikitab-card--loading {
  box-sizing: border-box;
  width: 100%;
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
.wikitab-card__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  height: 100%;
}

.wikitab-card__shell.cdx-card {
  flex-direction: column;
  align-items: stretch;
  gap: var(--spacing-50);
}

.wikitab-card__shell > .wikitab-card__cdx.cdx-card {
  flex: 1 1 auto;
  border: 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  min-height: 0;
}

.wikitab-card__chips-row {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
}

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
.wikitab-card:not(.wikitab-card--block-start) :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  flex-shrink: 0;
  align-self: flex-start;
  width: var(--wikitab-thumbnail-size);
  height: var(--wikitab-thumbnail-size);
}

/* Placeholder thumbnails stay Codex neutral grey, not the page color theme. */
.wikitab-card :deep(.cdx-card__thumbnail .cdx-thumbnail__placeholder) {
  background-color: var(--background-color-neutral-subtle);
}

/* `thumbnailLayout: inline-end` — hook / description first, thumbnail trailing (DYK, news, …). */
.wikitab-card--inline-end :deep(.cdx-card__text) {
  order: 0;
  flex: 1;
  min-width: 0;
}

.wikitab-card--inline-end :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  order: 1;
  margin-inline-start: var(--spacing-50);
  margin-inline-end: 0;
}

/* `thumbnailLayout: inline-start` — gap between leading thumbnail and text column. */
.wikitab-card--inline-start :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  margin-inline-end: var(--spacing-50);
  margin-inline-start: 0;
}

/*
 * Codex block-start (portrait card). Layout from `thumbnailPosition="block-start"`;
 * full content width; 4∶3 crop instead of Codex’s default 16∶9.
 */
.wikitab-card--block-start :deep(.cdx-card__thumbnail.cdx-thumbnail) {
  display: block;
  flex-shrink: 0;
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  aspect-ratio: var(--wikitab-block-start-thumb-aspect);
  height: auto;
}

.wikitab-card--block-start
  :deep(
    .cdx-card--thumbnail-position-block-start
      .cdx-card__thumbnail.cdx-thumbnail
      .cdx-thumbnail__placeholder
  ),
.wikitab-card--block-start
  :deep(
    .cdx-card--thumbnail-position-block-start
      .cdx-card__thumbnail.cdx-thumbnail
      .cdx-thumbnail__image
  ) {
  aspect-ratio: var(--wikitab-block-start-thumb-aspect);
  width: 100%;
  height: auto;
}

.wikitab-card--block-start :deep(.cdx-card__text) {
  order: 1;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.wikitab-card--block-start.wikitab-card--clamped :deep(.cdx-card__text__description) {
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.wikitab-card--clamped :deep(.cdx-card__text) {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.wikitab-card--clamped.wikitab-card--clamp-title-1 :deep(.cdx-card__text__supporting-text),
.wikitab-card--clamped.wikitab-card--clamp-title-2 :deep(.cdx-card__text__supporting-text),
.wikitab-card--clamped.wikitab-card--clamp-title-4 :deep(.cdx-card__text__supporting-text) {
  flex-shrink: 0;
}

/* Thumbnail-slot loading: flat neutral block, no Codex image icon. */
.wikitab-card--thumbnail-slot-loading :deep(.cdx-card__thumbnail .cdx-thumbnail__placeholder) {
  background-color: var(--background-color-neutral-subtle);
}

.wikitab-card--thumbnail-slot-loading :deep(.cdx-card__thumbnail .cdx-icon) {
  display: none;
}

/*
 * Field skeletons sit inside the Codex text slots, so `lh` is that slot's own
 * line height: each bar takes exactly one line, matching the text it replaces.
 */
.wikitab-card__skeleton {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.wikitab-card__skeleton-line {
  display: block;
  height: 0.75lh;
  margin-block: 0.125lh;
  border-radius: var(--border-radius-base);
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
}

.wikitab-card__skeleton .wikitab-card__skeleton-line:last-child:not(:first-child) {
  width: 60%;
}

.wikitab-card__skeleton--supporting .wikitab-card__skeleton-line {
  width: 40%;
}

.wikitab-card__skeleton-end {
  flex-shrink: 0;
  align-self: center;
  width: 4rem;
}

.wikitab-card__skeleton-chip {
  display: block;
  width: 10rem;
  height: calc(var(--line-height-small) + 2 * var(--border-width-base));
  border-radius: var(--border-radius-base);
  background-color: var(--wikitab-theme-skeleton-bg, var(--background-color-neutral-subtle));
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
  max-width: 100%;
}

.wikitab-card__supporting--split {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  justify-content: space-between;
  align-items: first baseline;
  gap: var(--spacing-25);
}

.wikitab-card__supporting-start {
  display: inline-flex;
  align-items: flex-start;
  max-width: 100%;
  min-width: 0;
  flex: 0 1 auto;
}

/* Centre the icon on the first line of the label, not the whole wrapped block. */
.wikitab-card__supporting-start > :deep(.cdx-icon) {
  margin-top: calc((1lh - 12px) / 2);
}

.wikitab-card__supporting-start .wikitab-card__supporting-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.wikitab-card__supporting-end {
  flex-shrink: 0;
}

/* 12×12 — scoped so previews work; `display: inline` ignores width/height and blows up SVGs. */
.wikitab-card__supporting.wikitab-supporting-icon-row :deep(.cdx-icon) {
  display: inline-flex;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  min-width: 12px;
  min-height: 12px;
  max-width: 12px;
  max-height: 12px;
  flex: none;
  color: inherit;
}

.wikitab-card__supporting-label .wikitab-suggestion-task {
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive);
}

.wikitab-card__supporting.wikitab-supporting-icon-row:has(.wikitab-suggestion-task) :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.wikitab-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50);
  max-width: 100%;
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.wikitab-card__chip {
  flex-shrink: 0;
}

.wikitab-card__title-text {
  font-weight: inherit;
}

.wikitab-card__supporting-label :deep(.wikitab-card__nested-link) {
  position: relative;
  z-index: 2;
  color: var(--color-subtle);
  text-decoration: none;
}

.wikitab-card__supporting-label :deep(.wikitab-card__nested-link:hover),
.wikitab-card__supporting-label :deep(.wikitab-card__nested-link:focus-visible) {
  text-decoration: underline;
}

.wikitab-card__description-plain {
  margin: 0;
}

/*
 * Clamping keeps the fixed height honest. Layout only — typography comes from
 * Codex's card text styles.
 */
.wikitab-card--clamped.wikitab-card--clamp-title-1 :deep(.cdx-card__text__title) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}

.wikitab-card--clamped.wikitab-card--clamp-title-2 :deep(.cdx-card__text__title),
.wikitab-card--clamped.wikitab-card--clamp-desc-2 :deep(.cdx-card__text__description) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

/* Saved image cards — caption-only (no title slot), same depth as text cards. */
.wikitab-card--clamped.wikitab-card--clamp-title-2
  :deep(.cdx-card__text__title:empty + .cdx-card__text__description) {
  -webkit-line-clamp: 4;
  line-clamp: 4;
}

.wikitab-card--clamped.wikitab-card--clamp-title-4 :deep(.cdx-card__text__title),
.wikitab-card--clamped.wikitab-card--clamp-desc-4 :deep(.cdx-card__text__description) {
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

.wikitab-card__hook-text {
  display: inline;
  min-width: 0;
}

/* Above the card-wide overlay, so an inline link still wins the click. */
.wikitab-card__hook-text :deep(a) {
  position: relative;
  z-index: 2;
}

/* Wiktionary WOTD gloss: usage labels are italic on-site via class, not always <i>. */
.wikitab-card__hook-text :deep(.usage-label-sense),
.wikitab-card__hook-text :deep(i),
.wikitab-card__hook-text :deep(em) {
  font-style: italic;
}

/* Feed cards keep progressive link colour even after the URL is visited. */
.wikitab-card :deep(a:visited) {
  color: var(--color-progressive);
}

.wikitab-card :deep(a:visited:hover) {
  color: var(--color-progressive--hover);
}
</style>
