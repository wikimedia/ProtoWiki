<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { CdxButton, CdxTextInput } from '@wikimedia/codex'

import { isMusicalGroup, parseQidInput, searchMusicalGroups } from './data/wikidataApi'
import type { MusicalGroupSearchResult } from './data/types'

interface Props {
  error?: string | null
}

defineProps<Props>()

const router = useRouter()

const query = ref('')
const results = ref<MusicalGroupSearchResult[]>([])
const searching = ref(false)
const submitting = ref(false)
const localError = ref<string | null>(null)

let searchAbort: AbortController | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function navigateToItem(id: string) {
  localError.value = null
  await router.replace({ query: { ...router.currentRoute.value.query, item: id } })
}

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
    await navigateToItem(id)
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

  if (results.value.length === 1) {
    await navigateToItem(results.value[0].id)
    return
  }

  if (results.value.length > 1) {
    localError.value = 'Select a result from the list, or enter a Q-id.'
    return
  }

  localError.value = 'No matching musical groups found.'
}

async function onSelectResult(result: MusicalGroupSearchResult) {
  await navigateToItem(result.id)
}
</script>

<template>
  <div class="musical-group-splash">
    <h1>Musical group</h1>
    <p class="musical-group-splash__hint">
      Search or enter a Wikidata item ID (e.g. Q107475751 for Wet Leg).
    </p>

    <form class="musical-group-splash__form" @submit.prevent="onSubmit">
      <CdxTextInput
        v-model="query"
        class="musical-group-splash__input"
        placeholder="Search or Q-id…"
        :disabled="submitting"
      />
      <CdxButton action="progressive" type="submit" :disabled="submitting || !query.trim().length">
        Open
      </CdxButton>
    </form>

    <p v-if="searching" class="musical-group-splash__status">Searching…</p>

    <ul v-if="results.length" class="musical-group-splash__results">
      <li v-for="result in results" :key="result.id">
        <button type="button" class="musical-group-splash__result" @click="onSelectResult(result)">
          <span class="musical-group-splash__result-label">{{ result.label }}</span>
          <span class="musical-group-splash__result-id">{{ result.id }}</span>
          <span v-if="result.description" class="musical-group-splash__result-desc">
            {{ result.description }}
          </span>
        </button>
      </li>
    </ul>

    <p v-if="localError || error" class="musical-group-splash__error">
      {{ localError || error }}
    </p>
  </div>
</template>

<style scoped>
.musical-group-splash {
  padding: var(--spacing-250) var(--spacing-150);
}

.musical-group-splash__hint {
  margin: var(--spacing-100) 0 var(--spacing-200);
  color: var(--color-subtle);
}

.musical-group-splash__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.musical-group-splash__input {
  width: 100%;
}

.musical-group-splash__status {
  margin-top: var(--spacing-100);
  color: var(--color-subtle);
}

.musical-group-splash__results {
  margin: var(--spacing-150) 0 0;
  padding: 0;
  list-style: none;
}

.musical-group-splash__result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: var(--spacing-100) 0;
  border: 0;
  border-bottom: 1px solid var(--border-color-subtle);
  background: transparent;
  text-align: start;
  cursor: pointer;
}

.musical-group-splash__result-label {
  font-weight: var(--font-weight-bold);
}

.musical-group-splash__result-id {
  color: var(--color-subtle);
}

.musical-group-splash__result-desc {
  color: var(--color-subtle);
}

.musical-group-splash__error {
  margin-top: var(--spacing-150);
  color: var(--color-error);
}
</style>
