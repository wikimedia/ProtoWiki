<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ImageCarousel from './ImageCarousel.vue'
import MusicalGroupArticle from './MusicalGroupArticle.vue'
import MusicalGroupFacts from './MusicalGroupFacts.vue'
import MusicalGroupLinks from './MusicalGroupLinks.vue'
import MusicalGroupPhotos from './MusicalGroupPhotos.vue'
import WikitaCardTable from './components/WikitaCardTable.vue'
import MusicalGroupOverview from './MusicalGroupOverview.vue'
import MusicalGroupTabs from './MusicalGroupTabs.vue'
import {
  formatCarouselOverflowCount,
  MAX_CAROUSEL_IMAGES,
} from './data/commonsImages'
import type { MusicalGroupData, MusicalGroupOverviewData, WikidataExternalLink } from './data/types'
import { hasImagesTab } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'
import { useMusicalGroupScrollStates } from './useMusicalGroupScrollStates'
import { useMusicalGroupTabScroll } from './useMusicalGroupTabScroll'

interface Props {
  data: MusicalGroupData
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  loadingImages?: boolean
  externalLinks?: WikidataExternalLink[]
  linksLoading?: boolean
  linksError?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  externalLinks: () => [],
  linksLoading: false,
  linksError: null,
})

const { activeTab, setTab } = useMusicalGroupRoute()

useMusicalGroupScrollStates()
const { requestScrollToTabContent, scrollToTabContent } = useMusicalGroupTabScroll()

const showRichIntro = computed(
  () => props.data.isMusicPerformer || props.data.isLocation,
)
const showImagesTab = computed(() => hasImagesTab(props.data))

const showInfoTab = computed(() => {
  if (props.overviewLoading) return false
  return (props.overview?.infobox?.rows?.length ?? 0) > 0
})

const showArticleTab = computed(() => {
  if (props.overviewLoading) return false
  return Boolean(props.overview?.article) && !props.overview?.noEnglishArticle
})

const showLinksTab = computed(
  () => !props.linksLoading && props.externalLinks.length > 0,
)

const imagesTabEverOpened = ref(false)

watch(activeTab, (tab) => {
  if (tab === 'images') imagesTabEverOpened.value = true
})

watch(
  () => props.data.id,
  () => {
    imagesTabEverOpened.value = false
  },
)

function viewAllImages() {
  if (activeTab.value === 'images') {
    scrollToTabContent()
    return
  }

  requestScrollToTabContent()
  void setTab('images')
}

const moreImagesCountLabel = computed(() => {
  let count = props.data.commonsImageCount
  let capped = props.data.commonsImageCountCapped ?? false

  if (count == null && props.data.images.length >= MAX_CAROUSEL_IMAGES) {
    count = props.data.images.length
    capped = true
  }

  if (!count || count <= 0) return undefined

  const effectiveCapped = capped || count > props.data.images.length
  return formatCarouselOverflowCount(count, effectiveCapped)
})

watch(
  [activeTab, showArticleTab, showImagesTab, showInfoTab, showLinksTab],
  ([tab, articleAllowed, imagesAllowed, infoAllowed, linksAllowed]) => {
    if (tab === 'article' && !articleAllowed) {
      void setTab('overview')
    }
    if (tab === 'images' && !imagesAllowed) {
      void setTab('overview')
    }
    if (tab === 'info' && !infoAllowed) {
      void setTab('overview')
    }
    if (tab === 'links' && !linksAllowed) {
      void setTab('overview')
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="musical-group-screen">
    <template v-if="showRichIntro">
      <div class="musical-group-screen__intro">
        <ImageCarousel
          :images="data.images"
          :description="data.description"
          :loading="loadingImages"
          :show-more-images="showImagesTab && Boolean(moreImagesCountLabel)"
          :more-count-label="moreImagesCountLabel"
          @view-all-images="viewAllImages"
        />
      </div>
      <MusicalGroupFacts :data="data" />
    </template>
    <div class="musical-group-screen__details">
      <div class="musical-group-screen__tabs-section">
        <MusicalGroupTabs
          :active-tab="activeTab"
          :show-article-tab="showArticleTab"
          :show-images-tab="showImagesTab"
          :show-info-tab="showInfoTab"
          :show-links-tab="showLinksTab"
          @update:active-tab="setTab"
        />
        <div class="musical-group-screen__panel">
          <MusicalGroupOverview
            v-if="activeTab === 'overview'"
            :overview="overview"
            :overview-loading="overviewLoading"
            :carousel-images="data.images"
            :enwiki-title="data.enwikiTitle"
            :show-images-tab="showImagesTab"
          />
          <WikitaCardTable
            v-else-if="activeTab === 'info' && !overviewLoading"
            :rows="overview?.infobox?.rows ?? []"
            :info-left="overview?.article?.lastEditedLabel"
            info-right="English Wikipedia"
          />
          <MusicalGroupArticle
            v-else-if="activeTab === 'article'"
            :title="data.enwikiTitle"
          />
          <MusicalGroupLinks
            v-else-if="activeTab === 'links'"
            :links="externalLinks"
            :loading="linksLoading"
            :error="linksError"
          />
          <div v-else-if="activeTab !== 'images'" class="musical-group-screen__placeholder"></div>
          <MusicalGroupPhotos
            v-if="showImagesTab && (activeTab === 'images' || imagesTabEverOpened)"
            v-show="activeTab === 'images'"
            :data="data"
            :active="activeTab === 'images'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.musical-group-screen {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-50);
  background-color: var(--background-color-base);
}

.musical-group-screen__intro {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.musical-group-screen__details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.musical-group-screen__tabs-section {
  display: flex;
  flex-direction: column;
}

.musical-group-screen__panel {
  min-width: 0;
  min-height: var(--musical-group-tab-panel-min-height);
}

.musical-group-screen__placeholder {
  margin: 0;
  color: var(--color-subtle);
}
</style>
