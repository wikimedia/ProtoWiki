<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxSearchInput, CdxSearchResultTitle, CdxTypeaheadSearch } from '@wikimedia/codex'
import type { SearchResult } from '@wikimedia/codex'

import { searchSubTabs } from '../lib/component-tabs'
import { filterTypeaheadSearchResults } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const searchValue = ref('')

const typeaheadInitialQuery = 'Albert'

const defaultTypeaheadQuery = ref(typeaheadInitialQuery)
const defaultTypeaheadResults = ref<SearchResult[]>(
  filterTypeaheadSearchResults(typeaheadInitialQuery),
)
const buttonTypeaheadQuery = ref(typeaheadInitialQuery)
const buttonTypeaheadResults = ref<SearchResult[]>(
  filterTypeaheadSearchResults(typeaheadInitialQuery),
)

function typeaheadFooterUrl(query: string): string {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
}

const defaultTypeaheadFooterUrl = computed(() => typeaheadFooterUrl(defaultTypeaheadQuery.value))
const buttonTypeaheadFooterUrl = computed(() => typeaheadFooterUrl(buttonTypeaheadQuery.value))

function onDefaultTypeaheadInput(value: string) {
  defaultTypeaheadQuery.value = value
  defaultTypeaheadResults.value = filterTypeaheadSearchResults(value)
}

function onButtonTypeaheadInput(value: string) {
  buttonTypeaheadQuery.value = value
  buttonTypeaheadResults.value = filterTypeaheadSearchResults(value)
}
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-search"
    :items="searchSubTabs"
    default-active="search-input"
    ariaLabel="Search"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'search-input'">
        <PlaygroundGrid min="240px">
          <PlaygroundCell label="default">
            <CdxSearchInput v-model="searchValue" placeholder="Search" />
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxSearchInput model-value="Disabled" disabled />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'typeahead-search'">
        <PlaygroundGrid min="320px">
          <PlaygroundCell label="default">
            <CdxTypeaheadSearch
              id="playground-search"
              form-action="https://en.wikipedia.org/w/index.php"
              placeholder="Search Wikipedia"
              :initial-input-value="typeaheadInitialQuery"
              :search-results="defaultTypeaheadResults"
              :search-footer-url="defaultTypeaheadFooterUrl"
              search-results-label="Search results"
              @input="onDefaultTypeaheadInput"
            >
              <template #search-footer-text="{ searchQuery }">
                Search Wikipedia for pages containing
                <strong>{{ searchQuery }}</strong>
              </template>
            </CdxTypeaheadSearch>
          </PlaygroundCell>
          <PlaygroundCell label="use-button">
            <CdxTypeaheadSearch
              id="playground-search-button"
              form-action="https://en.wikipedia.org/w/index.php"
              placeholder="Search Wikipedia"
              :initial-input-value="typeaheadInitialQuery"
              :search-results="buttonTypeaheadResults"
              :search-footer-url="buttonTypeaheadFooterUrl"
              search-results-label="Search results"
              use-button
              @input="onButtonTypeaheadInput"
            >
              <template #search-footer-text="{ searchQuery }">
                Search Wikipedia for pages containing
                <strong>{{ searchQuery }}</strong>
              </template>
            </CdxTypeaheadSearch>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'search-result-title'">
        <PlaygroundGrid min="240px">
          <PlaygroundCell label="with query">
            <CdxSearchResultTitle title="Albert Einstein" search-query="Albert" />
          </PlaygroundCell>
          <PlaygroundCell label="no query">
            <CdxSearchResultTitle title="Albert Einstein" />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped></style>
