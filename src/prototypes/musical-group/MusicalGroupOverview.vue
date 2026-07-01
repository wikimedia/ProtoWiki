<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import MusicalGroupOverviewArticleCard from './MusicalGroupOverviewArticleCard.vue'
import MusicalGroupOverviewEditOpportunityCard from './MusicalGroupOverviewEditOpportunityCard.vue'
import MusicalGroupOverviewImagesCard from './MusicalGroupOverviewImagesCard.vue'
import MusicalGroupOverviewRelatedCard from './MusicalGroupOverviewRelatedCard.vue'
import MusicalGroupOverviewSnippetCard from './MusicalGroupOverviewSnippetCard.vue'
import { enwikiTitlesMatch } from './data/enwikiTitle'
import type {
  CarouselImage,
  MusicalGroupOverviewData,
  MusicalGroupOverviewRelated,
  MusicalGroupOverviewSnippet,
} from './data/types'
import { normalizeQid } from './data/wikidataApi'

interface Props {
  itemId?: string
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  carouselImages: CarouselImage[]
  enwikiTitle?: string
  showImagesTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showImagesTab: true,
})

function isCurrentItem(
  candidate: Pick<MusicalGroupOverviewRelated, 'id' | 'title'>,
): boolean {
  if (props.itemId && candidate.id && normalizeQid(candidate.id) === normalizeQid(props.itemId)) {
    return true
  }
  if (props.enwikiTitle && enwikiTitlesMatch(candidate.title, props.enwikiTitle)) {
    return true
  }
  return false
}

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

const showRelatedCard = computed(
  () => Boolean(props.overview?.related) && !isCurrentItem(props.overview!.related!),
)

const showSnippetCard = computed(() => {
  const snippet = props.overview?.snippet
  if (!snippet || mergedSnippetHtml.value) return false
  return !isCurrentItem(snippet)
})

const showImagesCard = computed(() => {
  if (Boolean(props.overview?.images?.itemCountLabel)) return true
  return props.showImagesTab && props.carouselImages.length > 0
})
</script>

<template>
  <div v-if="overviewLoading" class="musical-group-overview musical-group-overview--loading">
    <CdxProgressBar inline aria-label="Loading overview" />
  </div>
  <div v-else class="musical-group-overview">
    <MusicalGroupOverviewArticleCard
      v-if="overview?.article && !overview?.noEnglishArticle"
      :article="overview.article"
    />
    <MusicalGroupOverviewImagesCard
      v-if="showImagesCard"
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
      v-if="showRelatedCard"
      :related="overview!.related!"
      :snippet-html="mergedSnippetHtml"
    />
    <MusicalGroupOverviewSnippetCard
      v-if="showSnippetCard"
      :snippet="overview!.snippet!"
    />
  </div>
</template>

<style scoped>
.musical-group-overview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.musical-group-overview--loading {
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}
</style>
