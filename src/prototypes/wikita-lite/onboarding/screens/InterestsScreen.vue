<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  CdxField,
  CdxMessage,
  CdxMultiselectLookup,
  type ChipInputItem,
  type MenuItemData,
  type MenuItemValue,
} from '@wikimedia/codex'

import { t } from '@/i18n'

import InterestSuggestions from '../components/InterestSuggestions.vue'
import { useInterestSuggestions } from '../data/useInterestSuggestions'
import { fetchTitleSearchResults } from '@/components/search/titleSearch'
import { normalizeTitleKey } from '../data/titleKey'
import type { FlowState } from '../data/useWikitaLiteOnboardingFlow'

const POOL_INTEREST_LIMIT = 10

const props = defineProps<{ flow: FlowState }>()

const interests = computed(() => props.flow.interests.value)
const hasInterests = computed(() => interests.value.length > 0)

const poolLimitReached = ref(false)
watch(
  () => interests.value.length,
  (count) => {
    if (count >= POOL_INTEREST_LIMIT) poolLimitReached.value = true
  },
  { immediate: true },
)

const {
  suggestions,
  loading: suggestionsLoading,
  source: suggestionsSource,
} = useInterestSuggestions(() => props.flow.interests.value)

const visibleSuggestions = computed(() => {
  const selected = new Set(interests.value.map((t) => normalizeTitleKey(t)))
  return suggestions.value.filter((hit) => !selected.has(normalizeTitleKey(hit.title)))
})

const inputChips = ref<ChipInputItem[]>([])
const selected = ref<MenuItemValue[]>([])

function sameSet(a: string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

let syncingFromInterests = false

watch(
  interests,
  async (list) => {
    syncingFromInterests = true
    if (!sameSet(selected.value.map(String), list)) selected.value = [...list]
    if (!sameSet(inputChips.value.map((c) => String(c.value)), list)) {
      inputChips.value = list.map((title) => ({ value: title, label: title }))
    }
    await nextTick()
    syncingFromInterests = false
  },
  { immediate: true },
)

watch(selected, (values) => {
  if (syncingFromInterests) return
  const titles = values.map(String)
  if (sameSet(titles, interests.value)) return
  if (
    !props.flow.hasExplicitInterests.value &&
    sameSet(titles, props.flow.prefillInterests.value)
  ) {
    return
  }
  props.flow.interests.value = titles
})

const menuItems = ref<MenuItemData[]>([])
const menuConfig = { showThumbnail: true, boldLabel: true }

let abortController: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function fetchMenu(term: string): Promise<void> {
  abortController?.abort()
  const trimmed = term.trim()
  if (!trimmed.length) {
    menuItems.value = []
    return
  }

  abortController = new AbortController()
  try {
    const pages = await fetchTitleSearchResults(trimmed, {
      signal: abortController.signal,
      clientTag: 'wikita-lite-onboarding-interests',
    })
    const existing = new Set(interests.value.map((item) => item.toLowerCase()))
    menuItems.value = pages
      .filter((page) => !existing.has(page.title.toLowerCase()))
      .map((page) => ({
        value: page.title,
        label: page.title,
        description: page.description || undefined,
        thumbnail: page.thumbnailSrc ? { url: page.thumbnailSrc } : null,
      }))
  } catch (error) {
    if ((error as Error).name !== 'AbortError') menuItems.value = []
  }
}

function onSearchInput(value: string | number): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  const term = String(value)
  debounceTimer = setTimeout(() => void fetchMenu(term), 200)
}

function addInterest(title: string): void {
  const trimmed = title.trim()
  if (!trimmed.length) return
  if (interests.value.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return
  props.flow.interests.value = [...interests.value, trimmed]
}

onBeforeUnmount(() => {
  abortController?.abort()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <section class="ob-page">
    <h1 class="ob-title">{{ t('onboarding.interestsTitle') }}</h1>

    <div class="ob-body">
      <div class="interests__fields">
        <div class="interests__lookup-group">
          <CdxField
            hide-label
            :status="poolLimitReached ? 'success' : 'default'"
            :messages="{}"
          >
            <template #label>{{ t('onboarding.interestsLabel') }}</template>

            <CdxMultiselectLookup
              v-model:input-chips="inputChips"
              v-model:selected="selected"
              class="interests__lookup"
              :menu-items="menuItems"
              :menu-config="menuConfig"
              :separate-input="hasInterests"
              :placeholder="t('onboarding.interestsSearch')"
              :aria-label="t('onboarding.interestsSearch')"
              @input="onSearchInput"
            >
              <template #no-results>{{ t('onboarding.noResults') }}</template>
            </CdxMultiselectLookup>
          </CdxField>

          <div class="interests__message-area" :class="{ active: poolLimitReached }">
            <Transition name="interests-message">
              <div v-show="poolLimitReached" class="interests__message">
                <CdxMessage type="success" inline>
                  {{ t('onboarding.interestsDone') }}
                </CdxMessage>
              </div>
            </Transition>
          </div>
        </div>

        <InterestSuggestions
          :suggestions="visibleSuggestions"
          :loading="suggestionsLoading"
          :source="suggestionsSource"
          @add="addInterest"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.interests__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
}

.interests__lookup-group > * {
  margin: 0;
}

.interests__lookup-group :deep(.cdx-field__help-text:empty) {
  display: none;
}

.interests__message {
  margin-top: var(--spacing-25, 4px);
}

.interests__message-area {
  display: grid;
  overflow: hidden;
  max-height: 0;
  transition: max-height 200ms ease-out;
}

.interests__message-area.active {
  max-height: calc(var(--spacing-25, 4px) + var(--line-height-medium, 1.625rem) * 3);
}

.interests-message-enter-active {
  transition:
    opacity 400ms ease-out,
    transform 200ms ease-out;
}

.interests-message-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
