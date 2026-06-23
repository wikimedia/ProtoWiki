<script setup lang="ts">
import ImageCarousel from './ImageCarousel.vue'
import MusicalGroupFacts from './MusicalGroupFacts.vue'
import MusicalGroupHeader from './MusicalGroupHeader.vue'
import MusicalGroupTabs from './MusicalGroupTabs.vue'
import type { MusicalGroupData } from './data/types'

interface Props {
  data: MusicalGroupData
  loadingImages?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="musical-group-screen">
    <div class="musical-group-screen__intro">
      <MusicalGroupHeader :data="data" />
      <ImageCarousel :images="data.images" :loading="loadingImages" />
    </div>
    <div class="musical-group-screen__details">
      <MusicalGroupFacts :data="data" />
      <MusicalGroupTabs />
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
</style>
