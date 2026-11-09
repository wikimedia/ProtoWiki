<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CdxTypeaheadSearch,
  type SearchResult,
  type SearchResultClickEvent,
} from '@wikimedia/codex'

import { wikimediaApiFetchHeaders, wikiHostFromLang } from '@/config'

const props = withDefaults(
  defineProps<{
    lang: string
    /** Unique id for the underlying input (required when multiple typeaheads share a page). */
    inputId: string
    placeholder?: string
    showThumbnail?: boolean
    useButton?: boolean
  }>(),
  {
    placeholder: 'Search for a page…',
    showThumbnail: false,
    useButton: true,
  },
)

const emit = defineEmits<{
  select: [title: string]
  submit: [query: string]
}>()

const suggestions = ref<SearchResult[]>([])
const typeaheadRef = ref<InstanceType<typeof CdxTypeaheadSearch> | null>(null)
const lastQuery = ref('')
const suggestionsQuery = ref('')

let abortController: AbortController | null = null

const THUMBNAIL_SIZE = 120

interface PageMeta {
  description?: string
  thumbnail?: { source?: string }
}

function preventFormSubmit(event: Event): void {
  event.preventDefault()
}

onMounted(() => {
  typeaheadRef.value?.form?.addEventListener('submit', preventFormSubmit)
})

onBeforeUnmount(() => {
  typeaheadRef.value?.form?.removeEventListener('submit', preventFormSubmit)
  abortController?.abort()
})

function resultTitle(result: SearchResult): string | undefined {
  return result.label ?? (result.value != null ? String(result.value) : undefined)
}

async function fetchSuggestions(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed.length) return []

  const params = new URLSearchParams({
    action: 'opensearch',
    search: trimmed,
    limit: '10',
    namespace: '0',
    format: 'json',
    origin: '*',
  })

  const response = await fetch(
    `https://${wikiHostFromLang(props.lang)}/w/api.php?${params.toString()}`,
    {
      signal,
      headers: wikimediaApiFetchHeaders('codex-playground-page-search'),
    },
  )

  if (!response.ok) return []

  const data = (await response.json()) as [string, string[], string[], string[]]
  const [, titles, descriptions] = data

  if (!titles.length) return []

  const metaByTitle = new Map<string, PageMeta>()

  if (props.showThumbnail) {
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

    const metaResponse = await fetch(
      `https://${wikiHostFromLang(props.lang)}/w/api.php?${metaParams.toString()}`,
      {
        signal,
        headers: wikimediaApiFetchHeaders('codex-playground-page-search'),
      },
    )

    if (metaResponse.ok) {
      const metaData = (await metaResponse.json()) as {
        query?: {
          pages?: Array<{ title?: string; description?: string; thumbnail?: PageMeta['thumbnail'] }>
        }
      }
      for (const page of metaData.query?.pages ?? []) {
        if (page.title) metaByTitle.set(page.title, page)
      }
    }
  }

  return titles.map((title, index) => {
    const meta = metaByTitle.get(title)
    const description =
      meta?.description?.trim() || descriptions[index]?.trim() || undefined
    const thumbnailUrl = props.showThumbnail ? meta?.thumbnail?.source : undefined

    return {
      value: title,
      label: title,
      description,
      url: '#',
      thumbnail: thumbnailUrl ? { url: thumbnailUrl } : null,
    }
  })
}

async function onInput(value: string): Promise<void> {
  const trimmed = (value ?? '').trim()
  lastQuery.value = trimmed

  if (!trimmed) {
    suggestions.value = []
    suggestionsQuery.value = ''
    abortController?.abort()
    return
  }

  abortController?.abort()
  const controller = new AbortController()
  abortController = controller

  try {
    const items = await fetchSuggestions(trimmed, controller.signal)
    if (lastQuery.value !== trimmed) return
    suggestions.value = items
    suggestionsQuery.value = trimmed
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    suggestions.value = []
    suggestionsQuery.value = ''
  }
}

function completeInput(title: string): void {
  const typeahead = typeaheadRef.value
  if (!typeahead) return
  typeahead.inputValue = title
  typeahead.expanded = false
  typeahead.menu?.clearActive()
  typeahead.form?.querySelector('input')?.blur()
}

function onSearchResultClick(payload: SearchResultClickEvent): void {
  const title = payload.searchResult ? resultTitle(payload.searchResult) : undefined
  if (!title) return
  completeInput(title)
  emit('select', title)
}

function onSubmit(): void {
  const query = (typeaheadRef.value?.inputValue ?? lastQuery.value).trim()
  if (!query) return

  if (suggestionsQuery.value === query && suggestions.value[0]) {
    const title = resultTitle(suggestions.value[0])
    if (title) {
      completeInput(title)
      emit('select', title)
      return
    }
  }

  emit('submit', query)
}

watch(
  () => props.lang,
  () => {
    suggestions.value = []
    suggestionsQuery.value = ''
    lastQuery.value = ''
    if (typeaheadRef.value) typeaheadRef.value.inputValue = ''
  },
)
</script>

<template>
  <CdxTypeaheadSearch
    ref="typeaheadRef"
    :id="inputId"
    class="page-typeahead-search"
    :placeholder="placeholder"
    form-action="#"
    :search-results="suggestions"
    :use-button="useButton"
    :show-thumbnail="showThumbnail"
    @input="onInput"
    @search-result-click="onSearchResultClick"
    @submit="onSubmit"
  />
</template>

<style scoped>
.page-typeahead-search {
  display: inline-block;
  max-width: 100%;
}
</style>
