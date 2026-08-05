<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  CdxButton,
  CdxCard,
  CdxIcon,
  CdxProgressBar,
  CdxTypeaheadSearch,
  type SearchResult,
} from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import '@wikimedia/codex/dist/modules/CdxChipInput.css'

import { fetchInterestSearchResults } from '../musical-group/data/fetchInterestSearchResults'
import { useWikitaLiteInterestsPage } from '../wikita-lite/composables/useWikitaLiteInterestsPage'
import WikitaLiteFullscreenHeader from '../wikita-lite/components/WikitaLiteFullscreenHeader.vue'
import WikitaLiteFullscreenShell from '../wikita-lite/components/WikitaLiteFullscreenShell.vue'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite/wikita-lite-card'

definePage({
  meta: {
    title: 'Wikita-lite — Select interests',
    description: 'Choose article topics that personalize Wikita-lite suggestions.',
  },
})

const {
  draftInterests,
  relatedItems,
  relatedLoading,
  addInterest,
  removeInterest,
  discardAndClose,
  saveAndClose,
} = useWikitaLiteInterestsPage()

const searchResults = ref<SearchResult[]>([])
const isSearching = ref(false)
const lastQuery = ref('')
const searchResetKey = ref(0)

const showRelatedSection = computed(
  () =>
    draftInterests.value.length > 0 &&
    (relatedLoading.value || relatedItems.value.length > 0),
)

let searchAbort: AbortController | null = null
let searchDebounce: ReturnType<typeof setTimeout> | null = null

function toSearchResult(hit: Awaited<ReturnType<typeof fetchInterestSearchResults>>[number]): SearchResult {
  return {
    value: hit.title,
    label: hit.title,
    description: hit.description,
    thumbnail: hit.thumbnailUrl ? { url: hit.thumbnailUrl } : null,
  }
}

function clearSearchInput() {
  lastQuery.value = ''
  searchResults.value = []
  searchResetKey.value += 1
}

function selectInterest(title: string) {
  const trimmed = title.trim()
  if (!trimmed.length) return
  addInterest(trimmed)
  clearSearchInput()
}

async function runSearch(query: string) {
  searchAbort?.abort()
  searchAbort = new AbortController()
  isSearching.value = true

  try {
    const hits = await fetchInterestSearchResults(query, searchAbort.signal)
    if (lastQuery.value !== query) return
    searchResults.value = hits.map(toSearchResult)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return
    if (lastQuery.value !== query) return
    searchResults.value = []
  } finally {
    if (lastQuery.value === query) isSearching.value = false
  }
}

function onSearchInput(value: string) {
  const trimmed = (value ?? '').trim()
  lastQuery.value = trimmed

  if (searchDebounce) clearTimeout(searchDebounce)

  if (!trimmed.length) {
    searchAbort?.abort()
    searchResults.value = []
    isSearching.value = false
    return
  }

  searchDebounce = setTimeout(() => {
    void runSearch(trimmed)
  }, 250)
}

type TypeaheadSearchEvent = {
  searchResult?: SearchResult | null
  index?: number
  numberOfResults?: number
}

function interestTitleFromResult(result: SearchResult | null | undefined): string {
  if (!result) return ''
  const title = result.label ?? (result.value != null ? String(result.value) : '')
  return title.trim()
}

function onSearchSubmit(payload: TypeaheadSearchEvent) {
  const title = interestTitleFromResult(payload.searchResult)
  if (title) {
    selectInterest(title)
    return
  }
  const query = lastQuery.value.trim()
  if (query) selectInterest(query)
}

function onSearchResultClick(payload: TypeaheadSearchEvent) {
  selectInterest(interestTitleFromResult(payload.searchResult))
}
</script>

<template>
  <WikitaLiteFullscreenShell>
    <WikitaLiteFullscreenHeader title="Select interests" @close="discardAndClose" />

    <div class="wikita-lite-interests">
      <div class="wikita-lite-interests__search">
        <CdxTypeaheadSearch
          :key="searchResetKey"
          id="wikita-lite-interests-search"
          placeholder=""
          form-action="https://en.wikipedia.org/w/index.php"
          :search-results="searchResults"
          search-results-label="Search results"
          :show-thumbnail="true"
          :auto-expand-width="false"
          @input="onSearchInput"
          @search-result-click="onSearchResultClick"
          @submit="onSearchSubmit"
        >
          <template #default>
            <input type="hidden" name="title" value="Special:Search" />
          </template>
        </CdxTypeaheadSearch>
        <div v-if="draftInterests.length" class="wikita-lite-interests__chips">
          <button
            v-for="interest in draftInterests"
            :key="interest"
            type="button"
            class="cdx-input-chip wikita-lite-interests__chip"
            :aria-label="`Remove ${interest}`"
            @click="removeInterest(interest)"
          >
            <span class="cdx-input-chip__text">{{ interest }}</span>
            <CdxIcon
              class="wikita-lite-interests__chip-icon"
              :icon="cdxIconClose"
              size="small"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div class="wikita-lite-interests__scroll">
        <section v-if="showRelatedSection" class="wikita-lite-interests__related">
          <h2 class="wikita-lite-interests__related-title">Related articles</h2>

          <div v-if="relatedLoading && !relatedItems.length" class="wikita-lite-interests__loading">
            <CdxProgressBar inline aria-label="Loading related articles" />
          </div>

          <div v-else-if="relatedItems.length" class="wikita-lite-interests__related-list">
            <button
              v-for="item in relatedItems"
              :key="item.itemId ?? item.title"
              type="button"
              class="wikita-lite-interests__related-item"
              @click="selectInterest(item.title)"
            >
              <CdxCard
                :class="WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE"
                :thumbnail="item.thumbnailUrl?.trim() ? { url: item.thumbnailUrl.trim() } : null"
                :force-thumbnail="true"
              >
                <template #title>
                  {{ item.title }}
                </template>
                <template v-if="item.description" #description>
                  {{ item.description }}
                </template>
              </CdxCard>
            </button>
          </div>
        </section>
      </div>

      <div class="wikita-lite-interests__footer">
        <CdxButton
          class="wikita-lite-interests__done"
          size="large"
          @click="saveAndClose"
        >
          Done
        </CdxButton>
      </div>
    </div>
  </WikitaLiteFullscreenShell>
</template>

<style scoped>
.wikita-lite-interests {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  min-height: 0;
  padding: 0 var(--spacing-100, 16px) var(--spacing-100, 16px);
  overflow: hidden;
}

.wikita-lite-interests__search {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  overflow: visible;
}

/* Thumbnails in results only — keep normal search-icon input padding. */
.wikita-lite-interests__search :deep(.cdx-typeahead-search--show-thumbnail) {
  margin-left: 0;
}

.wikita-lite-interests__search :deep(.cdx-typeahead-search--show-thumbnail .cdx-text-input__input) {
  padding-left: 34px;
}

.wikita-lite-interests__search :deep(.cdx-typeahead-search--show-thumbnail .cdx-text-input__start-icon) {
  left: 9px;
}

.wikita-lite-interests__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.wikita-lite-interests__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
}

.wikita-lite-interests__chip {
  padding-right: 4px;
  cursor: pointer;
}

.wikita-lite-interests__chip-icon {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.wikita-lite-interests__related {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.wikita-lite-interests__related-title {
  margin: 0;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.375);
  color: var(--color-subtle, #54595d);
}

.wikita-lite-interests__related-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.wikita-lite-interests__related-item {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
}

.wikita-lite-interests__related-item:focus-visible {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: 2px;
  border-radius: var(--border-radius-base, 2px);
}

.wikita-lite-interests__loading {
  padding-block: var(--spacing-50, 8px);
}

.wikita-lite-interests__footer {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding-top: var(--spacing-100, 16px);
}

.wikita-lite-interests__done {
  width: 100%;
  max-width: none;
}
</style>
