<script setup lang="ts">
import MusicalGroupOverviewArticleCard from './MusicalGroupOverviewArticleCard.vue'
import MusicalGroupOverviewPhotosCard from './MusicalGroupOverviewPhotosCard.vue'
import type { CarouselImage, MusicalGroupOverviewData } from './data/types'

interface Props {
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  carouselImages: CarouselImage[]
}

defineProps<Props>()
</script>

<template>
  <div class="musical-group-overview">
    <MusicalGroupOverviewArticleCard
      :article="overview?.article"
      :loading="overviewLoading"
      :no-article="overview?.noEnglishArticle"
    />
    <MusicalGroupOverviewPhotosCard
      :photos="overview?.photos"
      :carousel-images="carouselImages"
      :loading="overviewLoading"
    />
  </div>
</template>

<style scoped>
.musical-group-overview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}
</style>
