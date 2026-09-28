<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose, cdxIconImage, cdxIconInfo } from '@wikimedia/codex-icons'

import { potdHasAttribution, type WikitabPotd } from './data/fetchPictureOfTheDay'
import { unwrapLinksInHtml } from './data/wikitabHtml'
import { useWikitabPotdAttributionDismiss } from './useWikitabPotdAttributionDismiss'

const props = defineProps<{
  potd: WikitabPotd
}>()

const emit = defineEmits<{
  'open-change': [open: boolean]
}>()

const { isDismissed, dismiss, open } = useWikitabPotdAttributionDismiss()

const show = computed(() => potdHasAttribution(props.potd))
const isOpen = computed(() => show.value && !isDismissed.value)
const cardUrl = computed(() => props.potd.href || undefined)

/** Artist arrives from the API as HTML with links; unwrap again for older cache entries. */
const artistDisplayHtml = computed(() =>
  props.potd.artistHtml ? unwrapLinksInHtml(props.potd.artistHtml) : '',
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') dismiss()
}

watch(
  isOpen,
  (open) => {
    emit('open-change', open)
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

const captionHostRef = ref<HTMLElement | null>(null)
const captionLineClamp = ref(9999)

/** High line count used only while measuring natural caption height. */
const CAPTION_LINES_UNLIMITED = 9999

let captionResizeObserver: ResizeObserver | null = null
let captionClampFrame = 0

function updateCaptionLineClamp(): void {
  const host = captionHostRef.value
  if (!host) return

  const caption = host.querySelector<HTMLElement>('.wikitab-potd-attribution__caption')
  if (!caption) return

  const lineHeight = Number.parseFloat(getComputedStyle(caption).lineHeight)
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return

  const panel = host.closest<HTMLElement>('.wikitab-potd-attribution__panel')
  const cardText = host.closest<HTMLElement>('.cdx-card__text')
  if (!panel || !cardText) return

  captionLineClamp.value = CAPTION_LINES_UNLIMITED

  cancelAnimationFrame(captionClampFrame)
  captionClampFrame = requestAnimationFrame(() => {
    captionClampFrame = 0

    const naturalLines = Math.max(1, Math.ceil(caption.scrollHeight / lineHeight))

    const supporting = cardText.querySelector<HTMLElement>('.cdx-card__text__supporting-text')
    const card = cardText.closest<HTMLElement>('.cdx-card')

    let captionBottomLimit = panel.getBoundingClientRect().bottom
    if (card) {
      captionBottomLimit -= Number.parseFloat(getComputedStyle(card).paddingBottom) || 0
    }
    if (supporting) {
      const gap = Number.parseFloat(getComputedStyle(cardText).rowGap) || 0
      captionBottomLimit = supporting.getBoundingClientRect().top - gap
    }

    const captionBudget = captionBottomLimit - host.getBoundingClientRect().top
    const maxLines = Math.max(1, Math.floor(captionBudget / lineHeight))
    captionLineClamp.value = Math.min(naturalLines, maxLines)
  })
}

function stopCaptionClampObserver(): void {
  captionResizeObserver?.disconnect()
  captionResizeObserver = null
}

function startCaptionClampObserver(): void {
  stopCaptionClampObserver()
  if (!captionHostRef.value) return

  captionResizeObserver = new ResizeObserver(() => updateCaptionLineClamp())
  captionResizeObserver.observe(captionHostRef.value)

  const panel = captionHostRef.value.closest('.wikitab-potd-attribution__panel')
  if (panel) captionResizeObserver.observe(panel)

  updateCaptionLineClamp()
}

watch(
  () => [show.value, isDismissed.value, props.potd.descriptionHtml] as const,
  ([visible, dismissed]) => {
    if (!visible || dismissed) {
      stopCaptionClampObserver()
      return
    }
    void nextTick(startCaptionClampObserver)
  },
  { immediate: true },
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  stopCaptionClampObserver()
  cancelAnimationFrame(captionClampFrame)
})

const captionClampStyle = computed(() => ({
  '--wikitab-potd-caption-lines': String(captionLineClamp.value),
}))
</script>

<template>
  <div v-if="show" class="wikitab-potd-attribution">
    <div v-if="isDismissed" class="wikitab-potd-attribution__open-wrap">
      <CdxButton
        class="wikitab-potd-attribution__open"
        weight="quiet"
        :icon-only="true"
        aria-label="Picture of the day"
        @click="open"
      >
        <CdxIcon :icon="cdxIconImage" />
      </CdxButton>
    </div>

    <template v-else>
      <div
        class="wikitab-potd-attribution__backdrop"
        aria-hidden="true"
        @click="dismiss"
      />

      <aside
        class="wikitab-potd-attribution__panel"
        aria-label="Picture of the day attribution"
      >
        <div
          class="wikitab-potd-attribution__card-wrap"
          :class="{ 'wikitab-potd-attribution__card-wrap--linked': !!cardUrl }"
          @click.stop
        >
        <a
          v-if="cardUrl"
          class="wikitab-potd-attribution__link"
          :href="cardUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Picture of the day"
        />

        <CdxCard class="wikitab-potd-attribution__card">
          <template #title>Picture of the day</template>
          <template v-if="potd.descriptionHtml" #description>
            <div ref="captionHostRef" class="wikitab-potd-attribution__caption-host">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span
                class="wikitab-potd-attribution__caption"
                :style="captionClampStyle"
                v-html="potd.descriptionHtml"
              />
            </div>
          </template>
          <template v-if="artistDisplayHtml || potd.licenseType" #supporting-text>
            <span class="wikitab-potd-attribution__supporting">
              <CdxIcon :icon="cdxIconInfo" size="x-small" />
              <span class="wikitab-potd-attribution__supporting-label">
                <template v-if="potd.licenseType">{{ potd.licenseType }}</template>
                <template v-if="potd.licenseType && artistDisplayHtml">, </template>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-if="artistDisplayHtml" v-html="artistDisplayHtml" />
              </span>
            </span>
          </template>
        </CdxCard>

        <CdxButton
          class="wikitab-potd-attribution__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Dismiss Picture of the day"
          @click.stop="dismiss"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
        </div>
      </aside>
    </template>
  </div>
</template>

<style scoped>
.wikitab-potd-attribution {
  --wikitab-potd-attribution-inset: var(--spacing-100);
  --wikitab-potd-attribution-max-height: calc(100dvh / 3);
}

@media (max-width: 767px) {
  .wikitab-potd-attribution {
    --wikitab-potd-attribution-inset: var(--spacing-50);
  }
}

.wikitab-potd-attribution__backdrop {
  position: fixed;
  inset: 0;
  z-index: 4;
}

.wikitab-potd-attribution__panel {
  position: fixed;
  /* Above WikitabColorThemeButton (z-index 5) when the card overlaps it on mobile. */
  z-index: 6;
  left: var(--wikitab-potd-attribution-inset);
  bottom: var(--wikitab-potd-attribution-inset);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(20rem, calc(100vw - 2 * var(--wikitab-potd-attribution-inset) - 8rem));
  height: min(var(--wikitab-potd-attribution-max-height), max-content);
  max-height: var(--wikitab-potd-attribution-max-height);
  min-height: 0;
  overflow: hidden;
}

[data-skin='mobile'] .wikitab-potd-attribution__panel {
  right: var(--wikitab-potd-attribution-inset);
  width: auto;
  max-width: none;
}

.wikitab-potd-attribution__card-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  max-height: 100%;
}

.wikitab-potd-attribution__link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.wikitab-potd-attribution__link:focus-visible {
  outline: var(--border-width-thick) var(--border-style-base)
    var(--outline-color-progressive--focus);
  outline-offset: calc(var(--border-width-thick) * -1);
}

.wikitab-potd-attribution__close {
  position: absolute;
  top: var(--spacing-35);
  inset-inline-end: var(--spacing-35);
  z-index: 3;
}

[data-skin='desktop'] .wikitab-potd-attribution__close {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s;
}

[data-skin='desktop'] .wikitab-potd-attribution__card-wrap:hover .wikitab-potd-attribution__close,
[data-skin='desktop'] .wikitab-potd-attribution__card-wrap:focus-within .wikitab-potd-attribution__close {
  opacity: 1;
  pointer-events: auto;
}

/* Match WikitabConfigureButton / WikitabColorThemeButton (2.75rem). */
.wikitab-potd-attribution__open-wrap {
  position: fixed;
  z-index: 5;
  left: var(--wikitab-potd-attribution-inset);
  bottom: var(--wikitab-potd-attribution-inset);
  flex-shrink: 0;
  border-radius: 2px;
  overflow: hidden;
  background-color: var(--wikitab-theme-bg, var(--background-color-base));
}

@media (max-width: 1120px) {
  .wikitab-potd-attribution__open-wrap {
    border: var(--border-width-base, 1px) solid
      var(--wikitab-theme-border, var(--border-color-subtle));
  }
}

.wikitab-potd-attribution__open {
  flex-shrink: 0;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  border-radius: 2px;
}

/*
 * Home feed card compact type (14px body / 12px small) — same as WikitabSection
 * `.wikitab-section__cards`.
 */
.wikitab-potd-attribution__card {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  --font-size-small: 0.75rem;
  --font-size-medium: 0.875rem;
  --font-size-large: 1rem;
  --line-height-small: 1.25rem;
  --line-height-medium: 1.375rem;
  --line-height-large: 1.375rem;
}

.wikitab-potd-attribution__card :deep(.cdx-card) {
  flex: 1 1 auto;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}

.wikitab-potd-attribution__card :deep(.cdx-card__text) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.wikitab-potd-attribution__card :deep(.cdx-card__text__title),
.wikitab-potd-attribution__card :deep(.cdx-card__text__supporting-text) {
  flex-shrink: 0;
}

.wikitab-potd-attribution__card :deep(.cdx-card__text__description) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.wikitab-potd-attribution__caption-host {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.wikitab-potd-attribution__caption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  -webkit-line-clamp: var(--wikitab-potd-caption-lines, 9999);
  line-clamp: var(--wikitab-potd-caption-lines, 9999);
}

.wikitab-potd-attribution__card-wrap--linked :deep(.cdx-card) {
  pointer-events: none;
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.1s;
}

.wikitab-potd-attribution__card-wrap--linked:hover :deep(.cdx-card) {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikitab-potd-attribution__card-wrap--linked:active :deep(.cdx-card) {
  border-color: var(--border-color-interactive--active, #202122);
}

.wikitab-potd-attribution__card :deep(.cdx-card__text__title) {
  padding-inline-end: var(--spacing-200);
}

.wikitab-potd-attribution__card-wrap--linked .wikitab-potd-attribution__caption :deep(a) {
  pointer-events: auto;
  position: relative;
  z-index: 2;
  color: var(--color-progressive);
}

.wikitab-potd-attribution__caption :deep(a:visited) {
  color: var(--color-progressive);
}

.wikitab-potd-attribution__caption :deep(a:visited:hover) {
  color: var(--color-progressive--hover);
}

/* Same supporting-text row pattern as WikitabCard (icon + subtle label). */
.wikitab-potd-attribution__supporting {
  display: inline-flex;
  align-items: baseline;
  gap: var(--spacing-25);
  max-width: 100%;
}

.wikitab-potd-attribution__supporting :deep(.cdx-icon) {
  flex-shrink: 0;
  translate: 0 0.0625em;
}

.wikitab-potd-attribution__supporting-label :deep(a) {
  color: inherit;
  text-decoration: none;
}
</style>
