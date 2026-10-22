<script setup lang="ts">
/**
 * The Review changes module's body: the latest edit to each of the reader's
 * pages, newest first, flagged for review. Only shown to readers with pages
 * (see `index.vue`). Desktop and mobile both reveal more cards in place.
 */
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCollapse } from '@wikimedia/codex-icons'

import HomeChangeCards from './HomeChangeCards.vue'
import { loadReviewChanges } from './loadReviewChanges'
import { useHomeSeeds } from './useHomeSeeds'
import { useModuleLoad } from './useModuleLoad'

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

const visible = computed(() => changes.value.slice(0, shown.value))
const hasMore = computed(() => shown.value < changes.value.length)
const expanded = computed(() => shown.value > PAGE_SIZE)

function revealMore(): void {
  shown.value += PAGE_SIZE
}

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
      <HomeChangeCards :cards="visible" :loading="loading" :skeletons="PAGE_SIZE" />

      <div v-if="hasMore || expanded" class="home-review-changes__more-row">
        <CdxButton v-if="hasMore" :disabled="loading" @click="revealMore">Show more</CdxButton>
        <CdxButton
          v-if="expanded"
          class="home-review-changes__collapse"
          weight="quiet"
          aria-label="Show fewer"
          @click="collapse"
        >
          <CdxIcon :icon="cdxIconCollapse" />
        </CdxButton>
      </div>
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

/* "Show more" hugs its label at the start, the collapse button sits at the end. */
.home-review-changes__more-row {
  display: flex;
  align-items: center;
  margin-top: var(--spacing-75);
}

.home-review-changes__collapse {
  margin-inline-start: auto;
}
</style>
