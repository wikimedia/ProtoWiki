<script setup lang="ts">
import ImageCarousel from './ImageCarousel.vue'
import MusicalGroupFacts from './MusicalGroupFacts.vue'
import WikitaCardTable from './components/WikitaCardTable.vue'
import MusicalGroupOverview from './MusicalGroupOverview.vue'
import MusicalGroupTabs from './MusicalGroupTabs.vue'
import type { MusicalGroupData, MusicalGroupOverviewData } from './data/types'
import { useMusicalGroupRoute } from './useMusicalGroupRoute'
import { useMusicalGroupScrollStates } from './useMusicalGroupScrollStates'

interface Props {
  data: MusicalGroupData
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  loadingImages?: boolean
}

defineProps<Props>()

const { activeTab, setTab } = useMusicalGroupRoute()

useMusicalGroupScrollStates()
</script>

<template>
  <div class="musical-group-screen">
    <div class="musical-group-screen__intro">
      <ImageCarousel
        :images="data.images"
        :description="data.description"
        :loading="loadingImages"
      />
    </div>
    <div class="musical-group-screen__details">
      <MusicalGroupFacts :data="data" />
      <div class="musical-group-screen__tabs-section">
        <MusicalGroupTabs :active-tab="activeTab" @update:active-tab="setTab" />
        <div class="musical-group-screen__panel">
          <MusicalGroupOverview
            v-if="activeTab === 'overview'"
            :overview="overview"
            :overview-loading="overviewLoading"
            :carousel-images="data.images"
            :enwiki-title="data.enwikiTitle"
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
