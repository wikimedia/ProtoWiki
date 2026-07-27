<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ImageCarousel from './ImageCarousel.vue'
import MusicalGroupArticle from './MusicalGroupArticle.vue'
import MusicalGroupFacts from './MusicalGroupFacts.vue'
import MusicalGroupLinks from './MusicalGroupLinks.vue'
import MusicalGroupPhotos from './MusicalGroupPhotos.vue'
import WikitaCardTable from './components/WikitaCardTable.vue'
import WikitaActivityTabPanel from './components/WikitaActivityTabPanel.vue'
import WikitaContributeTabPanel from './components/WikitaContributeTabPanel.vue'
import MusicalGroupOverview from './MusicalGroupOverview.vue'
import MusicalGroupTabs from './MusicalGroupTabs.vue'
import {
  formatCarouselOverflowCount,
  MAX_CAROUSEL_IMAGES,
} from './data/commonsImages'
import {
  loadImagesTabOpenedPreference,
  saveImagesTabOpenedPreference,
} from './data/imagesTabPreference'
import type { HomeSavedItem, MusicalGroupData, MusicalGroupOverviewData, TabId, WikidataExternalLink } from './data/types'
import { hasImagesTab, showImageCarouselFor } from './data/types'
import { getMusicalGroupScrollPage, isMusicalGroupTabsStuck } from './musicalGroupScrollOffset'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'
import { useMusicalGroupScrollStates } from './useMusicalGroupScrollStates'
import { useMusicalGroupTabScroll } from './useMusicalGroupTabScroll'

interface Props {
  data: MusicalGroupData
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  overviewExtrasLoading?: boolean
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
const { requestScrollToTabContent, scrollToTabContent, scrollActiveTabToTop } =
  useMusicalGroupTabScroll()

async function handleSetTab(tab: TabId) {
  const sameTab = tab === activeTab.value
  await setTab(tab)
  if (!sameTab) return
  const page = getMusicalGroupScrollPage()
  if (page && isMusicalGroupTabsStuck(page)) {
    scrollActiveTabToTop()
  }
}

const showRichIntro = computed(
  () => props.data.isMusicPerformer || props.data.isLocation || props.data.isPerson,
)
const showImageCarousel = computed(() => showImageCarouselFor(props.data))
const showImagesTab = computed(() => hasImagesTab(props.data))

const showInfoTab = computed(() => (props.overview?.infobox?.rows?.length ?? 0) > 0)

const showArticleTab = computed(
  () => Boolean(props.overview?.article) && !props.overview?.noEnglishArticle,
)

const showActivityTab = computed(() => showArticleTab.value)
const showContributeTab = computed(() => showArticleTab.value)

const itemFeedItems = computed((): HomeSavedItem[] => {
  if (!showArticleTab.value) return []
  return [{
    id: props.data.id,
    title: props.data.label,
    enwikiTitle: props.data.enwikiTitle,
    description: props.data.description ?? '',
    thumbnailUrl: props.data.images[0]?.url,
    savedAt: 0,
  }]
})

const showLinksTab = computed(
  () => !props.linksLoading && props.externalLinks.length > 0,
)

const imagesTabEverOpened = ref(false)
const showImagesTabDot = ref(!loadImagesTabOpenedPreference())

watch(activeTab, (tab) => {
  if (tab !== 'images') return

  imagesTabEverOpened.value = true

  if (showImagesTabDot.value) {
    showImagesTabDot.value = false
    saveImagesTabOpenedPreference()
  }
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
  [activeTab, showArticleTab, showImagesTab, showInfoTab, showLinksTab, showActivityTab, showContributeTab],
  ([tab, articleAllowed, imagesAllowed, infoAllowed, linksAllowed, activityAllowed, contributeAllowed]) => {
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
    if (tab === 'activity' && !activityAllowed) {
      void setTab('overview')
    }
    if (tab === 'contribute' && !contributeAllowed) {
      void setTab('overview')
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="musical-group-screen">
    <p v-if="data.description" class="musical-group-screen__description">
      {{ data.description }}
    </p>

    <template v-if="showRichIntro">
      <div v-if="showImageCarousel" class="musical-group-screen__intro">
        <ImageCarousel
          :images="data.images"
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
          :show-images-tab-dot="showImagesTabDot"
          :show-info-tab="showInfoTab"
          :show-links-tab="showLinksTab"
          :show-activity-tab="showActivityTab"
          :show-contribute-tab="showContributeTab"
          @update:active-tab="handleSetTab"
        />
        <div class="musical-group-screen__panel">
          <MusicalGroupOverview
            v-if="activeTab === 'overview'"
            :item-id="data.id"
            :overview="overview"
            :overview-loading="overviewLoading"
            :overview-extras-loading="overviewExtrasLoading"
            :carousel-images="data.images"
            :enwiki-title="data.enwikiTitle"
            :show-images-tab="showImagesTab"
          />
          <WikitaCardTable
            v-else-if="activeTab === 'info'"
            :rows="overview?.infobox?.rows ?? []"
            :info-left="overview?.article?.lastEditedLabel"
            info-right="English Wikipedia"
          />
          <MusicalGroupArticle
            v-else-if="activeTab === 'article'"
            :title="data.enwikiTitle"
            :item-id="data.id"
          />
          <MusicalGroupLinks
            v-else-if="activeTab === 'links'"
            :links="externalLinks"
            :loading="linksLoading"
            :error="linksError"
          />
          <WikitaActivityTabPanel
            v-else-if="activeTab === 'activity'"
            :items="itemFeedItems"
            :active="activeTab === 'activity'"
            scope="item"
          />
          <WikitaContributeTabPanel
            v-else-if="activeTab === 'contribute'"
            :items="itemFeedItems"
            :active="activeTab === 'contribute'"
            scope="item"
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

.musical-group-screen__description {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  color: var(--color-emphasized);
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
}

.musical-group-screen__placeholder {
  margin: 0;
  color: var(--color-subtle);
  min-height: var(--musical-group-tab-panel-min-height);
}
</style>
