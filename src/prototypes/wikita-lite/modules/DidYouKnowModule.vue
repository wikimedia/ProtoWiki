<script setup lang="ts">
import { computed } from 'vue'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'

import type { HomeDidYouKnow } from '../../musical-group/data/types'
import { externalArticleHref } from '../composables/useWikitaLiteCardActions'
import { splitTitleEmphasis } from '../composables/splitTitleEmphasis'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_END } from '../wikita-lite-card'

interface Props {
  standalone?: boolean
  items?: HomeDidYouKnow[]
  loading?: boolean
  previewLimit?: number
  listsVersion?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 3,
  listsVersion: 0,
})

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

function titleSegments(item: HomeDidYouKnow) {
  return splitTitleEmphasis(item.text, item.emphasis)
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })
</script>

<template>
  <div class="did-you-know-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading Did you know" />

    <template v-else>
      <div :class="['did-you-know-module__cards', groupClass]">
        <CdxCard
          v-for="(item, index) in displayItems"
          :key="`dyk-${index}`"
          :class="[cardClass, WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_END]"
        :url="externalArticleHref(item)"
        :thumbnail="cardThumbnail(item.thumbnailUrl)"
        :force-thumbnail="true"
      >
        <template #title>
          <template v-if="titleSegments(item)">
            <template v-for="(segment, segmentIndex) in titleSegments(item)" :key="segmentIndex">
              <strong v-if="segment.bold">{{ segment.text }}</strong>
              <template v-else>{{ segment.text }}</template>
            </template>
          </template>
          <template v-else>{{ item.text }}</template>
        </template>
        </CdxCard>
      </div>

      <p v-if="standalone && !displayItems.length" class="did-you-know-module__empty">
        No Did you know hooks are available right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.did-you-know-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.did-you-know-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.did-you-know-module :deep(.cdx-card--title-only) {
  align-items: flex-start;
}

.did-you-know-module :deep(.cdx-card__text__title) {
  font-weight: var(--font-weight-normal, 400);
}

.did-you-know-module :deep(.cdx-card__text__title strong) {
  font-weight: var(--font-weight-bold, 700);
}

.did-you-know-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
