<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconImage } from '@wikimedia/codex-icons'

import OverviewSummaryCard from './OverviewSummaryCard.vue'
import { offScreenCarouselThumbnailUrl } from './data/carouselLayout'
import type { CarouselImage, MusicalGroupOverviewPhotos } from './data/types'

interface Props {
  photos?: MusicalGroupOverviewPhotos
  carouselImages: CarouselImage[]
}

const props = defineProps<Props>()

const thumbnailUrl = computed(() => offScreenCarouselThumbnailUrl(props.carouselImages))
</script>

<template>
  <OverviewSummaryCard>
    <template #header>
      <div class="overview-photos-card__title-row">
        <CdxIcon :icon="cdxIconImage" class="overview-photos-card__icon" />
        <span class="overview-photos-card__title">Photos</span>
      </div>
    </template>

    <template #meta>
      <span>Wikimedia commons</span>
      <span v-if="photos?.itemCountLabel">{{ photos.itemCountLabel }}</span>
    </template>

    <template v-if="thumbnailUrl" #thumbnail>
      <img
        class="overview-summary-card__thumb"
        :src="thumbnailUrl"
        alt=""
        loading="lazy"
        draggable="false"
      />
    </template>
  </OverviewSummaryCard>
</template>

<style scoped>
.overview-photos-card__title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.overview-photos-card__icon {
  flex-shrink: 0;
}

.overview-photos-card__title {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
}
</style>
