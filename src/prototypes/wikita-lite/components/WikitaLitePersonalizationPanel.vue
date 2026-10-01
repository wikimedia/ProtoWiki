<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import {
  CdxMultiselectLookup,
  type ChipInputItem,
  type MenuItemData,
  type MenuItemValue,
} from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'

import { fetchInterestSearchResults } from '../../musical-group/data/fetchInterestSearchResults'
import type { SuggestionPreferences } from '../../musical-group/data/suggestionPreferences'
import { useWikitaLiteSuggestionPreferencesSingleton } from '../composables/useWikitaLiteSuggestionPreferences'
import { useWikitaLiteUrlState } from '../composables/useWikitaLiteUrlState'
import WikitaLitePersonalizationAdvancedSection from './WikitaLitePersonalizationAdvancedSection.vue'
import WikitaLitePersonalizationToggleRow from './WikitaLitePersonalizationToggleRow.vue'

const MAX_INTERESTS = 10

const { preferences, listInterests, commitInterests, interestsVersion } =
  useWikitaLiteSuggestionPreferencesSingleton()
const { state } = useWikitaLiteUrlState()
const { currentUserPageLists } = useConfig()

const savedInterests = computed(() => {
  interestsVersion.value
  return listInterests()
})

const interestCount = computed(() => state.value.interests.length)
const savedCount = computed(() => currentUserPageLists.value.readingList.length)
const watchlistCount = computed(() => currentUserPageLists.value.watchlist.length)
const editedCount = computed(() => currentUserPageLists.value.editedPages.length)

function pagesLabel(count: number): string {
  return t('components.pageCount', count)
}

function editsLabel(count: number): string {
  return t('components.editCount', count)
}

function updatePreference(key: keyof SuggestionPreferences, value: boolean): void {
  preferences.value = { ...preferences.value, [key]: value }
}

const inputChips = ref<ChipInputItem[]>([])
const selected = ref<MenuItemValue[]>([])
const menuItems = ref<MenuItemData[]>([])
const menuConfig = { showThumbnail: true, boldLabel: true }

function sameSet(a: string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

let syncingFromInterests = false

watch(
  savedInterests,
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
  if (sameSet(titles, savedInterests.value)) return
  commitInterests(titles.slice(0, MAX_INTERESTS))
})

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
    const hits = await fetchInterestSearchResults(trimmed, abortController.signal)
    const existing = new Set(savedInterests.value.map((item) => item.toLowerCase()))
    menuItems.value = hits
      .filter((hit) => !existing.has(hit.title.toLowerCase()))
      .map((hit) => ({
        value: hit.title,
        label: hit.title,
        description: hit.description || undefined,
        thumbnail: hit.thumbnailUrl ? { url: hit.thumbnailUrl } : null,
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

onBeforeUnmount(() => {
  abortController?.abort()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="wikita-lite-personalization-panel">
    <div class="wikita-lite-personalization-panel__toggles">
      <WikitaLitePersonalizationToggleRow
        :label="t('components.interestsOrTopics')"
        :count-label="pagesLabel(interestCount)"
        :count-active="interestCount > 0"
        :model-value="preferences.useInterests"
        @update:model-value="updatePreference('useInterests', $event)"
      />

      <div
        v-if="preferences.useInterests"
        class="wikita-lite-personalization-panel__interests-editor"
      >
        <CdxMultiselectLookup
          v-model:input-chips="inputChips"
          v-model:selected="selected"
          class="wikita-lite-personalization-panel__lookup"
          :menu-items="menuItems"
          :menu-config="menuConfig"
          :separate-input="savedInterests.length > 0"
          :placeholder="t('components.searchArticlesOrTopics')"
          :aria-label="t('components.searchArticlesOrTopics')"
          @input="onSearchInput"
        >
          <template #no-results>{{ t('components.noResults') }}</template>
        </CdxMultiselectLookup>
      </div>

      <WikitaLitePersonalizationToggleRow
        :label="t('components.savedPages')"
        :count-label="pagesLabel(savedCount)"
        :count-active="savedCount > 0"
        :model-value="preferences.useSavedPages"
        @update:model-value="updatePreference('useSavedPages', $event)"
      />

      <WikitaLitePersonalizationToggleRow
        :label="t('components.watchlist')"
        :count-label="pagesLabel(watchlistCount)"
        :count-active="watchlistCount > 0"
        :model-value="preferences.useWatchlist"
        @update:model-value="updatePreference('useWatchlist', $event)"
      />

      <WikitaLitePersonalizationToggleRow
        :label="t('components.contributions')"
        :count-label="editsLabel(editedCount)"
        :count-active="editedCount > 0"
        :model-value="preferences.useEditingHistory"
        @update:model-value="updatePreference('useEditingHistory', $event)"
      />
    </div>

    <WikitaLitePersonalizationAdvancedSection />
  </div>
</template>

<style scoped>
.wikita-lite-personalization-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  padding-bottom: var(--spacing-150, 24px);
}

.wikita-lite-personalization-panel__toggles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.wikita-lite-personalization-panel__interests-editor {
  margin-top: calc(-1 * var(--spacing-25, 4px));
}

.wikita-lite-personalization-panel__lookup :deep(.cdx-multiselect-lookup__chips) {
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}
</style>
