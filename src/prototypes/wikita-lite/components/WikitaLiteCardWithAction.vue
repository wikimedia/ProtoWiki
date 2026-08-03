<script setup lang="ts">
import { computed, inject, useId } from 'vue'

import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import WikitaLiteSupportingRow from './WikitaLiteSupportingRow.vue'
import {
  WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER,
  WIKITA_LITE_CARD_CLASS_SEPARATION_NONE,
  WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE,
  WIKITA_LITE_CARD_SEPARATION,
  type WikitaLiteCardSeparation,
} from '../wikita-lite-card'

interface Props {
  url?: string
  title: string
  description?: string
  descriptionHtml?: string
  supportingText?: string
  supportingIcon?: Icon
  thumbnailUrl?: string
  thumbnailSize?: 'default' | 'large'
  forceThumbnail?: boolean
  separation?: WikitaLiteCardSeparation
  actionLabel: string
  actionIcon?: Icon
}

const props = withDefaults(defineProps<Props>(), {
  url: undefined,
  description: undefined,
  descriptionHtml: undefined,
  supportingText: undefined,
  supportingIcon: undefined,
  thumbnailUrl: undefined,
  thumbnailSize: 'default',
  forceThumbnail: true,
  actionIcon: undefined,
})

const injectedSeparation = inject(WIKITA_LITE_CARD_SEPARATION, null)

const resolvedSeparation = computed(
  (): WikitaLiteCardSeparation => props.separation ?? injectedSeparation?.value ?? 'outline',
)

const separationClass = computed(() => {
  if (resolvedSeparation.value === 'divider') return WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER
  if (resolvedSeparation.value === 'none') return WIKITA_LITE_CARD_CLASS_SEPARATION_NONE
  return ''
})

defineEmits<{
  'action-click': [event: MouseEvent]
}>()

const titleId = useId()

const hasLink = computed(() => Boolean(props.url?.trim()))

const thumbnail = computed(() =>
  props.thumbnailUrl?.trim() ? { url: props.thumbnailUrl.trim() } : null,
)

const showDescription = computed(
  () => Boolean(props.description?.trim() || props.descriptionHtml?.trim()),
)

const showSupporting = computed(
  () => Boolean(props.supportingText?.trim() || props.supportingIcon),
)

function onActionClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}
</script>

<template>
  <article
    class="wikita-lite-card-with-action"
    :class="{ 'wikita-lite-card-with-action--linked': hasLink }"
  >
    <a
      v-if="hasLink"
      :href="url"
      class="wikita-lite-card-with-action__cover-link"
      :aria-labelledby="titleId"
      target="_blank"
      rel="noopener noreferrer"
    />

    <CdxCard
      class="wikita-lite-card-with-action__card"
      :class="[
        separationClass,
        { [WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE]: thumbnailSize === 'large' },
      ]"
      :thumbnail="thumbnail"
      :force-thumbnail="forceThumbnail"
    >
      <template #title>
        <span :id="titleId">{{ title }}</span>
      </template>

      <template v-if="showDescription" #description>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span
          v-if="descriptionHtml"
          class="wikita-lite-card-with-action__description wikita-lite-card-with-action__description--html"
          v-html="descriptionHtml"
        />
        <span v-else class="wikita-lite-card-with-action__description">{{ description }}</span>
      </template>

      <template v-if="showSupporting || actionLabel" #supporting-text>
        <div class="wikita-lite-card-with-action__footer">
          <WikitaLiteSupportingRow
            v-if="showSupporting"
            class="wikita-lite-card-with-action__supporting"
            :icon="supportingIcon"
          >
            {{ supportingText }}
          </WikitaLiteSupportingRow>
          <CdxButton
            class="wikita-lite-card-with-action__action"
            weight="normal"
            @click="onActionClick($event); $emit('action-click', $event)"
          >
            <CdxIcon v-if="actionIcon" :icon="actionIcon" />
            {{ actionLabel }}
          </CdxButton>
        </div>
      </template>
    </CdxCard>
  </article>
</template>

<style scoped>
.wikita-lite-card-with-action {
  position: relative;
  display: block;
  width: 100%;
}

.wikita-lite-card-with-action__cover-link {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.wikita-lite-card-with-action__cover-link:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-lite-card-with-action__card {
  position: relative;
  z-index: 1;
  width: 100%;
  pointer-events: none;
}

.wikita-lite-card-with-action__description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.wikita-lite-card-with-action__description--html {
  display: block;
  overflow: visible;
  -webkit-line-clamp: unset;
  line-clamp: unset;
}

.wikita-lite-card-with-action__description :deep(.searchmatch) {
  padding: 0 1px;
  font-weight: var(--font-weight-bold);
  color: var(--color-base);
  background-color: #ffe49c;
}

.wikita-lite-card-with-action__footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.wikita-lite-card-with-action__supporting {
  width: 100%;
}

.wikita-lite-card-with-action__action {
  pointer-events: auto;
  align-self: flex-start;
  margin-top: var(--spacing-50, 8px);
}

.wikita-lite-card-with-action :deep(.cdx-card__text__supporting-text) {
  display: block;
  width: 100%;
}
</style>
