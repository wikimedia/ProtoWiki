<script setup lang="ts">
import MusicalGroupOverviewArticleCard from './MusicalGroupOverviewArticleCard.vue'
import MusicalGroupOverviewEditOpportunityCard from './MusicalGroupOverviewEditOpportunityCard.vue'
import MusicalGroupOverviewPhotosCard from './MusicalGroupOverviewPhotosCard.vue'
import MusicalGroupOverviewRelatedCard from './MusicalGroupOverviewRelatedCard.vue'
import type { CarouselImage, MusicalGroupOverviewData } from './data/types'

interface Props {
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  carouselImages: CarouselImage[]
  enwikiTitle?: string
}

defineProps<Props>()
</script>

<template>
  <div v-if="!overviewLoading" class="musical-group-overview">
    <MusicalGroupOverviewArticleCard
      :article="overview?.article"
      :no-article="overview?.noEnglishArticle"
    />
    <MusicalGroupOverviewPhotosCard
      :photos="overview?.photos"
      :carousel-images="carouselImages"
    />
    <MusicalGroupOverviewRelatedCard
      v-if="overview?.related"
      :related="overview.related"
    />
    <MusicalGroupOverviewEditOpportunityCard
      v-if="overview?.editOpportunity"
      :edit-opportunity="overview.editOpportunity"
      :enwiki-title="enwikiTitle"
      :article-thumbnail-url="overview?.article?.thumbnailUrl"
    />
  </div>
</template>

<style scoped>
.musical-group-overview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
