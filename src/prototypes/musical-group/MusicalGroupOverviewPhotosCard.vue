<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconImage } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import { offScreenCarouselThumbnailUrl } from './data/carouselLayout'
import type { CarouselImage, MusicalGroupOverviewPhotos } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  photos?: MusicalGroupOverviewPhotos
  carouselImages: CarouselImage[]
}

const props = defineProps<Props>()
const { tabRoute } = useMusicalGroupRoute()

const thumbnailUrl = computed(() => offScreenCarouselThumbnailUrl(props.carouselImages))
const cardHref = computed(() => tabRoute('photos'))
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
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
