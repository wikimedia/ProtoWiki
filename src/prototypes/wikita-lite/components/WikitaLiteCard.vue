<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import WikitaLiteButton from './WikitaLiteButton.vue'

export type WikitaLiteCardFlagColor =
  | 'base'
  | 'success'
  | 'progressive'
  | 'warning'
  | 'error'

interface Props {
  showFlag?: boolean
  showTitle?: boolean
  showSubtitle?: boolean
  showBody?: boolean
  showBodyIcon?: boolean
  showThumbnail?: boolean
  showInfo?: boolean
  showTopAction?: boolean
  showBottomAction?: boolean
  flag?: string
  flagIcon?: Icon
  flagColor?: WikitaLiteCardFlagColor
  title?: string
  /** Primary hook subject to bold within {@link title}. */
  titleEmphasis?: string
  subtitle?: string
  body?: string
  bodyIcon?: Icon
  infoLeft?: string
  infoRight?: string
  thumbnailUrl?: string
  thumbnailAlt?: string
  topActionLabel?: string
  topActionIcon?: Icon
  bottomActionLabel?: string
  bottomActionIcon?: Icon
  externalHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  showFlag: false,
  showTitle: true,
  showSubtitle: true,
  showBody: false,
  showBodyIcon: false,
  showThumbnail: true,
  showInfo: false,
  showTopAction: false,
  showBottomAction: false,
  flag: '',
  flagIcon: undefined,
  flagColor: 'base',
  title: '',
  titleEmphasis: undefined,
  subtitle: '',
  body: '',
  bodyIcon: undefined,
  infoLeft: '',
  infoRight: '',
  thumbnailUrl: undefined,
  thumbnailAlt: '',
  topActionLabel: '',
  topActionIcon: undefined,
  bottomActionLabel: '',
  bottomActionIcon: undefined,
  externalHref: undefined,
})

const emit = defineEmits<{
  'top-action-click': [event: MouseEvent]
  'bottom-action-click': [event: MouseEvent]
}>()

const isLink = computed(() => Boolean(props.externalHref?.trim()))

interface TitleSegment {
  text: string
  bold: boolean
}

/** When {@link titleEmphasis} is set, split the title so only the hook subject is bold. */
const titleSegments = computed((): TitleSegment[] | null => {
  const text = props.title
  if (!text) return null

  const emphasis = props.titleEmphasis
  if (!emphasis) return null

  const pattern = emphasis
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\u00a0 ]+')
  const match = text.match(new RegExp(pattern))
  if (!match?.index && match?.index !== 0) return [{ text, bold: false }]

  const segments: TitleSegment[] = []
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

function stopAction(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}
</script>

<template>
  <component
    :is="isLink ? 'a' : 'div'"
    class="wikita-lite-card"
    :class="{ 'wikita-lite-card--link': isLink }"
    :href="isLink ? externalHref : undefined"
    :target="isLink ? '_blank' : undefined"
    :rel="isLink ? 'noopener noreferrer' : undefined"
  >
    <div class="wikita-lite-card__inner">
      <div class="wikita-lite-card__header">
        <div class="wikita-lite-card__main">
          <div
            v-if="showFlag && (flag || flagIcon)"
            class="wikita-lite-card__flag"
            :class="`wikita-lite-card__flag--${flagColor}`"
          >
            <CdxIcon v-if="flagIcon" :icon="flagIcon" class="wikita-lite-card__flag-icon" />
            <span v-if="flag" class="wikita-lite-card__flag-text">{{ flag }}</span>
          </div>

          <div v-if="showTitle || showSubtitle" class="wikita-lite-card__titles">
            <p
              v-if="showTitle && title"
              class="wikita-lite-card__title"
              :class="{ 'wikita-lite-card__title--mixed': titleSegments }"
            >
              <template v-if="titleSegments">
                <template v-for="(segment, index) in titleSegments" :key="index">
                  <strong v-if="segment.bold">{{ segment.text }}</strong>
                  <template v-else>{{ segment.text }}</template>
                </template>
              </template>
              <template v-else>{{ title }}</template>
            </p>
            <p v-if="showSubtitle && subtitle" class="wikita-lite-card__subtitle">{{ subtitle }}</p>
          </div>

          <div v-if="showTopAction" class="wikita-lite-card__action">
            <WikitaLiteButton
              variant="outlined"
              :icon="topActionIcon"
              @click="stopAction($event); emit('top-action-click', $event)"
            >
              {{ topActionLabel }}
            </WikitaLiteButton>
          </div>
        </div>

        <div v-if="showThumbnail && thumbnailUrl" class="wikita-lite-card__thumbnail-wrap">
          <img
            class="wikita-lite-card__thumbnail"
            :src="thumbnailUrl"
            :alt="thumbnailAlt || title || ''"
            loading="lazy"
          />
        </div>
      </div>

      <div v-if="showBody && body" class="wikita-lite-card__body">
        <CdxIcon v-if="showBodyIcon && bodyIcon" :icon="bodyIcon" class="wikita-lite-card__body-icon" />
        <p class="wikita-lite-card__body-text">{{ body }}</p>
      </div>

      <div v-if="showBottomAction" class="wikita-lite-card__action">
        <WikitaLiteButton
          variant="outlined"
          :icon="bottomActionIcon"
          @click="stopAction($event); emit('bottom-action-click', $event)"
        >
          {{ bottomActionLabel }}
        </WikitaLiteButton>
      </div>

      <div v-if="showInfo && (infoLeft || infoRight)" class="wikita-lite-card__info">
        <span v-if="infoLeft">{{ infoLeft }}</span>
        <span v-if="infoRight">{{ infoRight }}</span>
      </div>
    </div>
  </component>
</template>

<style scoped>
.wikita-lite-card {
  display: block;
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--border-color-muted, #dadde3);
  border-radius: 4px;
  background: var(--background-color-base, #fff);
  color: inherit;
  text-decoration: none;
}

.wikita-lite-card--link {
  cursor: pointer;
}

.wikita-lite-card__inner {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-100, 16px);
}

.wikita-lite-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.wikita-lite-card__main {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  min-width: 0;
}

.wikita-lite-card__flag {
  display: flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  width: 100%;
}

.wikita-lite-card__flag-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  /* Codex sets `.cdx-icon { color: var(--color-base) }`; inherit so the icon
   * matches the coloured flag label (success, progressive, etc.). */
  color: inherit;
}

.wikita-lite-card__flag-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
}

.wikita-lite-card__flag--base {
  color: var(--color-base, #202122);
}

.wikita-lite-card__flag--success {
  color: var(--color-icon-success);
}

.wikita-lite-card__flag--progressive {
  color: var(--color-progressive);
}

.wikita-lite-card__flag--warning {
  color: var(--color-warning);
}

.wikita-lite-card__flag--error {
  color: var(--color-error);
}

.wikita-lite-card__titles {
  display: flex;
  flex-direction: column;
  width: 100%;
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
}

.wikita-lite-card__title {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
}

.wikita-lite-card__title--mixed {
  font-weight: var(--font-weight-normal, 400);
}

.wikita-lite-card__title--mixed strong {
  font-weight: var(--font-weight-bold, 700);
}

.wikita-lite-card__subtitle {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-normal, 400);
}

.wikita-lite-card__thumbnail-wrap {
  flex-shrink: 0;
  padding-left: var(--spacing-50, 8px);
}

.wikita-lite-card__thumbnail {
  display: block;
  width: 4rem;
  height: 4rem;
  object-fit: cover;
  border: 1px solid var(--border-color-muted, #dadde3);
}

.wikita-lite-card__body {
  display: flex;
  gap: var(--spacing-50, 8px);
  align-items: flex-start;
  width: 100%;
}

.wikita-lite-card__body-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
}

.wikita-lite-card__body-text {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
  text-overflow: ellipsis;
}

.wikita-lite-card__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base, #202122);
  white-space: nowrap;
}

.wikita-lite-card__action {
  display: flex;
  align-items: flex-start;
}
</style>
