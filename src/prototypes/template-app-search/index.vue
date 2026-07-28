<script setup lang="ts">
definePage({
  meta: {
    title: 'Search',
    description: 'Template for an in-app live search screen with multilingual results.',
    category: 'template',
    platform: 'app',
  },
})

import { computed, defineComponent, h, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon, CdxMenuButton, CdxMessage, CdxSearchInput, CdxTab, CdxTabs } from '@wikimedia/codex'
import { cdxIconArrowPrevious, cdxIconTrash } from '@wikimedia/codex-icons'

import AppChromeHeader from '@/components/app/AppChromeHeader.vue'
import type { AppHeaderItem } from '@/components/app/AppChromeHeader.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'

import { DEFAULT_SEARCH_LANGUAGES, MORE_SEARCH_LANGUAGES, type SearchLanguageOption } from './searchLanguages'
import { searchWiki, type WikiSearchResult } from './searchWiki'
import { useRecentSearches } from './useRecentSearches'

const router = useRouter()

const query = ref('')
const langTabs = ref<SearchLanguageOption[]>([...DEFAULT_SEARCH_LANGUAGES])
const activeLang = ref(langTabs.value[0].code)
const pendingMoreSelection = ref<string | null>(null)

const results = ref<WikiSearchResult[]>([])
const searchLoading = ref(false)
const searchError = ref<string | null>(null)
const selectedTitle = ref<string | null>(null)

const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches()

let searchAbort: AbortController | null = null
let debounceHandle: ReturnType<typeof setTimeout> | undefined

const moreLanguageMenuItems = computed(() =>
  MORE_SEARCH_LANGUAGES.filter(
    (lang) => !langTabs.value.some((tab) => tab.code === lang.code),
  ).map((lang) => ({ value: lang.code, label: `${lang.code.toUpperCase()} ${lang.label}` })),
)

function goBack(): void {
  router.back()
}

const SearchInputField = defineComponent({
  name: 'TemplateAppSearchInput',
  setup() {
    return () =>
      h(CdxSearchInput, {
        class: 'template-app-search__input',
        modelValue: query.value,
        'onUpdate:modelValue': (value: string) => {
          query.value = value
        },
        placeholder: 'Search Wikipedia…',
        clearable: true,
        onSubmitClick: onSubmit,
      })
  },
})

const searchHeaderLeft: AppHeaderItem[] = [
  { type: 'button', icon: cdxIconArrowPrevious, label: 'Back', onClick: goBack },
  { type: 'component', component: SearchInputField },
]

function onAddLanguage(value: string | number | null): void {
  if (typeof value !== 'string') return

  const lang = MORE_SEARCH_LANGUAGES.find((item) => item.code === value)
  if (!lang) return

  langTabs.value = [...langTabs.value, lang]
  activeLang.value = lang.code
  pendingMoreSelection.value = null
}

async function runSearch(): Promise<void> {
  const trimmed = query.value.trim()
  if (!trimmed.length) {
    results.value = []
    searchError.value = null
    searchLoading.value = false
    return
  }

  searchAbort?.abort()
  searchAbort = new AbortController()
  const { signal } = searchAbort

  searchLoading.value = true
  searchError.value = null

  try {
    const found = await searchWiki(trimmed, { signal, lang: activeLang.value })
    if (signal.aborted) return
    results.value = found
  } catch (err) {
    if (signal.aborted) return
    searchError.value = err instanceof Error ? err.message : 'Search failed.'
    results.value = []
  } finally {
    if (!signal.aborted) searchLoading.value = false
  }
}

watch([query, activeLang], () => {
  selectedTitle.value = null
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => {
    void runSearch()
  }, 250)
})

function onSubmit(): void {
  if (debounceHandle) clearTimeout(debounceHandle)
  addRecentSearch(query.value)
  void runSearch()
}

function selectRecentSearch(term: string): void {
  query.value = term
}

function selectResult(result: WikiSearchResult): void {
  addRecentSearch(query.value)
  selectedTitle.value = result.title
}
</script>

<template>
  <MobileWrapper>
    <div class="template-app-search-shell">
      <AppChromeHeader :left="searchHeaderLeft" :right="[]" />

      <div class="template-app-search">
      <div class="template-app-search__lang-row">
        <CdxTabs v-model:active="activeLang" class="template-app-search__tabs">
          <CdxTab
            v-for="tab in langTabs"
            :key="tab.code"
            :name="tab.code"
            :label="`${tab.code.toUpperCase()} ${tab.label}`"
          />
        </CdxTabs>

        <CdxMenuButton
          v-if="moreLanguageMenuItems.length"
          v-model:selected="pendingMoreSelection"
          class="template-app-search__more"
          weight="quiet"
          :menu-items="moreLanguageMenuItems"
          @update:selected="onAddLanguage"
        >
          more
        </CdxMenuButton>
      </div>

      <template v-if="!query.trim()">
        <div class="template-app-search__section-header">
          <h2 class="template-app-search__section-title">Recent searches</h2>
          <CdxButton
            v-if="recentSearches.length"
            weight="quiet"
            aria-label="Clear recent searches"
            @click="clearRecentSearches"
          >
            <CdxIcon :icon="cdxIconTrash" />
          </CdxButton>
        </div>

        <ul v-if="recentSearches.length" class="template-app-search__recent-list">
          <li v-for="item in recentSearches" :key="item">
            <button
              type="button"
              class="template-app-search__recent-item"
              @click="selectRecentSearch(item)"
            >
              {{ item }}
            </button>
          </li>
        </ul>
        <p v-else class="template-app-search__status">No recent searches.</p>
      </template>

      <template v-else>
        <CdxMessage v-if="searchError" type="warning">{{ searchError }}</CdxMessage>

        <p v-else-if="searchLoading && !results.length" class="template-app-search__status">
          Searching…
        </p>

        <p v-else-if="!results.length" class="template-app-search__status">
          No results for "{{ query }}".
        </p>

        <template v-else>
          <CdxMessage v-if="selectedTitle" type="success" allow-user-dismiss>
            Selected "{{ selectedTitle }}".
          </CdxMessage>

          <ul class="template-app-search__results">
            <li v-for="result in results" :key="result.pageid">
              <button
                type="button"
                class="template-app-search__result"
                @click="selectResult(result)"
              >
                <span class="template-app-search__result-text">
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span class="template-app-search__result-title" v-html="result.titleHtml" />
                  <span v-if="result.description" class="template-app-search__result-snippet">
                    {{ result.description }}
                  </span>
                </span>
                <img
                  v-if="result.thumbnailUrl"
                  class="template-app-search__result-thumb"
                  :src="result.thumbnailUrl"
                  alt=""
                  width="64"
                  height="64"
                />
              </button>
            </li>
          </ul>
        </template>
      </template>
      </div>
    </div>
  </MobileWrapper>
</template>

<style scoped>
.template-app-search-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.template-app-search__input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
}

.template-app-search {
  flex: 1 1 auto;
  padding: var(--spacing-100, 16px) var(--spacing-150, 24px);
}

.template-app-search__lang-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
}

.template-app-search__tabs {
  flex: 1 1 auto;
  min-width: 0;
}

.template-app-search__more {
  flex-shrink: 0;
  font-weight: var(--font-weight-normal, 400);
}

.template-app-search__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-100, 16px);
}

.template-app-search__section-title {
  margin: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-large, 1rem);
  font-weight: var(--font-weight-bold, 700);
}

.template-app-search__status {
  color: var(--color-subtle, #54595d);
}

.template-app-search__recent-list,
.template-app-search__results {
  list-style: none;
  margin: 0;
  padding: 0;
}

.template-app-search__recent-item {
  display: block;
  width: 100%;
  padding: var(--spacing-75, 12px) 0;
  border: 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background: none;
  text-align: left;
  color: var(--color-base, #202122);
  font: inherit;
  cursor: pointer;
}

.template-app-search__result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-start-typeahead-search-figure, 12px);
  width: 100%;
  padding: var(--spacing-75, 12px) 0;
  border: 0;
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background: none;
  text-align: left;
  color: var(--color-base, #202122);
  font: inherit;
  cursor: pointer;
}

.template-app-search__result-text {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-12, 2px);
}

.template-app-search__result-title {
  display: block;
  font-weight: var(--font-weight-normal, 400);
}

.template-app-search__result-snippet {
  display: block;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-normal, 400);
}

.template-app-search__result-title :deep(.searchmatch) {
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.template-app-search__result-thumb {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  border-radius: var(--border-radius-base, 2px);
  object-fit: cover;
}
</style>
