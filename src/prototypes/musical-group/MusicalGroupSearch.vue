<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { CdxProgressBar, CdxTextInput } from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'

import { isMusicalGroup, parseQidInput, searchMusicalGroups } from './data/wikidataApi'
import type { MusicalGroupSearchResult } from './data/types'
import MusicalGroupChromeHeader from './MusicalGroupChromeHeader.vue'
import MusicalGroupTitleBar from './MusicalGroupTitleBar.vue'

interface Props {
  error?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  navigate: [id: string]
  'toggle-search': []
  'reset-stored-data': []
}>()

const query = ref('')
const searchInput = ref<{ focus: () => void } | null>(null)
const results = ref<MusicalGroupSearchResult[]>([])
const searching = ref(false)
const submitting = ref(false)
const localError = ref<string | null>(null)

let searchAbort: AbortController | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function validateAndNavigate(raw: string) {
  const id = parseQidInput(raw)
  if (!id) {
    localError.value = 'Enter a valid Wikidata item ID (e.g. Q107475751).'
    return
  }

  submitting.value = true
  localError.value = null
  try {
    const valid = await isMusicalGroup(id)
    if (!valid) {
      localError.value = 'That item is not a musical group (or subclass).'
      return
    }
    emit('navigate', id)
  } catch {
    localError.value = 'Could not validate that item. Try again.'
  } finally {
    submitting.value = false
  }
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
    results.value = await searchMusicalGroups(trimmed, searchAbort.signal)
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

async function onSubmit() {
  const trimmed = query.value.trim()
  if (!trimmed.length) return

  const directId = parseQidInput(trimmed)
  if (directId) {
    await validateAndNavigate(directId)
    return
  }

  if (results.value.length > 0) {
    emit('navigate', results.value[0].id)
  }
}

function onSelectResult(result: MusicalGroupSearchResult) {
  emit('navigate', result.id)
}

onMounted(() => {
  searchInput.value?.focus()
})
</script>

<template>
  <div class="musical-group-search">
    <MusicalGroupChromeHeader
      @toggle-search="emit('toggle-search')"
      @reset-stored-data="emit('reset-stored-data')"
    />

    <MusicalGroupTitleBar title="Search" class="musical-group-search__title-bar" />

    <div class="musical-group-search__body">
      <form class="musical-group-search__form" @submit.prevent="onSubmit">
        <CdxTextInput
          ref="searchInput"
          v-model="query"
          class="musical-group-search__input"
          :start-icon="cdxIconSearch"
          :disabled="submitting"
          aria-label="Search musical groups"
        />
      </form>

      <CdxProgressBar v-if="searching" inline aria-label="Searching" />

      <ul v-if="results.length" class="musical-group-search__results">
        <li v-for="result in results" :key="result.id">
          <button
            type="button"
            class="musical-group-search__card"
            @click="onSelectResult(result)"
          >
            <div class="musical-group-search__card-text">
              <span class="musical-group-search__card-label">{{ result.label }}</span>
              <span v-if="result.description" class="musical-group-search__card-desc">
                {{ result.description }}
              </span>
            </div>

            <span class="musical-group-search__card-thumb">
              <img
                v-if="result.thumbnailUrl"
                :src="result.thumbnailUrl"
                :alt="result.label"
                class="musical-group-search__card-image"
                loading="lazy"
              />
              <span v-else class="musical-group-search__card-placeholder" aria-hidden="true" />
            </span>
          </button>
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
  border-radius: 0;
}

.musical-group-search__input :deep(.cdx-text-input__input) {
  min-height: var(--size-250);
  border-color: var(--color-base);
  border-radius: 0;
  font-size: var(--font-size-medium);
}

.musical-group-search__input :deep(.cdx-text-input__start-icon),
.musical-group-search__input:focus-within :deep(.cdx-text-input__start-icon) {
  color: var(--color-base);
}

.musical-group-search__results {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin: 0;
  padding: 0;
  list-style: none;
}

.musical-group-search__card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--spacing-100);
  width: 100%;
  min-height: 80px;
  padding: var(--spacing-100);
  border: 1px solid var(--color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  text-align: start;
  cursor: pointer;
}

.musical-group-search__card-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  min-width: 0;
}

.musical-group-search__card-label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.musical-group-search__card-desc {
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.musical-group-search__card-thumb {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 1px solid var(--color-base);
  overflow: hidden;
}

.musical-group-search__card-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.musical-group-search__card-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  background-color: var(--background-color-interactive-subtle);
}

.musical-group-search__error {
  margin: 0;
  color: var(--color-error);
}
</style>
