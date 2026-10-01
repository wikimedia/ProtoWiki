<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { CdxCard, CdxProgressBar } from '@wikimedia/codex'

import type { HomeDidYouKnow } from '../../musical-group/data/types'
import { externalArticleHref } from '../composables/useWikitaLiteCardActions'
import { splitTitleEmphasis } from '../composables/splitTitleEmphasis'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteShowMore from '../components/WikitaLiteShowMore.vue'
import { useWikitaLiteOverflowShowMore } from '../composables/useWikitaLiteOverflowShowMore'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_END, WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import { MESSAGES, t } from '../i18n'

interface Props {
  standalone?: boolean
  items?: HomeDidYouKnow[]
  loading?: boolean
  previewLimit?: number
  /** Empty card slots held at the end of the grid while the feed loads. */
  skeletons?: number
  listsVersion?: number
  /**
   * Reveal the next cards in place instead of navigating to the module's own
   * page. The owner grows `previewLimit` in response to `expand`.
   */
  expandable?: boolean
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 3,
  skeletons: 0,
  listsVersion: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

function titleSegments(item: HomeDidYouKnow) {
  return splitTitleEmphasis(item.text, item.emphasis)
}

/** MinT fallback hooks (wikis without their own "Did you know") say so once. */
const hasMachineTranslation = computed(() => displayItems.value.some((item) => item.machineTranslated))

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

const showMoreLink = useWikitaLiteOverflowShowMore({
  standalone: () => props.standalone,
  moreTo: () => props.moreTo,
  hasItems: () => displayItems.value.length > 0,
})

/*
 * Navigating always has somewhere to go; revealing in place only makes sense
 * while the feed holds more than the preview is showing.
 */
const showMoreControl = computed(
  () => showMoreLink.value && (!props.expandable || props.items.length > props.previewLimit),
)
</script>

<template>
  <div class="did-you-know-module">
    <CdxProgressBar v-if="standalone && loading" inline :aria-label="t('home.loadingDidYouKnow')" />

    <template v-else>
      <div
        :class="['did-you-know-module__cards', groupClass]"
        :aria-busy="skeletons > 0 || undefined"
      >
        <CdxCard
          v-for="(item, index) in displayItems"
          :key="`dyk-${index}`"
          :class="[cardClass, WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_END, WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE]"
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
        <WikitaLiteCardSkeletons :count="skeletons" />
      </div>

      <p v-if="hasMachineTranslation" class="did-you-know-module__mt-note">
        {{ MESSAGES.machineTranslated }}
      </p>
      <slot name="after-cards" />

      <WikitaLiteShowMore
        v-if="showMoreControl"
        :to="moreTo"
        :expandable="expandable"
        @expand="$emit('expand')"
      >
        {{ MESSAGES.showMore }}
      </WikitaLiteShowMore>

      <p v-if="standalone && !displayItems.length" class="did-you-know-module__empty">
        {{ MESSAGES.emptyDidYouKnow }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.did-you-know-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
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

.did-you-know-module__mt-note {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.did-you-know-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
