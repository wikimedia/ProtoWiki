<script setup lang="ts">
import { ref } from 'vue'

import ImageCarousel from './ImageCarousel.vue'
import MusicalGroupFacts from './MusicalGroupFacts.vue'
import MusicalGroupHeader from './MusicalGroupHeader.vue'
import MusicalGroupOverview from './MusicalGroupOverview.vue'
import MusicalGroupTabs from './MusicalGroupTabs.vue'
import type { MusicalGroupData, MusicalGroupOverviewData, TabId } from './data/types'

interface Props {
  data: MusicalGroupData
  overview?: MusicalGroupOverviewData
  overviewLoading?: boolean
  loadingImages?: boolean
}

defineProps<Props>()

const activeTab = ref<TabId>('overview')
</script>

<template>
  <div class="musical-group-screen">
    <div class="musical-group-screen__intro">
      <MusicalGroupHeader :data="data" />
      <ImageCarousel :images="data.images" :loading="loadingImages" />
    </div>
    <div class="musical-group-screen__details">
      <MusicalGroupFacts :data="data" />
      <MusicalGroupTabs v-model:active-tab="activeTab" />
      <div class="musical-group-screen__panel">
        <MusicalGroupOverview
          v-if="activeTab === 'overview'"
          :overview="overview"
          :overview-loading="overviewLoading"
          :carousel-images="data.images"
        />
        <p v-else class="musical-group-screen__placeholder">Coming soon</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.musical-group-screen {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
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
  gap: var(--spacing-100);
}

.musical-group-screen__panel {
  min-width: 0;
}

.musical-group-screen__placeholder {
  margin: 0;
  color: var(--color-subtle);
}
</style>
