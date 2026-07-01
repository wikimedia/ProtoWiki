<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import MusicalGroupOverviewArticleCard from './MusicalGroupOverviewArticleCard.vue'
import MusicalGroupOverviewEditOpportunityCard from './MusicalGroupOverviewEditOpportunityCard.vue'
import MusicalGroupOverviewImagesCard from './MusicalGroupOverviewImagesCard.vue'
import MusicalGroupOverviewLatestEditCard from './MusicalGroupOverviewLatestEditCard.vue'
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
  overviewExtrasLoading?: boolean
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

/** When Related and Mentioned resolve to the same article, fold the snippet into Related. */
const mergedSnippetHtml = computed(() => {
  const related = props.overview?.related
  const snippet = props.overview?.snippet
  if (!related || !snippet) return undefined
  return isSameArticle(related, snippet) ? snippet.snippetHtml : undefined
})

const showImagesCard = computed(() => {
  if (Boolean(props.overview?.images?.itemCountLabel)) return true
  return props.showImagesTab && props.carouselImages.length > 0
})

const showRelatedCard = computed(
  () => Boolean(props.overview?.related) && !isCurrentItem(props.overview!.related!),
)

const showSnippetCard = computed(() => {
  const snippet = props.overview?.snippet
  if (!snippet || mergedSnippetHtml.value) return false
  return !isCurrentItem(snippet)
})

const showInitialLoading = computed(
  () => props.overviewLoading && !props.overview?.article && !props.overview?.noEnglishArticle,
)
</script>

<template>
  <div v-if="showInitialLoading" class="musical-group-overview musical-group-overview--loading">
    <CdxProgressBar inline aria-label="Loading overview" />
  </div>
  <div v-else class="musical-group-overview">
    <MusicalGroupOverviewArticleCard
      v-if="overview?.article && !overview?.noEnglishArticle"
      :article="overview.article"
    />
    <p v-else-if="overview?.noEnglishArticle" class="musical-group-overview__empty">
      No English Wikipedia article.
    </p>
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
    <MusicalGroupOverviewLatestEditCard
      v-if="overview?.latestEdit"
      :change="overview.latestEdit"
      :thumbnail-url="overview?.article?.thumbnailUrl"
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
    <div v-if="overviewExtrasLoading" class="musical-group-overview__extras-loading">
      <CdxProgressBar inline aria-label="Loading overview suggestions" />
    </div>
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

.musical-group-overview__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.musical-group-overview__extras-loading {
  padding-block: var(--spacing-50);
}
</style>
