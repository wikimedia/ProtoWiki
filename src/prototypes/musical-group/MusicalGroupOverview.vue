<script setup lang="ts">
import { computed } from 'vue'

import MusicalGroupOverviewArticleCard from './MusicalGroupOverviewArticleCard.vue'
import MusicalGroupOverviewEditOpportunityCard from './MusicalGroupOverviewEditOpportunityCard.vue'
import MusicalGroupOverviewImagesCard from './MusicalGroupOverviewImagesCard.vue'
import MusicalGroupOverviewRelatedCard from './MusicalGroupOverviewRelatedCard.vue'
import MusicalGroupOverviewSnippetCard from './MusicalGroupOverviewSnippetCard.vue'
import type {
  CarouselImage,
  MusicalGroupOverviewData,
  MusicalGroupOverviewRelated,
  MusicalGroupOverviewSnippet,
} from './data/types'

interface Props {
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  carouselImages: CarouselImage[]
  enwikiTitle?: string
  showImagesTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showImagesTab: true,
})

function isSameArticle(
  related: MusicalGroupOverviewRelated,
  snippet: MusicalGroupOverviewSnippet,
): boolean {
  if (related.id && snippet.id) return related.id === snippet.id
  return related.title.trim().toLowerCase() === snippet.title.trim().toLowerCase()
}

/** When the Related and Mention cards resolve to the same article, merge them:
 *  fold the mention snippet into the Related card and drop the standalone one. */
const mergedSnippetHtml = computed(() => {
  const related = props.overview?.related
  const snippet = props.overview?.snippet
  if (!related || !snippet) return undefined
  return isSameArticle(related, snippet) ? snippet.snippetHtml : undefined
})

const showSnippetCard = computed(
  () => Boolean(props.overview?.snippet) && !mergedSnippetHtml.value,
)
</script>

<template>
  <div v-if="!overviewLoading" class="musical-group-overview">
    <MusicalGroupOverviewArticleCard
      v-if="overview?.article && !overview?.noEnglishArticle"
      :article="overview.article"
    />
    <MusicalGroupOverviewImagesCard
      :images="overview?.images"
      :carousel-images="carouselImages"
      :article-thumbnail-url="overview?.article?.thumbnailUrl"
      :show-images-tab="showImagesTab"
    />
    <MusicalGroupOverviewEditOpportunityCard
      v-if="overview?.editOpportunity"
      :edit-opportunity="overview.editOpportunity"
      :enwiki-title="enwikiTitle"
      :article-title="overview?.article?.title"
      :article-thumbnail-url="overview?.article?.thumbnailUrl"
    />
    <MusicalGroupOverviewRelatedCard
      v-if="overview?.related"
      :related="overview.related"
      :snippet-html="mergedSnippetHtml"
    />
    <MusicalGroupOverviewSnippetCard
      v-if="showSnippetCard && overview?.snippet"
      :snippet="overview.snippet"
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
