<script setup lang="ts">
import { computed, useId } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import { cdxIconBookmark, cdxIconBookmarkList, cdxIconBookmarkOutline } from '@wikimedia/codex-icons'

import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'
import WikitaButton from './WikitaButton.vue'
import WikitaCardWrapper from './WikitaCardWrapper.vue'

export type WikitaCardItemTypeColor =
  | 'base'
  | 'success'
  | 'progressive'
  | 'warning'
  | 'error'

interface Props {
  showType?: boolean
  showTitle?: boolean
  showThumbnail?: boolean
  showSnippet?: boolean
  showInfo?: boolean
  showAction?: boolean
  titleBold?: boolean
  titleColor?: WikitaCardItemTypeColor
  type?: string
  title?: string
  body?: string
  bodyEmphasis?: string
  snippet?: string
  snippetHtml?: string
  infoLeft?: string
  infoRight?: string
  infoRightSubtle?: boolean
  thumbnailUrl?: string
  thumbnailAlt?: string
  typeIcon?: Icon
  typeColor?: WikitaCardItemTypeColor
  subType?: string
  subTypeIcon?: Icon
  subTypeColor?: WikitaCardItemTypeColor
  actionLabel?: string
  actionIcon?: Icon
  actionActive?: boolean
  actionInList?: boolean
  href?: RouteLocationRaw
  externalHref?: string
  /** Whole-card click (e.g. list picker); ignored when href/externalHref is set. */
  interactive?: boolean
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  showType: true,
  showTitle: true,
  showThumbnail: true,
  showSnippet: true,
  showInfo: true,
  showAction: false,
  titleBold: true,
  titleColor: 'base',
  type: 'Card type',
  title: 'Item title',
  body: 'Item body',
  bodyEmphasis: undefined,
  snippet: '',
  snippetHtml: undefined,
  infoLeft: '',
  infoRight: '',
  infoRightSubtle: false,
  thumbnailUrl: undefined,
  thumbnailAlt: '',
  typeIcon: undefined,
  typeColor: 'base',
  subType: undefined,
  subTypeIcon: undefined,
  subTypeColor: 'base',
  actionLabel: 'Save',
  actionIcon: undefined,
  actionActive: false,
  actionInList: false,
  href: undefined,
  externalHref: undefined,
  interactive: false,
  skin: undefined,
})

const emit = defineEmits<{
  'action-click': []
  click: []
}>()

const titleId = useId()

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const allowNestedInteractive = computed(
  () => props.showAction && Boolean(props.href || props.externalHref),
)

const resolvedActionIcon = computed(() => {
  if (props.actionIcon) return props.actionIcon
  if (props.actionInList) return cdxIconBookmarkList
  return props.actionActive ? cdxIconBookmark : cdxIconBookmarkOutline
})

const showTypeRow = computed(() => props.showType && Boolean(props.type || props.typeIcon))

const showSubTypeRow = computed(
  () => Boolean(props.subType || props.subTypeIcon),
)

const showTitleLine = computed(() => props.showTitle && Boolean(props.title))

const showBodyLine = computed(() => Boolean(props.body))

interface BodySegment {
  text: string
  bold: boolean
}

const bodySegments = computed((): BodySegment[] => {
  const text = props.body
  if (!text) return []

  const emphasis = props.bodyEmphasis
  if (!emphasis) return [{ text, bold: false }]

  const pattern = emphasis
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\u00a0 ]+')
  const match = text.match(new RegExp(pattern))
  if (!match?.index && match?.index !== 0) return [{ text, bold: false }]

  const segments: BodySegment[] = []
  if (match.index > 0) {
    segments.push({ text: text.slice(0, match.index), bold: false })
  }
  segments.push({ text: match[0], bold: true })
  const after = match.index + match[0].length
  if (after < text.length) {
    segments.push({ text: text.slice(after), bold: false })
  }
  return segments
})

const showThumb = computed(() => props.showThumbnail && Boolean(props.thumbnailUrl))

const showSnippetBlock = computed(
  () => props.showSnippet && Boolean(props.snippetHtml || props.snippet),
)

const showInfoLeft = computed(() => props.showInfo && Boolean(props.infoLeft))

const showInfoRight = computed(() => props.showInfo && Boolean(props.infoRight))

const showFooterRow = computed(() => showInfoLeft.value || showInfoRight.value)

const useCoverButton = computed(
  () => props.interactive && !props.href && !props.externalHref,
)
</script>

<template>
  <WikitaCardWrapper
    :href="href"
    :external-href="externalHref"
    :allow-nested-interactive="allowNestedInteractive"
    :cover-link-labelled-by="allowNestedInteractive && showTitleLine ? titleId : undefined"
    :interactive="useCoverButton"
    :skin="skin"
  >
    <div
      class="wikita-card-item"
      :class="{
        'wikita-card-item--interactive': useCoverButton,
        'wikita-card-item--wikipedia': effectiveSkin === 'wikipedia',
      }"
    >
      <button
        v-if="useCoverButton"
        type="button"
        class="wikita-card-item__cover"
        :aria-labelledby="showTitleLine ? titleId : undefined"
        @click="emit('click')"
      />
      <div class="wikita-card-item__header-row">
        <div class="wikita-card-item__lead">
          <div
            v-if="showTypeRow"
            class="wikita-card-item__type"
            :class="`wikita-card-item__type--${typeColor}`"
          >
            <CdxIcon v-if="typeIcon" :icon="typeIcon" class="wikita-card-item__type-icon" />
            <span class="wikita-card-item__type-label">{{ type }}</span>
          </div>

          <div
            v-if="showSubTypeRow || showTitleLine || showBodyLine"
            class="wikita-card-item__text"
          >
            <div
              v-if="showSubTypeRow"
              class="wikita-card-item__type"
              :class="`wikita-card-item__type--${subTypeColor}`"
            >
              <CdxIcon v-if="subTypeIcon" :icon="subTypeIcon" class="wikita-card-item__type-icon" />
              <span class="wikita-card-item__type-label">{{ subType }}</span>
            </div>
            <p
              v-if="showTitleLine"
              :id="titleId"
              class="wikita-card-item__title"
              :class="{
                'wikita-card-item__title--bold': titleBold,
                [`wikita-card-item__title--${titleColor}`]: titleColor !== 'base',
              }"
            >
              {{ title }}
            </p>
            <p v-if="showBodyLine" class="wikita-card-item__body">
              <template v-for="(segment, index) in bodySegments" :key="index">
                <strong v-if="segment.bold">{{ segment.text }}</strong>
                <template v-else>{{ segment.text }}</template>
              </template>
            </p>
          </div>
        </div>

        <div v-if="showThumb" class="wikita-card-item__thumb-wrap">
          <img
            class="wikita-card-item__thumb"
            :class="{ 'wikita-card-item__thumb--wikipedia': effectiveSkin === 'wikipedia' }"
            :src="thumbnailUrl"
            :alt="thumbnailAlt"
            loading="lazy"
            draggable="false"
          />
        </div>
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="showSnippetBlock && snippetHtml" class="wikita-card-item__snippet" v-html="snippetHtml" />
      <p v-else-if="showSnippetBlock" class="wikita-card-item__snippet">{{ snippet }}</p>

      <WikitaButton
        v-if="showAction"
        variant="outlined"
        class="wikita-card-item__action"
        :icon="resolvedActionIcon"
        :aria-pressed="actionActive"
        @click.stop.prevent="emit('action-click')"
      >
        {{ actionLabel }}
      </WikitaButton>

      <small
        v-if="showFooterRow"
        class="wikita-card-item__footer"
        :class="{ 'wikita-card-item__footer--left-only': showInfoLeft && !showInfoRight }"
      >
        <span v-if="showInfoLeft" class="wikita-card-item__footer-left">{{ infoLeft }}</span>
        <span
          v-if="showInfoRight"
          class="wikita-card-item__footer-right"
          :class="{ 'wikita-card-item__footer-right--subtle': infoRightSubtle }"
        >{{ infoRight }}</span>
      </small>
    </div>
  </WikitaCardWrapper>
</template>

<style scoped>
.wikita-card-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  min-width: 0;
}

.wikita-card-item--interactive {
  position: relative;
}

.wikita-card-item__cover {
  position: absolute;
  inset: 0;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-card-item__cover:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-card-item--interactive .wikita-card-item__header-row,
.wikita-card-item--interactive .wikita-card-item__snippet,
.wikita-card-item--interactive .wikita-card-item__action,
.wikita-card-item--interactive .wikita-card-item__footer {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.wikita-card-item__header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
}

.wikita-card-item__lead {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  min-width: 0;
}

.wikita-card-item__type {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.wikita-card-item__type--success {
  color: var(--color-icon-success);
}

.wikita-card-item__type--progressive {
  color: var(--color-progressive);
}

.wikita-card-item__type--warning {
  color: var(--color-warning);
}

.wikita-card-item__type--error {
  color: var(--color-error);
}

/* Codex sets `.cdx-icon { color: var(--color-base) }`; this wins over that so the
 * flag icon matches the coloured label on its type row. */
.wikita-card-item__type .wikita-card-item__type-icon {
  flex-shrink: 0;
  color: inherit;
}

.wikita-card-item__type-label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.wikita-card-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wikita-card-item__title {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-item__title--bold {
  font-weight: var(--font-weight-bold);
}

.wikita-card-item__title--success {
  color: var(--color-icon-success);
}

.wikita-card-item__title--progressive {
  color: var(--color-progressive);
}

.wikita-card-item__title--warning {
  color: var(--color-warning);
}

.wikita-card-item__title--error {
  color: var(--color-error);
}

.wikita-card-item__body {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-item__action {
  position: relative;
  z-index: 1;
  align-self: flex-start;
  pointer-events: auto;
}

.wikita-card-item__snippet {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  max-height: calc(var(--line-height-small) * 3);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

/* Highlight for the matched terms in a search snippet (`<span class="searchmatch">`). */
.wikita-card-item__snippet :deep(.searchmatch) {
  padding: 0 1px;
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
  background-color: #ffe49c;
}

.wikita-card-item__thumb-wrap {
  flex-shrink: 0;
  padding-left: var(--spacing-50);
}

.wikita-card-item__thumb {
  display: block;
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: 1px solid var(--color-base);
}

.wikita-card-item__thumb--wikipedia {
  border-color: var(--border-color-subtle);
  border-radius: var(--border-radius-base);
}

.wikita-card-item__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-item__footer--left-only {
  justify-content: flex-start;
}

.wikita-card-item__footer-left {
  min-width: 0;
  flex: 1 1 auto;
  white-space: normal;
  overflow-wrap: anywhere;
}

.wikita-card-item__footer-right {
  flex-shrink: 0;
  text-align: end;
}

.wikita-card-item__footer-right--subtle {
  color: var(--color-subtle);
}

.wikita-card-item--wikipedia .wikita-card-item__title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.wikita-card-item--wikipedia .wikita-card-item__thumb-wrap {
  padding-left: 0;
}

.wikita-card-item--wikipedia .wikita-card-item__snippet :deep(.searchmatch) {
  background-color: var(--background-color-warning-subtle);
}
</style>
