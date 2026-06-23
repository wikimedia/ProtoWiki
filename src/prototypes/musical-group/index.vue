<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { loadMusicalGroup } from './data/loadMusicalGroup'
import { getCachedMusicalGroup } from './data/musicalGroupCache'
import type { MusicalGroupData } from './data/types'
import { normalizeQid } from './data/wikidataApi'
import MusicalGroupChromeHeader from './MusicalGroupChromeHeader.vue'
import MusicalGroupScreen from './MusicalGroupScreen.vue'
import MusicalGroupSplash from './MusicalGroupSplash.vue'

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
const loading = ref(false)
const fetchError = ref<string | null>(null)
const validationFailed = ref(false)

let fetchAbort: AbortController | null = null

async function loadItem(id: string) {
  fetchAbort?.abort()
  fetchAbort = new AbortController()

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

watch(
  itemId,
  (id) => {
    if (!id) {
      fetchAbort?.abort()
      data.value = null
      loading.value = false
      fetchError.value = null
      validationFailed.value = false
      return
    }
    void loadItem(id)
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
        <MusicalGroupChromeHeader v-if="showEntityChrome" />

        <div v-if="loading && !data" class="musical-group-page__loading">
          Loading…
        </div>

        <div v-else-if="fetchError" class="musical-group-page__error">
          <p>{{ fetchError }}</p>
          <MusicalGroupSplash />
        </div>

        <MusicalGroupScreen v-else-if="data" :data="data" />
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
</style>
