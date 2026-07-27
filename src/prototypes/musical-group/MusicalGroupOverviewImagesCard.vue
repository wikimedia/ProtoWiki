<script setup lang="ts">
import { computed } from 'vue'

import { cdxIconImage } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import { overviewCarouselThumbnailUrl } from './data/carouselLayout'
import type { CarouselImage, MusicalGroupOverviewImages } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'

interface Props {
  images?: MusicalGroupOverviewImages
  carouselImages: CarouselImage[]
  articleThumbnailUrl?: string
  /** When true, card links to the Images tab; otherwise no tab link. */
  showImagesTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showImagesTab: true,
})
const { tabRoute } = useMusicalGroupRoute()

const thumbnailUrl = computed(
  () =>
    overviewCarouselThumbnailUrl(props.carouselImages, {
      preferNonPrimary: !props.showImagesTab,
    }) ?? props.articleThumbnailUrl,
)
const cardHref = computed(() => (props.showImagesTab ? tabRoute('images') : undefined))
</script>

<template>
  <WikitaCardItem
    :href="cardHref"
    :show-snippet="false"
    :show-info="false"
    :title-bold="false"
    type="Images"
    :type-icon="cdxIconImage"
    title="Wikimedia commons"
    :body="images?.itemCountLabel ?? ''"
    :thumbnail-url="thumbnailUrl"
    :show-thumbnail="Boolean(thumbnailUrl)"
  />
</template>
