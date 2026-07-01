<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resetAllStoredData } from './data/resetAllStoredData'
import {
  loadHeaderVariantPreference,
  saveHeaderVariantPreference,
} from './data/headerVariantPreference'
import { loadMusicalGroup } from './data/loadMusicalGroup'
import { loadMusicalGroupOverview, isCachedOverviewUsable } from './data/loadMusicalGroupOverview'
import { getCachedMusicalGroup } from './data/musicalGroupCache'
import type { MusicalGroupData, MusicalGroupOverviewData } from './data/types'
import { normalizeQid } from './data/wikidataApi'
import WikitaChromeHeader, {
  type WikitaChromeHeaderVariant,
} from './components/WikitaChromeHeader.vue'
import MusicalGroupHome from './MusicalGroupHome.vue'
import MusicalGroupScreen from './MusicalGroupScreen.vue'
import MusicalGroupSearch from './MusicalGroupSearch.vue'
import MusicalGroupTitleRow from './MusicalGroupTitleRow.vue'
import { useEntityExternalLinks } from './useEntityExternalLinks'

import { CdxProgressBar, CdxToastContainer } from '@wikimedia/codex'

definePage({
  meta: {
    title: 'Wikita',
    description: 'Browse Wikidata items in Wikita.',
  },
})

const route = useRoute()
const router = useRouter()

const itemId = computed(() => normalizeQid(route.query.item))
const data = ref<MusicalGroupData | null>(null)
const overview = ref<MusicalGroupOverviewData | undefined>(undefined)
const loading = ref(false)
const imagesLoading = ref(false)
const overviewLoading = ref(false)
const fetchError = ref<string | null>(null)
const searchOpen = ref(false)
const headerVariant = ref<WikitaChromeHeaderVariant>(loadHeaderVariantPreference())

const { links: externalLinks, loading: linksLoading, error: linksError } =
  useEntityExternalLinks(itemId)

watch(headerVariant, (variant) => {
  saveHeaderVariantPreference(variant)
})

let fetchAbort: AbortController | null = null
let overviewAbort: AbortController | null = null
let overviewFetchId: string | null = null

async function loadItem(id: string) {
  fetchAbort?.abort()
  fetchAbort = new AbortController()
  const { signal } = fetchAbort

  overviewAbort?.abort()
  overview.value = undefined
  overviewLoading.value = false
  overviewFetchId = null

  const cached = getCachedMusicalGroup(id)
  if (cached) {
    loading.value = false
    imagesLoading.value = false
    fetchError.value = null
    data.value = cached.data
    return
  }

  loading.value = true
  imagesLoading.value = false
  fetchError.value = null
  data.value = null

  try {
    const { data: loaded } = await loadMusicalGroup(id, {
      signal,
      onPartial: (partial) => {
        if (signal.aborted) return
        // Paint title + facts immediately; carousel shows a skeleton until
        // Stage 1 images arrive.
        data.value = partial
        loading.value = false
        imagesLoading.value = true
      },
    })
    if (signal.aborted) return
    data.value = loaded
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    fetchError.value = 'Could not load this item. Try again.'
  } finally {
    if (!signal.aborted) {
      loading.value = false
      imagesLoading.value = false
    }
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
      overviewFetchId = null
      data.value = null
      overview.value = undefined
      loading.value = false
      imagesLoading.value = false
      overviewLoading.value = false
      fetchError.value = null
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
    // `data` is set twice under progressive loading (partial then full); the
    // overview only depends on `enwikiTitle`, so fetch it once per id.
    if (overviewFetchId === id) return
    overviewFetchId = id
    void loadOverview(id, groupData)
  },
  { immediate: true },
)

watch(itemId, (id) => {
  if (id) searchOpen.value = false
})

const showSearch = computed(() => searchOpen.value)
const showHome = computed(() => !itemId.value && !searchOpen.value)
const showEntityChrome = computed(() => Boolean(itemId.value) && !searchOpen.value)

function onToggleSearch() {
  searchOpen.value = !searchOpen.value
}

async function onGoHome() {
  searchOpen.value = false
  if (!itemId.value) return
  const query = { ...route.query }
  delete query.item
  delete query.tab
  await router.replace({ query })
}

async function onNavigate(id: string) {
  searchOpen.value = false
  const query = { ...route.query, item: id }
  delete query.tab
  await router.replace({ query })
}

async function onResetStoredData() {
  resetAllStoredData()

  fetchAbort?.abort()
  overviewAbort?.abort()
  overviewFetchId = null
  data.value = null
  overview.value = undefined
  loading.value = false
  imagesLoading.value = false
  overviewLoading.value = false
  fetchError.value = null
  searchOpen.value = false

  const query = { ...route.query, item: undefined }
  await router.replace({ query })
}
</script>

<template>
  <div class="musical-group-shell">
    <CdxToastContainer />
    <div class="musical-group-page">
      <MusicalGroupSearch
        v-if="showSearch"
        v-model:header-variant="headerVariant"
        :error="fetchError"
        @navigate="onNavigate"
        @toggle-search="onToggleSearch"
        @reset-stored-data="onResetStoredData"
        @go-home="onGoHome"
      />

      <MusicalGroupHome
        v-else-if="showHome"
        v-model:header-variant="headerVariant"
        @toggle-search="onToggleSearch"
        @reset-stored-data="onResetStoredData"
        @go-home="onGoHome"
      />

      <template v-else>
        <div v-if="showEntityChrome" class="musical-group-chrome-stack">
          <WikitaChromeHeader
            v-model:variant="headerVariant"
            @toggle-search="onToggleSearch"
            @reset-stored-data="onResetStoredData"
            @go-home="onGoHome"
          />
          <MusicalGroupTitleRow v-if="data" :data="data" />
        </div>

        <div v-if="loading && !data" class="musical-group-page__loading">
          <CdxProgressBar inline aria-label="Loading" />
        </div>

        <div v-else-if="fetchError" class="musical-group-page__error">
          <p>{{ fetchError }}</p>
        </div>

        <MusicalGroupScreen
          v-else-if="data"
          :data="data"
          :overview="overview"
          :overview-loading="overviewLoading"
          :loading-images="imagesLoading"
          :external-links="externalLinks"
          :links-loading="linksLoading"
          :links-error="linksError"
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
  --musical-group-chrome-height: 40px;
  --musical-group-title-height: 76px;
  --musical-group-chrome-stack-height: calc(
    var(--musical-group-chrome-height) + var(--spacing-50) + var(--musical-group-title-height)
  );
  --musical-group-tabs-sticky-top: calc(
    var(--musical-group-chrome-stack-height) + var(--spacing-50)
  );
  --musical-group-tabs-height: 46px;
  --musical-group-scroll-margin-top: 186px;
  --musical-group-title-collapse-padding: 0px;
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
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  background-color: var(--background-color-base);
}

.musical-group-page__loading,
.musical-group-page__error {
  padding: var(--spacing-250) var(--spacing-150);
}

.musical-group-page__error p {
  color: var(--color-error);
}
</style>

<!-- Sticky chrome applies to every view inside the scroll page (home, entity, etc.) -->
<style>
.musical-group-page .musical-group-chrome-stack {
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

<!-- Title rule expands only while sticky chrome overlaps the carousel track; retracts when tabs stick -->
<style>
.musical-group-page[data-title-expanded]:not([data-tabs-stuck])
  .musical-group-chrome-stack
  .wikita-title__header::after {
  left: calc(-1 * var(--spacing-50));
  right: calc(-1 * var(--spacing-50));
}

.musical-group-page[data-tabs-stuck] .musical-group-chrome-stack .wikita-title__header::after {
  left: 0;
  right: 0;
}

.musical-group-page[data-scrolled] .wikita-title__title {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  -webkit-box-orient: unset;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Offset chrome shrink so document positions (and scroll) stay stable. */
.musical-group-page[data-scrolled] .musical-group-screen {
  padding-top: calc(var(--spacing-50) + var(--musical-group-title-collapse-padding, 0px));
}

.musical-group-page[data-tabs-stuck] .musical-group-tabs::before {
  bottom: calc(100% - 1px);
  height: calc(var(--spacing-50) + 1px);
}

.musical-group-page[data-page-scrolled] .musical-group-tabs::after {
  transform: scaleY(1);
}

.musical-group-page :is([id^='cite_note-'], [id^='cite_ref-']) {
  scroll-margin-top: var(--musical-group-scroll-margin-top);
}
</style>
