<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxSearchInput } from '@wikimedia/codex'

import iconSubtractCircle from '../assets/icon-subtract-circle.svg'
import OnboardingShell from '../components/OnboardingShell.vue'
import TitleSearchResults from '../components/TitleSearchResults.vue'
import { fetchTitleSearchResults, type TitleSearchResult } from '../data/titleSearch'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const search = ref('')
const results = ref<TitleSearchResult[]>([])

let abortController: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const interests = computed(() => props.flow.interests.value)
const configureMode = computed(() => props.flow.returnTo.value !== '')

async function finishInterests(): Promise<void> {
  const returnTo = props.flow.returnTo.value
  if (returnTo) {
    await props.flow.goTo(returnTo, { returnTo: '' })
  } else {
    await props.flow.goTo('email')
  }
}

async function fetchSuggestions(term: string): Promise<void> {
  abortController?.abort()
  const trimmed = term.trim()
  if (!trimmed.length) {
    results.value = []
    return
  }

  abortController = new AbortController()
  try {
    const pages = await fetchTitleSearchResults(trimmed, {
      signal: abortController.signal,
      clientTag: 'no-distractions-interests',
    })
    const existing = new Set(interests.value.map((item) => item.toLowerCase()))
    results.value = pages.filter((page) => !existing.has(page.title.toLowerCase()))
  } catch (error) {
    if ((error as Error).name !== 'AbortError') results.value = []
  }
}

watch(search, (term) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void fetchSuggestions(term), 200)
})

function addInterest(title: string): void {
  const trimmed = title.trim()
  if (!trimmed.length) return
  if (interests.value.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return
  props.flow.interests.value = [...interests.value, trimmed]
  search.value = ''
  results.value = []
}

function removeInterest(title: string): void {
  props.flow.interests.value = interests.value.filter((item) => item !== title)
}

onBeforeUnmount(() => {
  abortController?.abort()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <OnboardingShell :current="2" :show-progress="!configureMode" flush-content>
    <div class="ob-page">
      <h1 class="ob-title">What are your main interests?</h1>

      <div class="ob-body">
        <div class="interests__fields">
          <div class="interests__search">
            <CdxSearchInput
              v-model="search"
              class="interests__input"
              :class="{ 'interests__input--with-results': results.length > 0 }"
              placeholder="Add your interests"
              aria-label="Add your interests"
              @submit="addInterest(search)"
            />

            <TitleSearchResults
              v-if="results.length"
              layout="attached"
              :results="results"
              @select="addInterest"
            />
          </div>

          <ul class="interests__chips">
            <li v-for="title in interests" :key="title">
              <span class="interests__chip">
                <span class="interests__chip-label">{{ title }}</span>
                <button
                  type="button"
                  class="interests__chip-remove"
                  :aria-label="`Remove ${title}`"
                  @click="removeInterest(title)"
                >
                  <img class="interests__chip-remove-icon" :src="iconSubtractCircle" alt="" />
                </button>
              </span>
            </li>
          </ul>
        </div>

        <div class="ob-actions">
          <template v-if="configureMode">
            <CdxButton action="progressive" weight="primary" @click="finishInterests">
              Done
            </CdxButton>
          </template>
          <template v-else>
            <CdxButton weight="quiet" @click="props.flow.goTo('email')">Skip</CdxButton>
            <CdxButton action="progressive" weight="primary" @click="props.flow.goTo('email')">
              Next
            </CdxButton>
          </template>
        </div>
      </div>
    </div>
  </OnboardingShell>
</template>

<style scoped>
.interests__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.interests__search {
  position: relative;
}

.interests__search :deep(.cdx-text-input__input) {
  min-height: 2rem;
}

.interests__input--with-results :deep(.cdx-text-input),
.interests__input--with-results :deep(.cdx-text-input__input) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.interests__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.interests__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-height: 2.75rem;
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px) var(--spacing-50, 8px)
    var(--spacing-100, 16px);
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-pill, 9999px);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.interests__chip-label {
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base);
}

.interests__chip-remove {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-base, #404244);
  cursor: pointer;
}

.interests__chip-remove-icon {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
}
</style>
