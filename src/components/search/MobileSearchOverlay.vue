<script setup lang="ts">
/**
 * Full-screen mobile search, the way Minerva does it: tapping the bar's search
 * icon replaces the chrome with a search bar and a list of title suggestions,
 * and picking a row is the only way out into an article — there is no
 * "search results page" behind Enter.
 *
 * Where a pick lands is the page's call, not this component's: a prototype that
 * can render an arbitrary article registers an **`articleOpener`** and the row
 * loads in place, keeping the reader inside ProtoWiki. With nothing registered
 * the row is an ordinary link to the real wiki, which is the only honest
 * destination left.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxProgressBar, CdxTextInput } from '@wikimedia/codex'
import { cdxIconArrowPrevious } from '@wikimedia/codex-icons'

import { articleOpener } from '@/components/article/shared/articleOpener'
import { wikiArticleUrl } from '@/config'
import { t } from '@/i18n'
import TitleSearchResults from './TitleSearchResults.vue'
import { fetchTitleSearchResults, type TitleSearchResult } from './titleSearch'
import type { Theme } from '@/theme'

interface Props {
  /** Placeholder text inside the input (default: "Search Wikipedia" in the UI language). */
  placeholder?: string
  /** Language code for the wiki searched (default `en`). */
  lang?: string
  /** Maximum suggestions to show. */
  limit?: number
  /** Appended to the API user agent so requests are traceable to a prototype. */
  clientTag?: string
  /** Local theme override. Sets `data-theme` on the root. */
  theme?: Theme
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  lang: 'en',
  limit: 6,
  clientTag: 'mobile-search',
  theme: undefined,
})

const emit = defineEmits<{
  /** The back button, Escape, or a pick that opened in place closed the overlay. */
  close: []
}>()

const placeholderText = computed(() => props.placeholder ?? t('search.placeholder'))

const query = ref('')
const results = ref<TitleSearchResult[]>([])
const loading = ref(false)
const root = ref<HTMLElement | null>(null)

let abortController: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastRequestedTerm = ''

async function fetchSuggestions(term: string): Promise<void> {
  abortController?.abort()
  const trimmed = term.trim()
  if (!trimmed.length) {
    lastRequestedTerm = ''
    results.value = []
    loading.value = false
    return
  }

  abortController = new AbortController()
  const { signal } = abortController
  lastRequestedTerm = trimmed
  loading.value = true

  // A superseded request must not touch shared state: its rows are stale, and
  // clearing `loading` would hide the spinner while the newer one is in flight.
  const isCurrent = (): boolean => !signal.aborted && lastRequestedTerm === trimmed

  try {
    const found = await fetchTitleSearchResults(trimmed, {
      signal,
      lang: props.lang,
      limit: props.limit,
      clientTag: props.clientTag,
    })
    if (isCurrent()) results.value = found
  } catch (error) {
    if ((error as Error).name !== 'AbortError' && isCurrent()) results.value = []
  } finally {
    if (isCurrent()) loading.value = false
  }
}

watch(query, (term) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  // An emptied field has nothing to wait for: drop the rows (and the request in
  // flight) now instead of leaving stale suggestions up for another 200ms.
  if (!term.trim().length) {
    void fetchSuggestions('')
    return
  }
  debounceTimer = setTimeout(() => void fetchSuggestions(term), 200)
})

/*
 * Codex's `v-model` (like Vue's) does not update during IME composition, so on
 * predictive mobile keyboards `query` wouldn't change until the word is
 * committed (space/punctuation). Read the raw input value on every keystroke so
 * search runs as the user types.
 */
function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value
}

/**
 * Every row carries a real `href` — the in-ProtoWiki URL when the page can
 * render an arbitrary article, the wiki page otherwise — so new-tab clicks and
 * the status bar tell the truth.
 */
const resolveHref = computed(() => {
  const opener = articleOpener.value
  if (opener) return (title: string) => opener.href(title)
  return (title: string) => wikiArticleUrl(props.lang, title)
})

function select(title: string, event: MouseEvent): void {
  const trimmed = title.trim()
  if (!trimmed.length) return

  // A modified click is the reader asking for a new tab: the row is a real
  // link, so let the browser take it and leave search standing.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const opener = articleOpener.value
  // Nothing here can render an arbitrary article, so the row's href — the real
  // wiki page — is the destination. Leaving the default alone follows it.
  if (!opener) return

  event.preventDefault()
  opener.open(trimmed)
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  // Focus the field so the keyboard is ready the moment search opens.
  root.value?.querySelector('input')?.focus()
})

onBeforeUnmount(() => {
  abortController?.abort()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div
    ref="root"
    class="mobile-search"
    data-skin="mobile"
    :data-theme="props.theme"
    role="dialog"
    :aria-label="t('search.dialogLabel')"
    @keydown="onKeydown"
  >
    <div class="mobile-search__bar">
      <CdxButton
        class="mobile-search__back"
        weight="quiet"
        size="large"
        :aria-label="t('search.close')"
        @click="emit('close')"
      >
        <CdxIcon :icon="cdxIconArrowPrevious" />
      </CdxButton>

      <!-- No-op submit: Enter must not leave for a results page. Users pick a row. -->
      <form class="mobile-search__field" @submit.prevent>
        <CdxTextInput
          v-model="query"
          class="mobile-search__input"
          input-type="search"
          :placeholder="placeholderText"
          :aria-label="placeholderText"
          clearable
          @input="onInput"
        />
      </form>

      <!-- Overlays the bar's bottom edge so results don't shift while loading. -->
      <div v-if="loading" class="mobile-search__loading">
        <CdxProgressBar inline :aria-label="t('search.loading')" />
      </div>
    </div>

    <div class="mobile-search__results">
      <TitleSearchResults
        v-if="results.length"
        layout="detached"
        :results="results"
        :resolve-href="resolveHref"
        @select="select"
      />
    </div>
  </div>
</template>

<style scoped>
/*
 * Fixed rather than in the document flow: it stands in for the whole screen
 * while open, so it has to cover the chrome that opened it (and the
 * viewport-fixed Home affordance) instead of pushing the article down.
 */
.mobile-search {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-overlay, 450);
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

/* Same treatment as the Minerva bar it replaces, so the swap reads as one surface. */
.mobile-search__bar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-50, 8px) var(--spacing-50, 8px) var(--spacing-50, 8px)
    var(--spacing-25, 4px);
  background-color: var(--background-color-interactive, #eaecf0);
  box-shadow: inset 0 -1px 3px 0 rgba(0, 0, 0, 0.08);
}

.mobile-search__back.cdx-button {
  box-sizing: border-box;
  flex-shrink: 0;
  width: var(--size-icon-large, 40px);
  min-width: var(--size-icon-large, 40px);
  height: var(--size-icon-large, 40px);
  min-height: var(--size-icon-large, 40px);
  padding: 0;
  color: var(--color-subtle, #54595d);
}

.mobile-search__field {
  flex: 1;
  min-width: 0;
}

.mobile-search__input {
  width: 100%;
}

.mobile-search__loading {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}

.mobile-search__results {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Full-screen list: drop the dropdown card border so rows sit flush in the page. */
.mobile-search__results :deep(.title-search-results) {
  margin: 0;
  border: none;
  border-radius: 0;
}
</style>
