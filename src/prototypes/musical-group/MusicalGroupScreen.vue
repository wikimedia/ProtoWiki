<script setup lang="ts">
import { computed, watch } from 'vue'

import ImageCarousel from './ImageCarousel.vue'
import MusicalGroupFacts from './MusicalGroupFacts.vue'
import WikitaCardTable from './components/WikitaCardTable.vue'
import MusicalGroupOverview from './MusicalGroupOverview.vue'
import MusicalGroupTabs from './MusicalGroupTabs.vue'
import type { MusicalGroupData, MusicalGroupOverviewData } from './data/types'
import { hasPhotosTab } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'
import { useMusicalGroupScrollStates } from './useMusicalGroupScrollStates'

interface Props {
  data: MusicalGroupData
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  loadingImages?: boolean
}

const props = defineProps<Props>()

const { activeTab, setTab } = useMusicalGroupRoute()

useMusicalGroupScrollStates()

const showRichIntro = computed(
  () => props.data.isMusicPerformer || props.data.isLocation,
)
const showPhotosTab = computed(() => hasPhotosTab(props.data))

watch(
  [activeTab, showPhotosTab],
  ([tab, photosAllowed]) => {
    if (tab === 'photos' && !photosAllowed) {
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
        />
      </div>
      <MusicalGroupFacts :data="data" />
    </template>
    <div class="musical-group-screen__details">
      <div class="musical-group-screen__tabs-section">
        <MusicalGroupTabs
          :active-tab="activeTab"
          :show-photos-tab="showPhotosTab"
          @update:active-tab="setTab"
        />
        <div class="musical-group-screen__panel">
          <MusicalGroupOverview
            v-if="activeTab === 'overview'"
            :overview="overview"
            :overview-loading="overviewLoading"
            :carousel-images="data.images"
            :enwiki-title="data.enwikiTitle"
            :show-photos-tab="showPhotosTab"
          />
          <WikitaCardTable
            v-else-if="activeTab === 'info' && !overviewLoading"
            :rows="overview?.infobox?.rows ?? []"
            :info-left="overview?.article?.lastEditedLabel"
            info-right="English Wikipedia"
          />
          <div v-else class="musical-group-screen__placeholder"></div>
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
