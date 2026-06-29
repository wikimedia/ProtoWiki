<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconImage } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import { overviewCarouselThumbnailUrl } from './data/carouselLayout'
import type { CarouselImage, MusicalGroupOverviewPhotos } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  photos?: MusicalGroupOverviewPhotos
  carouselImages: CarouselImage[]
  articleThumbnailUrl?: string
  /** When true, card reads “Photos” and links to the photos tab; otherwise “Images” with no tab link. */
  showPhotosTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPhotosTab: true,
})
const { tabRoute } = useMusicalGroupRoute()

const thumbnailUrl = computed(
  () =>
    overviewCarouselThumbnailUrl(props.carouselImages, {
      preferNonPrimary: !props.showPhotosTab,
    }) ?? props.articleThumbnailUrl,
)
const cardHref = computed(() => (props.showPhotosTab ? tabRoute('photos') : undefined))
const cardType = computed(() => (props.showPhotosTab ? 'Photos' : 'Images'))
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
    :show-snippet="false"
    :show-info="false"
    :title-bold="false"
    :type="cardType"
    :type-icon="cdxIconImage"
    title="Wikimedia commons"
    :body="photos?.itemCountLabel ?? ''"
    :thumbnail-url="thumbnailUrl"
    :show-thumbnail="Boolean(thumbnailUrl)"
  />
</template>
