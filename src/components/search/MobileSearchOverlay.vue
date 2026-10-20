<script setup lang="ts">
/**
 * Full-screen mobile search, the way Minerva does it: the search icon swaps the
 * chrome for a search field over a list of title suggestions.
 *
 * Picks go to the page's `provideChromeSearchHandlers`, same as the desktop
 * inline search: a plain click calls `onSelect`, Enter calls `onSubmit` with the
 * first suggestion. Rows stay real links to the wiki, so a modified click opens
 * a new tab — but a plain click never leaves the prototype.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxProgressBar, CdxTextInput } from '@wikimedia/codex'
import { cdxIconArrowPrevious } from '@wikimedia/codex-icons'

import { useChromeSearchHandlers } from '@/composables/useChromeSearch'
import type { Theme } from '@/theme'

import TitleSearchResults from './TitleSearchResults.vue'
import { fetchTitleSearchResults, wikiPageUrl, type TitleSearchResult } from './titleSearch'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    /** Language of the wiki searched. */
    lang?: string
    limit?: number
    /** Local theme override. Sets `data-theme` on the root. */
    theme?: Theme
  }>(),
  { placeholder: 'Search Wikipedia', lang: 'en', limit: 6, theme: undefined },
)

const emit = defineEmits<{
  /** Back, Escape, or a pick. */
  close: []
}>()

const chromeSearchHandlers = useChromeSearchHandlers()

const DEBOUNCE_MS = 200

const query = ref('')
const results = ref<TitleSearchResult[]>([])
/** Query the current `results` were fetched for (guards Enter against stale rows). */
const resultsQuery = ref('')
const loading = ref(false)
const root = ref<HTMLElement | null>(null)

let controller: AbortController | null = null
let debounce: ReturnType<typeof setTimeout> | null = null

async function search(term: string): Promise<void> {
  controller?.abort()
  const trimmed = term.trim()
  if (!trimmed) {
    results.value = []
    resultsQuery.value = ''
    loading.value = false
    return
  }
  controller = new AbortController()
  const { signal } = controller
  loading.value = true
  try {
    const found = await fetchTitleSearchResults(trimmed, {
      signal,
      lang: props.lang,
      limit: props.limit,
      clientTag: 'mobile-search',
    })
    if (!signal.aborted) {
      results.value = found
      resultsQuery.value = trimmed
    }
  } catch {
    if (!signal.aborted) {
      results.value = []
      resultsQuery.value = ''
    }
  } finally {
    // A superseded request leaves the spinner to the one that replaced it.
    if (!signal.aborted) loading.value = false
  }
}

watch(query, (term) => {
  if (debounce) clearTimeout(debounce)
  // An emptied field clears now, rather than leaving stale rows up for the debounce.
  if (!term.trim()) void search('')
  else debounce = setTimeout(() => void search(term), DEBOUNCE_MS)
})

/*
 * `v-model` doesn't update during IME composition, so on predictive mobile
 * keyboards the query would wait for a committed word. Read the raw value on
 * every keystroke instead.
 */
function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value
}

function resolveHref(title: string): string {
  return wikiPageUrl(props.lang, title)
}

function select(title: string, event: MouseEvent): void {
  // A modified click is a new tab: the row is a real link, so let it be.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  chromeSearchHandlers?.onSelect?.(title)
  emit('close')
}

/** Enter picks the first suggestion, like the desktop search's `submit`. */
function submit(): void {
  const trimmed = query.value.trim()
  if (!trimmed) return
  const title = resultsQuery.value === trimmed ? results.value[0]?.title : undefined
  chromeSearchHandlers?.onSubmit?.({ query: trimmed, title })
  if (title) emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

/*
 * The page under the overlay doesn't scroll while search is open: a wheel or
 * swipe over the overlay (empty, or at the end of the results) would otherwise
 * chain through to it.
 */
let pageOverflow = ''

// The keyboard should be up the moment search opens.
onMounted(() => {
  root.value?.querySelector('input')?.focus()
  pageOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  controller?.abort()
  if (debounce) clearTimeout(debounce)
  document.documentElement.style.overflow = pageOverflow
})
</script>

<template>
  <div
    ref="root"
    class="mobile-search"
    data-skin="mobile"
    :data-theme="props.theme"
    role="dialog"
    :aria-label="props.placeholder"
    @keydown="onKeydown"
  >
    <div class="mobile-search__bar">
      <CdxButton
        class="mobile-search__back"
        weight="quiet"
        aria-label="Close search"
        @click="emit('close')"
      >
        <CdxIcon :icon="cdxIconArrowPrevious" />
      </CdxButton>

      <form class="mobile-search__field" @submit.prevent="submit">
        <CdxTextInput
          v-model="query"
          input-type="search"
          :placeholder="props.placeholder"
          :aria-label="props.placeholder"
          clearable
          @input="onInput"
        />
      </form>

      <!--
        Just under the bar, out of the flow: the field keeps its width and the rows
        don't shift. Gone once the results are in.
      -->
      <div v-if="loading" class="mobile-search__loading">
        <CdxProgressBar inline aria-label="Loading search results" />
      </div>
    </div>

    <div class="mobile-search__results">
      <TitleSearchResults
        v-if="results.length"
        :results="results"
        :resolve-href="resolveHref"
        @select="select"
      />
    </div>
  </div>
</template>

<style scoped>
/* Fixed, not in the flow: it stands in for the whole screen, covering the chrome that opened it. */
.mobile-search {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-overlay);
  display: flex;
  flex-direction: column;
  background-color: var(--background-color-base);
  color: var(--color-base);
}

/* Styled like the Minerva bar it replaces, so the swap reads as one surface. */
.mobile-search__bar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50);
  padding: var(--spacing-50) var(--spacing-50) var(--spacing-50) var(--spacing-25);
  padding-top: calc(var(--spacing-50) + env(safe-area-inset-top, 0px));
  background-color: var(--background-color-interactive);
  box-shadow: inset 0 -1px 3px 0 rgba(0, 0, 0, 0.08);
}

/* A 40px target, like the bar's own icon buttons. */
.mobile-search__back.cdx-button {
  flex-shrink: 0;
  width: var(--size-250);
  min-width: var(--size-250);
  height: var(--size-250);
  padding: 0;
  color: var(--color-subtle);
}

.mobile-search__field {
  flex: 1;
  min-width: 0;
}

/*
 * A wrapper, not a class on CdxProgressBar: Codex's own inline-bar rules
 * (`position: relative`, `width: 100%`) outrank ours on its root, and made it a
 * flex item that squeezed the field.
 */
.mobile-search__loading {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 1;
}

.mobile-search__results {
  flex: 1;
  overflow-y: auto;
  /* The end of the results doesn't hand the scroll on to the page. */
  overscroll-behavior: contain;
}
</style>
