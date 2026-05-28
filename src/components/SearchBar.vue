<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxTypeaheadSearch, type SearchResult } from '@wikimedia/codex'

import {
  FetchWikipediaOpenSearchError,
  fetchWikipediaOpenSearch,
} from '@/lib/fetchWikipediaOpenSearch'
import type { Skin, Theme } from '@/lib/theming'

interface Props {
  /** Wiki host for opensearch (no protocol). Defaults to en.wikipedia.org. */
  host?: string
  /** Placeholder text inside the input. */
  placeholder?: string
  /** Maximum number of suggestions to show. */
  limit?: number
  /** Local skin override. Sets `data-skin` on the root. */
  skin?: Skin
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
}

interface Emits {
  /** Emitted when a suggestion is selected. Carries the page title. */
  (event: 'select', title: string): void
  /**
   * Emitted when the user submits the search (Enter / search button).
   * Carries the typed query.
   */
  (event: 'submit', query: string): void
}

const props = withDefaults(defineProps<Props>(), {
  host: 'en.wikipedia.org',
  placeholder: 'Search Wikipedia',
  limit: 10,
  skin: undefined,
  theme: undefined,
})

const emit = defineEmits<Emits>()

const suggestions = ref<SearchResult[]>([])
const isSearching = ref(false)
const lastQuery = ref('')

const formAction = computed(() => `https://${props.host}/w/index.php`)

const lang = computed(() => props.host.split('.')[0] ?? 'en')

let abortController: AbortController | null = null

async function onInput(value: string) {
  const trimmed = (value ?? '').trim()
  lastQuery.value = trimmed
  if (!trimmed) {
    suggestions.value = []
    isSearching.value = false
    return
  }

  abortController?.abort()
  abortController = new AbortController()

  isSearching.value = true
  try {
    const items = await fetchWikipediaOpenSearch(trimmed, {
      lang: lang.value,
      limit: props.limit,
      signal: abortController.signal,
    })
    if (lastQuery.value !== trimmed) return
    suggestions.value = items
  } catch (err) {
    if (
      (err as Error).name === 'AbortError' ||
      (err instanceof FetchWikipediaOpenSearchError && err.code === 'aborted')
    ) {
      return
    }
    suggestions.value = []
  } finally {
    isSearching.value = false
  }
}

function onSearchResultClick(payload: { title?: string; value?: string }) {
  const title = payload.title ?? payload.value ?? ''
  if (title) emit('select', title)
}

function onSubmit(payload: { value?: string }) {
  const query = (payload.value ?? lastQuery.value ?? '').trim()
  if (query) emit('submit', query)
}
</script>

<template>
  <div class="search-bar" :data-skin="props.skin" :data-theme="props.theme">
    <CdxTypeaheadSearch
      id="protowiki-search"
      :placeholder="props.placeholder"
      :form-action="formAction"
      :search-results="suggestions"
      :search-results-label="props.placeholder"
      :search-footer-url="`https://${props.host}/wiki/Special:Search?search=${encodeURIComponent(lastQuery)}`"
      :show-thumbnail="false"
      @input="onInput"
      @search-result-click="onSearchResultClick"
      @submit="onSubmit"
    >
      <template #default>
        <input type="hidden" name="title" value="Special:Search" />
        <input type="hidden" name="wprov" value="acrw1_0" />
      </template>
      <template #search-footer-text="{ searchQuery }">
        Search Wikipedia for pages containing
        <strong class="search-bar__highlight">{{ searchQuery }}</strong>
      </template>
    </CdxTypeaheadSearch>
  </div>
</template>

<style scoped>
.search-bar {
  display: block;
  width: 100%;
}

.search-bar__highlight {
  font-weight: var(--font-weight-bold, 700);
}
</style>
