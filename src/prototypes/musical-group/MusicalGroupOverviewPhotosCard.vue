<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconImage } from '@wikimedia/codex-icons'

import WikitaCard from './components/WikitaCard.vue'
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
  <WikitaCard
    :show-snippet="false"
    :show-info="false"
    :title-bold="false"
    type="Photos"
    :type-icon="cdxIconImage"
    title="Wikimedia commons"
    :body="photos?.itemCountLabel ?? ''"
    :thumbnail-url="thumbnailUrl"
    :show-thumbnail="Boolean(thumbnailUrl)"
  />
</template>
