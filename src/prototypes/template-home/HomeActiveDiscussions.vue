<script setup lang="ts">
/**
 * The Active discussions module's body: busy noticeboard threads, most recent
 * reply first. Only shown to Experienced editor and Real user (see `index.vue`).
 * On the Home it shows three cards and a "Show more"; as a `feed` (its own
 * page) every thread, as divider rows.
 */
import { computed, ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import HomeDiscussionCards from './HomeDiscussionCards.vue'
import HomeShowMore from './HomeShowMore.vue'
import { loadActiveDiscussions } from './loadActiveDiscussions'
import { useModuleLoad } from './useModuleLoad'

const props = defineProps<{
  /** The module's own page: every thread, as a feed. */
  feed?: boolean
}>()

/** Cards shown at first, and revealed by each "Show more". */
const PAGE_SIZE = 3

const {
  items: discussions,
  loading,
  error,
  reload,
} = useModuleLoad(
  () => 'all',
  (signal) => loadActiveDiscussions(signal),
)

const shown = ref(PAGE_SIZE)
const visible = computed(() =>
  props.feed ? discussions.value : discussions.value.slice(0, shown.value),
)
const hasMore = computed(() => shown.value < discussions.value.length)
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
  <div ref="root" class="home-active-discussions">
    <div v-if="error" class="home-active-discussions__error">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="reload">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !discussions.length" class="home-active-discussions__empty">
      Nothing here right now.
    </p>

    <template v-else>
      <HomeDiscussionCards
        :cards="visible"
        :loading="loading"
        :skeletons="PAGE_SIZE"
        :feed="feed"
      />

      <HomeShowMore
        v-if="!feed"
        module="active-discussions"
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
.home-active-discussions__error,
.home-active-discussions__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-active-discussions__error p {
  margin: 0;
}
</style>
