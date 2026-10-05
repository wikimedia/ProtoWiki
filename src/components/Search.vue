<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CdxTypeaheadSearch,
  type SearchResult,
  type SearchResultClickEvent,
} from '@wikimedia/codex'

import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'
import type { Skin, Theme } from '@/theme'

/** Payload for the `submit` event (Enter / search button without a highlighted result). */
export interface SearchSubmitPayload {
  query: string
  /** First typeahead suggestion when results exist for the current query. */
  title?: string
}

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
  /** Show an integrated submit button (Vector chrome inline search). */
  useButton?: boolean
  /**
   * Widen the input on focus so result thumbnails align with the search icon.
   * Only applies when thumbnails are shown (`show-thumbnail`).
   */
  autoExpandWidth?: boolean
}

interface Emits {
  /** Emitted when a suggestion is selected. Carries the page title. */
  (event: 'select', title: string): void
  /**
   * Emitted when the user submits the search (Enter / search button).
   * Includes the first suggestion title when the typeahead list is populated.
   */
  (event: 'submit', payload: SearchSubmitPayload): void
}

const props = withDefaults(defineProps<Props>(), {
  host: 'en.wikipedia.org',
  placeholder: 'Search Wikipedia',
  limit: 10,
  skin: undefined,
  theme: undefined,
  useButton: false,
  autoExpandWidth: false,
})

const emit = defineEmits<Emits>()

const suggestions = ref<SearchResult[]>([])
const isSearching = ref(false)
const lastQuery = ref('')
/** Query the current `suggestions` were fetched for (guards stale results). */
const suggestionsQuery = ref('')
const typeaheadRef = ref<InstanceType<typeof CdxTypeaheadSearch> | null>(null)

/** Enter pressed before opensearch finished — resolve when results arrive. */
let pendingSubmitQuery: string | null = null

const lang = computed(() => props.host.split('.')[0] ?? 'en')

let abortController: AbortController | null = null

function preventFormSubmit(event: Event) {
  event.preventDefault()
}

onMounted(() => {
  typeaheadRef.value?.form?.addEventListener('submit', preventFormSubmit)
})

onBeforeUnmount(() => {
  typeaheadRef.value?.form?.removeEventListener('submit', preventFormSubmit)
})

class OpenSearchFetchError extends Error {
  constructor(
    message: string,
    public readonly code: 'aborted' | 'http',
  ) {
    super(message)
    this.name = 'OpenSearchFetchError'
  }
}

/** Codex figures render at 40px; fetch larger for sharp downscaling on retina. */
const THUMBNAIL_SIZE = 120

interface PageMeta {
  description?: string
  thumbnail?: { source?: string }
}

function resultTitle(result: SearchResult): string | undefined {
  return result.label ?? (result.value != null ? String(result.value) : undefined)
}

function firstSuggestionTitle(): string | undefined {
  const first = suggestions.value[0]
  return first ? resultTitle(first) : undefined
}

/** Live input text — may run ahead of debounced `@input` / `lastQuery`. */
function currentInputQuery(): string {
  return (typeaheadRef.value?.inputValue ?? lastQuery.value).trim()
}

function suggestionsMatchQuery(query: string): boolean {
  return query.length > 0 && suggestionsQuery.value === query
}

function openFirstSuggestion(query: string): boolean {
  if (!suggestionsMatchQuery(query)) return false

  const title = firstSuggestionTitle()
  if (!title) return false

  completeSearchInput(title)
  emit('submit', { query, title })
  return true
}

function blurSearchInput(): void {
  const typeahead = typeaheadRef.value
  if (!typeahead) return

  typeahead.expanded = false
  typeahead.menu?.clearActive()
  typeahead.form?.querySelector('input')?.blur()
}

function completeSearchInput(title: string): void {
  const typeahead = typeaheadRef.value
  if (!typeahead) return

  typeahead.inputValue = title
  blurSearchInput()
}

function resolvePendingSubmit(query: string): void {
  openFirstSuggestion(query)
}

/** Title suggestions from opensearch, enriched with descriptions and thumbnails. */
async function fetchOpenSearchSuggestions(
  query: string,
  options: { signal?: AbortSignal; lang?: string; limit?: number },
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  if (options.signal?.aborted) {
    throw new OpenSearchFetchError('Request aborted', 'aborted')
  }

  const wikiHost = wikiHostFromLang(options.lang ?? 'en')
  const limit = options.limit ?? 10

  const openSearchParams = new URLSearchParams({
    action: 'opensearch',
    search: trimmed,
    limit: String(limit),
    namespace: '0',
    format: 'json',
    origin: '*',
  })

  const openSearchResponse = await fetch(
    `https://${wikiHost}/w/api.php?${openSearchParams.toString()}`,
    {
      signal: options.signal,
      headers: wikimediaApiFetchHeaders('opensearch'),
    },
  )

  if (!openSearchResponse.ok) {
    throw new OpenSearchFetchError(`HTTP ${openSearchResponse.status}`, 'http')
  }

  const openSearchData = (await openSearchResponse.json()) as [
    string,
    string[],
    string[],
    string[],
  ]
  const [, titles, descriptions] = openSearchData

  if (!titles.length) return []

  const metaParams = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    pilicense: 'any',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })

  const metaResponse = await fetch(`https://${wikiHost}/w/api.php?${metaParams.toString()}`, {
    signal: options.signal,
    headers: wikimediaApiFetchHeaders('opensearch'),
  })

  const metaByTitle = new Map<string, PageMeta>()
  if (metaResponse.ok) {
    const metaData = (await metaResponse.json()) as {
      query?: { pages?: Array<{ title?: string; description?: string; thumbnail?: PageMeta['thumbnail'] }> }
    }
    for (const page of metaData.query?.pages ?? []) {
      if (page.title) metaByTitle.set(page.title, page)
    }
  }

  return titles.map((title, i) => {
    const meta = metaByTitle.get(title)
    const description = meta?.description?.trim() || descriptions[i]?.trim() || undefined
    const thumbnailUrl = meta?.thumbnail?.source

    // Inert `#` — Codex requires `url` on submit but must not leave the prototype.
    return {
      value: title,
      label: title,
      description,
      url: '#',
      thumbnail: thumbnailUrl ? { url: thumbnailUrl } : null,
    }
  })
}

async function onInput(value: string) {
  const trimmed = (value ?? '').trim()
  if (pendingSubmitQuery && pendingSubmitQuery !== trimmed) {
    pendingSubmitQuery = null
  }

  lastQuery.value = trimmed
  if (!trimmed) {
    suggestions.value = []
    suggestionsQuery.value = ''
    isSearching.value = false
    pendingSubmitQuery = null
    return
  }

  abortController?.abort()
  const controller = new AbortController()
  abortController = controller
  const { signal } = controller

  isSearching.value = true
  try {
    const items = await fetchOpenSearchSuggestions(trimmed, {
      lang: lang.value,
      limit: props.limit,
      signal,
    })
    if (lastQuery.value !== trimmed) return
    suggestions.value = items
    suggestionsQuery.value = trimmed
  } catch (err) {
    if (
      (err as Error).name === 'AbortError' ||
      (err instanceof OpenSearchFetchError && err.code === 'aborted')
    ) {
      return
    }
    suggestions.value = []
    suggestionsQuery.value = ''
  } finally {
    isSearching.value = false

    if (signal.aborted) return

    if (pendingSubmitQuery && pendingSubmitQuery === lastQuery.value.trim()) {
      const query = pendingSubmitQuery
      pendingSubmitQuery = null
      resolvePendingSubmit(query)
    }
  }
}

function onSearchResultClick(payload: SearchResultClickEvent) {
  const result = payload.searchResult
  if (!result) return
  const title = resultTitle(result)
  if (!title) return

  pendingSubmitQuery = null
  completeSearchInput(title)
  emit('select', title)
}

function onSubmit(_payload: SearchResultClickEvent) {
  const query = currentInputQuery()
  if (!query) return

  // Codex debounces `@input` — Enter may arrive before our fetch starts.
  if (query !== lastQuery.value.trim()) {
    void onInput(typeaheadRef.value?.inputValue ?? query)
  }

  if (openFirstSuggestion(query)) {
    pendingSubmitQuery = null
    return
  }

  pendingSubmitQuery = query
}
</script>

<template>
  <div class="search-bar" :data-skin="props.skin" :data-theme="props.theme">
    <CdxTypeaheadSearch
      ref="typeaheadRef"
      id="protowiki-search"
      :placeholder="props.placeholder"
      form-action="#"
      :search-results="suggestions"
      :use-button="props.useButton"
      :auto-expand-width="props.autoExpandWidth"
      show-thumbnail
      @input="onInput"
      @search-result-click="onSearchResultClick"
      @submit="onSubmit"
    />
  </div>
</template>

<style scoped>
.search-bar {
  display: block;
  width: 100%;
}
</style>
