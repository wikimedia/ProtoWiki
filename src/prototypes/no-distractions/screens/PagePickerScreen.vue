<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxTextInput } from '@wikimedia/codex'
import { cdxIconArticleSearch, cdxIconSearch } from '@wikimedia/codex-icons'

import TitleSearchResults from '../components/TitleSearchResults.vue'
import { fetchTitleSearchResults, type TitleSearchResult } from '../data/titleSearch'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const query = ref(props.flow.title.value)
const results = ref<TitleSearchResult[]>([])
const loading = ref(false)

let abortController: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function fetchSuggestions(term: string): Promise<void> {
  abortController?.abort()
  const trimmed = term.trim()
  if (!trimmed.length) {
    results.value = []
    loading.value = false
    return
  }

  abortController = new AbortController()
  loading.value = true

  try {
    results.value = await fetchTitleSearchResults(trimmed, {
      signal: abortController.signal,
      clientTag: 'no-distractions-picker',
    })
  } catch (error) {
    if ((error as Error).name !== 'AbortError') results.value = []
  } finally {
    loading.value = false
  }
}

watch(query, (term) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void fetchSuggestions(term), 200)
})

function read(title: string): void {
  const trimmed = title.trim()
  if (!trimmed.length) return
  props.flow.goTo('read', { title: trimmed })
}

onBeforeUnmount(() => {
  abortController?.abort()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="picker">
    <div class="picker__intro">
      <CdxIcon class="picker__logo" :icon="cdxIconArticleSearch" />
      <h1 class="picker__title">No distractions onboarding flow</h1>
    </div>

    <form class="picker__form" @submit.prevent="read(query)">
      <div class="picker__search">
        <CdxTextInput
          v-model="query"
          class="picker__input"
          :class="{ 'picker__input--with-results': results.length > 0 }"
          input-type="search"
          :start-icon="cdxIconSearch"
          placeholder="Search for any article"
          aria-label="Article title"
          clearable
        />

        <TitleSearchResults
          v-if="results.length"
          layout="attached"
          :results="results"
          @select="read"
        />
      </div>

      <CdxButton
        class="picker__submit"
        action="progressive"
        weight="primary"
        type="submit"
        :disabled="!query.trim().length || loading"
      >
        Read article
      </CdxButton>
    </form>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  padding: var(--spacing-200, 32px) var(--spacing-100, 16px) var(--spacing-100, 16px);
  background-color: var(--background-color-base);
}

.picker__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--spacing-50, 8px);
  margin-top: var(--spacing-400, 64px);
}

.picker__logo {
  color: var(--color-progressive, #36c);
}

.picker__logo :deep(svg) {
  width: 3rem;
  height: 3rem;
}

.picker__title {
  margin: var(--spacing-50, 8px) 0 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large, 1.75rem);
  font-weight: var(--font-weight-normal, 400);
  line-height: var(--line-height-xx-small, 1.25);
  color: var(--color-base);
}

.picker__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  margin-top: var(--spacing-150, 24px);
}

.picker__search {
  display: flex;
  flex-direction: column;
}

.picker__input--with-results :deep(.cdx-text-input),
.picker__input--with-results :deep(.cdx-text-input__input) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.picker__submit {
  width: 100%;
}
</style>
