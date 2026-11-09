<script setup lang="ts">
/**
 * The Review changes module's body: the latest edit to each of the reader's
 * pages, newest first, flagged for review. Only shown to readers with pages
 * (see `index.vue`). On the Home it shows three cards and a "Show more"; as a
 * `feed` (its own page) every change, as divider rows.
 */
import { computed, ref, watch } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import HomeChangeCards from './HomeChangeCards.vue'
import HomeShowMore from './HomeShowMore.vue'
import { loadReviewChanges } from './loadReviewChanges'
import { useHomeSeeds } from './useHomeSeeds'
import { useModuleLoad } from './useModuleLoad'

const props = defineProps<{
  /** The module's own page: every change, as a feed. */
  feed?: boolean
}>()

/** Cards shown at first, and revealed by each "Show more". */
const PAGE_SIZE = 3

const { seeds } = useHomeSeeds()

const seedsKey = () => seeds.value.join('\n')
const {
  items: changes,
  loading,
  error,
  reload,
} = useModuleLoad(seedsKey, (signal) => loadReviewChanges(seeds.value, signal))

const shown = ref(PAGE_SIZE)
// New pages to grow from start back at the first cards.
watch(seedsKey, () => {
  shown.value = PAGE_SIZE
})

const visible = computed(() =>
  props.feed ? changes.value : changes.value.slice(0, shown.value),
)
const hasMore = computed(() => shown.value < changes.value.length)
const expanded = computed(() => shown.value > PAGE_SIZE)

const root = ref<HTMLElement | null>(null)

/** Fold back, and bring the module into view if the reader had scrolled past it. */
function collapse(): void {
  shown.value = PAGE_SIZE
  const el = root.value
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
}
</script>

<template>
  <div ref="root" class="home-review-changes">
    <div v-if="error" class="home-review-changes__error">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="reload">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !changes.length" class="home-review-changes__empty">
      Nothing here right now.
    </p>

    <template v-else>
      <HomeChangeCards :cards="visible" :loading="loading" :skeletons="PAGE_SIZE" :feed="feed" />

      <HomeShowMore
        v-if="!feed"
        module="review-changes"
        :has-more="hasMore"
        :expanded="expanded"
        :disabled="loading"
        @more="shown += PAGE_SIZE"
        @collapse="collapse"
      />
    </template>
  </div>
</template>

<style scoped>
.home-review-changes__error,
.home-review-changes__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-review-changes__error p {
  margin: 0;
}
</style>
