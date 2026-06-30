<script setup lang="ts">
import MusicalGroupOverviewArticleCard from './MusicalGroupOverviewArticleCard.vue'
import MusicalGroupOverviewEditOpportunityCard from './MusicalGroupOverviewEditOpportunityCard.vue'
import MusicalGroupOverviewImagesCard from './MusicalGroupOverviewImagesCard.vue'
import MusicalGroupOverviewRelatedCard from './MusicalGroupOverviewRelatedCard.vue'
import type { CarouselImage, MusicalGroupOverviewData } from './data/types'

interface Props {
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  carouselImages: CarouselImage[]
  enwikiTitle?: string
  showImagesTab?: boolean
}

withDefaults(defineProps<Props>(), {
  showImagesTab: true,
})
</script>

<template>
  <div v-if="!overviewLoading" class="musical-group-overview">
    <MusicalGroupOverviewArticleCard
      :article="overview?.article"
      :no-article="overview?.noEnglishArticle"
    />
    <MusicalGroupOverviewImagesCard
      :images="overview?.images"
      :carousel-images="carouselImages"
      :article-thumbnail-url="overview?.article?.thumbnailUrl"
      :show-images-tab="showImagesTab"
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
