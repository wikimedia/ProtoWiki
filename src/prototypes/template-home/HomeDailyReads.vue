<script setup lang="ts">
/**
 * The Daily reads module's body: three articles like the reader's own pages,
 * each saying which one it's related to; a reader with no pages gets one random
 * article, with no supporting text. Just its cards — no "Show more".
 */
import { computed } from 'vue'
import { CdxButton } from '@wikimedia/codex'
import { cdxIconLink } from '@wikimedia/codex-icons'

import HomeArticleCards from './HomeArticleCards.vue'
import { DAILY_READS_COUNT, loadDailyReads, RANDOM_READ_COUNT } from './loadDailyReads'
import { useHomeSeeds } from './useHomeSeeds'
import { useModuleLoad } from './useModuleLoad'

const { seeds, personal } = useHomeSeeds()

const { items: reads, loading, error, reload } = useModuleLoad(
  () => seeds.value.join('\n'),
  (signal) => loadDailyReads(seeds.value, signal),
)

const skeletons = computed(() => (personal.value ? DAILY_READS_COUNT : RANDOM_READ_COUNT))
</script>

<template>
  <div class="home-daily-reads">
    <div v-if="error" class="home-daily-reads__error">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="reload">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !reads.length" class="home-daily-reads__empty">
      Nothing here right now.
    </p>

    <HomeArticleCards
      v-else
      :cards="reads"
      :loading="loading"
      :skeletons="skeletons"
      :supporting-icon="cdxIconLink"
    />
  </div>
</template>

<style scoped>
.home-daily-reads__error,
.home-daily-reads__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-daily-reads__error p {
  margin: 0;
}
</style>
