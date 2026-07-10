<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { CdxField, CdxMessage, CdxSearchInput } from '@wikimedia/codex'

import AttributionCard from '@/components/attribution/AttributionCard.vue'
import { useAttributionSignals } from '@/components/attribution/useAttributionSignals'
import { SEARCH_ATTRIBUTION_DISPLAY } from '@/components/attribution/types'
import PlainWrapper from '@/components/PlainWrapper.vue'

import { fetchPageSummary } from './fetchPageSummary'
import { resolveSearchTopMatch } from './resolveSearchTopMatch'

definePage({
  meta: {
    title: 'Attribution (search)',
    description: 'Using the Attribution API in a search scenario.',
    category: 'example',
  },
})

const query = ref('Aurora')
const articleTitle = ref('')
const searchError = ref<string | null>(null)
const searchLoading = ref(false)

const snippet = ref('')
const thumbnailUrl = ref<string | null>(null)
const summaryLoading = ref(false)

const { signals, loading, error } = useAttributionSignals(articleTitle)

let searchAbort: AbortController | null = null
let summaryAbort: AbortController | null = null

async function runSearch(): Promise<void> {
  const trimmed = query.value.trim()
  if (!trimmed.length) {
    searchError.value = 'Enter a search term.'
    articleTitle.value = ''
    snippet.value = ''
    return
  }

  searchAbort?.abort()
  searchAbort = new AbortController()
  const { signal } = searchAbort

  searchLoading.value = true
  searchError.value = null

  try {
    const title = await resolveSearchTopMatch(trimmed, { signal })
    if (signal.aborted) return
    if (!title) {
      searchError.value = 'No article found'
      articleTitle.value = ''
      snippet.value = ''
      return
    }
    articleTitle.value = title
  } catch (err) {
    if (signal.aborted) return
    searchError.value = err instanceof Error ? err.message : 'Search failed.'
    articleTitle.value = ''
    snippet.value = ''
  } finally {
    if (!signal.aborted) searchLoading.value = false
  }
}

async function loadPageSummary(title: string): Promise<void> {
  summaryAbort?.abort()
  summaryAbort = new AbortController()
  const { signal } = summaryAbort

  summaryLoading.value = true
  try {
    const summary = await fetchPageSummary(title, { signal })
    snippet.value = summary.extract
    thumbnailUrl.value = summary.thumbnailUrl
  } catch {
    if (!signal.aborted) {
      snippet.value = ''
      thumbnailUrl.value = null
    }
  } finally {
    if (!signal.aborted) summaryLoading.value = false
  }
}

watch(articleTitle, (title) => {
  if (title.trim()) {
    void loadPageSummary(title)
  } else {
    snippet.value = ''
    thumbnailUrl.value = null
  }
})

onMounted(() => {
  void runSearch()
})
</script>

<template>
  <PlainWrapper>
    <CdxField label="Search">
      <CdxSearchInput
        v-model="query"
        use-button
        :disabled="searchLoading"
        @submit-click="runSearch"
      />
    </CdxField>

    <CdxMessage v-if="searchError" type="warning">
      {{ searchError }}
    </CdxMessage>

    <section v-if="articleTitle" aria-label="Search results">
      <AttributionCard
        :signals="signals"
        :loading="loading || summaryLoading || searchLoading"
        :error="error"
        variant="inline"
        :snippet="summaryLoading ? 'Loading summary…' : snippet || 'No summary available.'"
        :thumbnail-url="thumbnailUrl"
        v-bind="SEARCH_ATTRIBUTION_DISPLAY"
      />
    </section>
  </PlainWrapper>
</template>
