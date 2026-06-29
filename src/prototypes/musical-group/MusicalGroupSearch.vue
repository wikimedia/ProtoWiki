<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { CdxProgressBar, CdxTextInput } from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'

import WikitaCardItem from './components/WikitaCardItem.vue'
import WikitaTitle from './components/WikitaTitle.vue'
import WikitaChromeHeader, {
  type WikitaChromeHeaderVariant,
} from './components/WikitaChromeHeader.vue'
import { parseQidInput, searchWikidataItems } from './data/wikidataApi'
import type { MusicalGroupSearchResult } from './data/types'

interface Props {
  error?: string | null
}

defineProps<Props>()

const headerVariant = defineModel<WikitaChromeHeaderVariant>('headerVariant', {
  default: 'black',
})

const emit = defineEmits<{
  navigate: [id: string]
  'toggle-search': []
  'reset-stored-data': []
}>()

const route = useRoute()

const query = ref('')
const searchInput = ref<{ focus: () => void } | null>(null)
const results = ref<MusicalGroupSearchResult[]>([])
const searching = ref(false)
const localError = ref<string | null>(null)

let searchAbort: AbortController | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

function itemHref(id: string) {
  return { query: { ...route.query, item: id } }
}

function onResultSelect(id: string) {
  emit('navigate', id)
}

async function runSearch(value: string) {
  const trimmed = value.trim()
  if (!trimmed.length) {
    results.value = []
    return
  }

  searchAbort?.abort()
  searchAbort = new AbortController()
  searching.value = true

  try {
    results.value = await searchWikidataItems(trimmed, searchAbort.signal)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    results.value = []
  } finally {
    searching.value = false
  }
}

watch(query, (value) => {
  localError.value = null
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void runSearch(value)
  }, 300)
})

function onSubmit() {
  const trimmed = query.value.trim()
  if (!trimmed.length) return

  const directId = parseQidInput(trimmed)
  if (directId) {
    localError.value = null
    emit('navigate', directId)
    return
  }

  if (results.value.length > 0) {
    emit('navigate', results.value[0].id)
  }
}

onMounted(() => {
  searchInput.value?.focus()
})
</script>

<template>
  <div class="musical-group-search">
    <WikitaChromeHeader
      v-model:variant="headerVariant"
      @toggle-search="emit('toggle-search')"
      @reset-stored-data="emit('reset-stored-data')"
    />

    <WikitaTitle
      title="Search"
      :show-bookmark="false"
      :show-history="false"
      :show-talk="false"
      :show-edit="false"
      class="musical-group-search__title-bar"
    />

    <div class="musical-group-search__body">
      <form class="musical-group-search__form" @submit.prevent="onSubmit">
        <CdxTextInput
          ref="searchInput"
          v-model="query"
          class="musical-group-search__input"
          :start-icon="cdxIconSearch"
          aria-label="Search Wikidata"
        />
      </form>

      <CdxProgressBar v-if="searching" inline aria-label="Searching" />

      <ul v-if="results.length" class="musical-group-search__results">
        <li v-for="result in results" :key="result.id" @click="onResultSelect(result.id)">
          <WikitaCardItem
            :href="itemHref(result.id)"
            :show-type="false"
            :show-snippet="false"
            :show-info="false"
            :title="result.label"
            :body="result.description ?? ''"
            :thumbnail-url="result.thumbnailUrl"
            :thumbnail-alt="result.label"
          />
        </li>
      </ul>

      <p v-if="localError || error" class="musical-group-search__error">
        {{ localError || error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.musical-group-search {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: var(--background-color-base);
}

.musical-group-search__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-50);
}

.musical-group-search__title-bar {
  margin-top: var(--spacing-50);
}

.musical-group-search__form {
  width: 100%;
}

.musical-group-search__input {
  width: 100%;
  border-radius: 4px;
}

.musical-group-search__input :deep(.cdx-text-input) {
  border-radius: 4px;
}

.musical-group-search__input :deep(.cdx-text-input__input) {
  min-height: var(--size-250);
  border-color: var(--color-base);
  border-radius: 4px;
  font-size: var(--font-size-medium);
}

.musical-group-search__input :deep(.cdx-text-input__start-icon),
.musical-group-search__input:focus-within :deep(.cdx-text-input__start-icon) {
  color: var(--color-base);
}

.musical-group-search__results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.musical-group-search__results > li {
  margin: 0;
}

.musical-group-search__error {
  margin: 0;
  color: var(--color-error);
}
</style>
