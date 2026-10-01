<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxTypeaheadSearch, type SearchResult } from '@wikimedia/codex'

import { articleOpener } from '@/components/article/shared/articleOpener'
import { sameWikiTitle } from '@/components/article/shared/wikiTitle'
import { fetchTitleSearchResults } from '@/components/search/titleSearch'
import { wikiArticleUrl } from '@/config'
import { t } from '@/i18n'
import { contentWikiHost } from '@/lib/contentLang'
import type { Skin, Theme } from '@/theme'

interface Props {
  /** Wiki host searched, and the one the form falls back to (no protocol). */
  host?: string
  /** Placeholder text inside the input. */
  placeholder?: string
  /** Maximum number of suggestions to show. */
  limit?: number
  /** Local skin override. Sets `data-skin` on the root. */
  skin?: Skin
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
}

interface Emits {
  /** Emitted when a suggestion is selected. Carries the page title. */
  (event: 'select', title: string): void
  /**
   * Emitted when the user submits the search (Enter / search button).
   * Carries the typed query.
   */
  (event: 'submit', query: string): void
}

const props = withDefaults(defineProps<Props>(), {
  // Factories so `?lang=` / `?uselang=` apply (both English by default).
  host: () => contentWikiHost(),
  placeholder: () => t('search.placeholder'),
  limit: 10,
  skin: undefined,
  theme: undefined,
})

const emit = defineEmits<Emits>()

const suggestions = ref<SearchResult[]>([])
const lastQuery = ref('')

const formAction = computed(() => `https://${props.host}/w/index.php`)

/**
 * A prototype that can render an arbitrary article registers an opener, and
 * search stops leaving for the real wiki: suggestions become in-ProtoWiki
 * links, the “pages containing …” footer — which would need a search-results
 * page we don't have — drops out, and submitting goes to the best-matching
 * title instead of `Special:Search`.
 */
const opensInPlace = computed(() => articleOpener.value !== null)

/**
 * Suggestions as the menu renders them. In-place, a result's `url` is its
 * ProtoWiki URL rather than its wiki one — the menu item is an `<a>` either
 * way, so the href decides where a new-tab click lands.
 */
const searchResults = computed<SearchResult[]>(() => {
  const opener = articleOpener.value
  if (!opener) return suggestions.value
  return suggestions.value.map((result) => ({
    ...result,
    url: opener.href(String(result.value)),
  }))
})

const lang = computed(() => props.host.split('.')[0] ?? 'en')

let abortController: AbortController | null = null

/**
 * Title suggestions from the shared **`fetchTitleSearchResults`** — the same
 * prefix-completion endpoint (and the same rows) the mobile overlay shows, so
 * the two search surfaces can't drift apart. **`url`** is the real wiki page:
 * `searchResults` above swaps in the ProtoWiki one when the page can render an
 * arbitrary article.
 */
async function onInput(value: string) {
  const trimmed = (value ?? '').trim()
  lastQuery.value = trimmed
  if (!trimmed) {
    suggestions.value = []
    return
  }

  abortController?.abort()
  abortController = new AbortController()

  try {
    const items = await fetchTitleSearchResults(trimmed, {
      lang: lang.value,
      limit: props.limit,
      signal: abortController.signal,
      clientTag: 'chrome-search',
    })
    if (lastQuery.value !== trimmed) return
    suggestions.value = items.map((item) => ({
      value: item.title,
      label: item.title,
      description: item.description || undefined,
      url: wikiArticleUrl(lang.value, item.title),
    }))
  } catch (error) {
    if ((error as Error).name !== 'AbortError') suggestions.value = []
  }
}

function openInPlace(title: string): void {
  articleOpener.value?.open(title)
}

function onSearchResultClick(payload: { searchResult?: SearchResult | null }) {
  const title = payload.searchResult ? String(payload.searchResult.value) : ''
  if (!title) return
  emit('select', title)
  openInPlace(title)
}

function onSubmit() {
  // CdxTypeaheadSearch only emits `submit` with no result picked, so the typed
  // query is the whole payload.
  const query = lastQuery.value.trim()
  if (query) emit('submit', query)
}

/**
 * MediaWiki's “Go” behaviour, near enough: an exact title match wins, otherwise
 * the first completion.
 */
function topMatchFor(query: string): string | null {
  const titles = suggestions.value.map((result) => String(result.value))
  return titles.find((title) => sameWikiTitle(title, query)) ?? titles[0] ?? null
}

/**
 * What the reader is submitting: the typed query, or — once a suggestion is
 * highlighted with the arrow keys — that suggestion's label, which is what
 * CdxTypeaheadSearch writes into the field. Reading the field back is how a
 * keyboard pick survives at all: the component keeps its selected result to
 * itself and acts on it in the submit handler `onCapturedSubmit` pre-empts.
 */
function submittedQuery(target: EventTarget | null): string {
  const input = target instanceof HTMLElement ? target.querySelector('input[name="search"]') : null
  const value = input instanceof HTMLInputElement ? input.value : ''
  return (value || lastQuery.value).trim()
}

/**
 * Plain clicks on a suggestion are handled by `onSearchResultClick`, so the
 * link's own navigation — a full page load of the same article — is cancelled
 * here. A modified click is left alone: its whole point is the new tab, and the
 * href is a ProtoWiki URL.
 *
 * Capture phase, because the menu item's handler is what emits the click we're
 * pre-empting.
 */
function onCapturedClick(event: MouseEvent): void {
  if (!opensInPlace.value) return
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const target = event.target
  if (target instanceof Element && target.closest('a')) event.preventDefault()
}

/**
 * The form would take the reader to `Special:Search` on the real wiki, so in
 * place it doesn't submit at all — it opens the best match instead.
 *
 * Capture phase and `stopPropagation`, so CdxTypeaheadSearch's own submit
 * handler never runs: with a suggestion selected by keyboard it reaches for
 * `window.location.assign()`, which no `preventDefault()` can call back.
 */
function onCapturedSubmit(event: Event): void {
  if (!opensInPlace.value) return
  event.preventDefault()
  event.stopPropagation()
  const query = submittedQuery(event.target)
  if (!query) return
  const title = topMatchFor(query)
  if (title) openInPlace(title)
}
</script>

<template>
  <div
    class="search-bar"
    :data-skin="props.skin"
    :data-theme="props.theme"
    @click.capture="onCapturedClick"
    @submit.capture="onCapturedSubmit"
  >
    <CdxTypeaheadSearch
      id="protowiki-search"
      name="search"
      :placeholder="props.placeholder"
      :form-action="formAction"
      :search-results="searchResults"
      :search-results-label="props.placeholder"
      :search-footer-url="
        opensInPlace
          ? ''
          : `https://${props.host}/wiki/Special:Search?search=${encodeURIComponent(lastQuery)}`
      "
      :show-thumbnail="false"
      @input="onInput"
      @search-result-click="onSearchResultClick"
      @submit="onSubmit"
    >
      <template #default>
        <input type="hidden" name="title" value="Special:Search" />
        <input type="hidden" name="wprov" value="acrw1_0" />
      </template>
      <template #search-footer-text="{ searchQuery }">
        Search Wikipedia for pages containing
        <strong class="search-bar__highlight">{{ searchQuery }}</strong>
      </template>
    </CdxTypeaheadSearch>
  </div>
</template>

<style scoped>
.search-bar {
  display: block;
  width: 100%;
}

.search-bar__highlight {
  font-weight: var(--font-weight-bold, 700);
}
</style>
