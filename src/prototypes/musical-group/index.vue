<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { loadMusicalGroup } from './data/loadMusicalGroup'
import { loadMusicalGroupOverview, isCachedOverviewUsable } from './data/loadMusicalGroupOverview'
import { getCachedMusicalGroup } from './data/musicalGroupCache'
import type { MusicalGroupData, MusicalGroupOverviewData } from './data/types'
import { normalizeQid } from './data/wikidataApi'
import MusicalGroupChromeHeader from './MusicalGroupChromeHeader.vue'
import MusicalGroupScreen from './MusicalGroupScreen.vue'
import MusicalGroupSplash from './MusicalGroupSplash.vue'
import MusicalGroupTitleRow from './MusicalGroupTitleRow.vue'

import { CdxToastContainer } from '@wikimedia/codex'

definePage({
  meta: {
    title: 'Musical group overview',
    description:
      'Mobile overview screen for Wikidata musical groups, powered by live entity + Commons data.',
  },
})

const route = useRoute()

const itemId = computed(() => normalizeQid(route.query.item))
const data = ref<MusicalGroupData | null>(null)
const overview = ref<MusicalGroupOverviewData | undefined>(undefined)
const loading = ref(false)
const overviewLoading = ref(false)
const fetchError = ref<string | null>(null)
const validationFailed = ref(false)

let fetchAbort: AbortController | null = null
let overviewAbort: AbortController | null = null

async function loadItem(id: string) {
  fetchAbort?.abort()
  fetchAbort = new AbortController()

  overviewAbort?.abort()
  overview.value = undefined
  overviewLoading.value = false

  const cached = getCachedMusicalGroup(id)
  if (cached) {
    loading.value = false
    fetchError.value = null
    validationFailed.value = false
    data.value = cached.data
    return
  }

  loading.value = true
  fetchError.value = null
  validationFailed.value = false
  data.value = null

  try {
    const { data: loaded } = await loadMusicalGroup(id, { signal: fetchAbort.signal })
    data.value = loaded
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    if ((err as Error).message === 'Not a musical group') {
      validationFailed.value = true
      fetchError.value = 'That item is not a musical group (or subclass).'
      return
    }
    fetchError.value = 'Could not load this musical group. Try again.'
  } finally {
    loading.value = false
  }
}

async function loadOverview(id: string, groupData: MusicalGroupData) {
  overviewAbort?.abort()
  overviewAbort = new AbortController()

  const cached = getCachedMusicalGroup(id)
  if (cached?.overview && isCachedOverviewUsable(cached.overview)) {
    overview.value = cached.overview
    overviewLoading.value = false
    return
  }

  overviewLoading.value = true

  try {
    const { overview: loaded } = await loadMusicalGroupOverview(id, groupData, {
      signal: overviewAbort.signal,
    })
    overview.value = loaded
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
  } finally {
    overviewLoading.value = false
  }
}

watch(
  itemId,
  (id) => {
    if (!id) {
      fetchAbort?.abort()
      overviewAbort?.abort()
      data.value = null
      overview.value = undefined
      loading.value = false
      overviewLoading.value = false
      fetchError.value = null
      validationFailed.value = false
      return
    }
    void loadItem(id)
  },
  { immediate: true },
)

watch(
  [itemId, data],
  ([id, groupData]) => {
    if (!id || !groupData) return
    if (overview.value) return
    void loadOverview(id, groupData)
  },
  { immediate: true },
)

const showSplash = computed(() => !itemId.value || validationFailed.value)
const showEntityChrome = computed(() => Boolean(itemId.value) && !validationFailed.value)
</script>

<template>
  <div class="musical-group-shell">
    <CdxToastContainer />
    <div class="musical-group-page">
      <MusicalGroupSplash v-if="showSplash" :error="fetchError" />

      <template v-else>
        <div v-if="showEntityChrome" class="musical-group-chrome-stack">
          <MusicalGroupChromeHeader />
          <MusicalGroupTitleRow v-if="data" :data="data" />
        </div>

        <div v-if="loading && !data" class="musical-group-page__loading">Loading…</div>

        <div v-else-if="fetchError" class="musical-group-page__error">
          <p>{{ fetchError }}</p>
          <MusicalGroupSplash />
        </div>

        <MusicalGroupScreen
          v-else-if="data"
          :data="data"
          :overview="overview"
          :overview-loading="overviewLoading"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.musical-group-shell {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background-color: var(--background-color-neutral);
}

[data-theme='dark'] .musical-group-shell {
  background-color: var(--background-color-neutral-subtle);
}

.musical-group-page {
  --musical-group-chrome-height: 42px;
  --musical-group-title-height: 47px;
  --musical-group-chrome-stack-height: calc(
    var(--musical-group-chrome-height) + var(--spacing-50) + var(--musical-group-title-height)
  );
  --musical-group-tabs-sticky-top: calc(
    var(--musical-group-chrome-stack-height) + var(--spacing-50)
  );
  --musical-group-tabs-height: 46px;
  --musical-group-tab-panel-min-height: calc(
    100dvh - var(--musical-group-tabs-sticky-top) - var(--musical-group-tabs-height) -
      var(--spacing-50)
  );

  box-sizing: border-box;
  max-width: 412px;
  height: 100%;
  max-height: 100dvh;
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background-color: var(--background-color-base);
}

.musical-group-page__loading,
.musical-group-page__error {
  padding: var(--spacing-250) var(--spacing-150);
  color: var(--color-subtle);
}

.musical-group-page__error p {
  color: var(--color-error);
}

.musical-group-chrome-stack {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  background-color: var(--background-color-base);
  container-type: scroll-state;
  container-name: musical-group-chrome-stack;
}
</style>

<!-- Title rule expands only while sticky chrome overlaps the carousel; retracts when tabs stick -->
<style>
.musical-group-page[data-title-expanded]:not([data-tabs-stuck])
  .musical-group-chrome-stack
  .musical-group-title-row::after {
  left: 0;
  right: 0;
}

.musical-group-page[data-tabs-stuck] .musical-group-chrome-stack .musical-group-title-row::after {
  left: var(--spacing-50);
  right: var(--spacing-50);
}

.musical-group-page[data-tabs-stuck]:not([data-scroll-at-end]) .musical-group-tabs::before {
  bottom: calc(100% - 1px);
  height: calc(var(--spacing-50) + 1px);
}

.musical-group-page[data-tabs-stuck]:not([data-scroll-at-end]) .musical-group-tabs::after {
  transform: scaleY(1);
}
</style>
