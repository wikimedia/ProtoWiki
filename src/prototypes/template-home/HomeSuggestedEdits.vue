<script setup lang="ts">
/**
 * The Suggested edits module's body: articles with something to improve, each
 * labelled with its task. Grows from the Mock user's pages (`useHomeSeeds`); a
 * reader with none gets one random suggestion. Desktop and mobile both reveal
 * more cards in place.
 */
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCollapse, cdxIconLightbulb } from '@wikimedia/codex-icons'

import HomeArticleCards from './HomeArticleCards.vue'
import { loadSuggestedEdits, RANDOM_SUGGESTION_COUNT } from './loadSuggestedEdits'
import { useHomeSeeds } from './useHomeSeeds'
import { useModuleLoad } from './useModuleLoad'

/** Cards shown at first, and revealed by each "Show more". */
const PAGE_SIZE = 3

const { seeds, personal } = useHomeSeeds()
const firstCount = computed(() => (personal.value ? PAGE_SIZE : RANDOM_SUGGESTION_COUNT))

const seedsKey = () => seeds.value.join('\n')
const {
  items: edits,
  loading,
  error,
  reload,
} = useModuleLoad(seedsKey, (signal) => loadSuggestedEdits(seeds.value, signal))

const shown = ref(firstCount.value)
// New pages to grow from start back at the first cards.
watch(seedsKey, () => {
  shown.value = firstCount.value
})

const visible = computed(() => edits.value.slice(0, shown.value))
const hasMore = computed(() => shown.value < edits.value.length)
const expanded = computed(() => shown.value > firstCount.value)

function revealMore(): void {
  shown.value += PAGE_SIZE
}

const root = ref<HTMLElement | null>(null)

/** Fold back, and bring the module into view if the reader had scrolled past it. */
function collapse(): void {
  shown.value = firstCount.value
  const el = root.value
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
}
</script>

<template>
  <div ref="root" class="home-suggested-edits">
    <div v-if="error" class="home-suggested-edits__error">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="reload">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !edits.length" class="home-suggested-edits__empty">
      Nothing here right now.
    </p>

    <template v-else>
      <HomeArticleCards
        :cards="visible"
        :loading="loading"
        :skeletons="firstCount"
        :supporting-icon="cdxIconLightbulb"
        progressive
      />

      <div v-if="hasMore || expanded" class="home-suggested-edits__more-row">
        <CdxButton v-if="hasMore" :disabled="loading" @click="revealMore">Show more</CdxButton>
        <CdxButton
          v-if="expanded"
          class="home-suggested-edits__collapse"
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
.home-suggested-edits__error,
.home-suggested-edits__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-suggested-edits__error p {
  margin: 0;
}

/* "Show more" hugs its label at the start, the collapse button sits at the end. */
.home-suggested-edits__more-row {
  display: flex;
  align-items: center;
  margin-top: var(--spacing-50);
}

.home-suggested-edits__collapse {
  margin-inline-start: auto;
}
</style>
