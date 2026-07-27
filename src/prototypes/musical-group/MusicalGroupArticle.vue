<script setup lang="ts">
import { ref, watch } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import WikitaCardNotice from './components/WikitaCardNotice.vue'
import WikitaCardScrollTable from './components/WikitaCardScrollTable.vue'
import WikitaCardSidebar from './components/WikitaCardSidebar.vue'
import { useWikitaUiSkin } from './composables/useWikitaUiSkin'
import { fetchWikitaArticleHtml } from './data/fetchWikitaArticle'
import { getCachedMusicalGroup } from './data/musicalGroupCache'
import { parseWikitaArticleBlocks, type WikitaArticleBlock } from './data/parseWikitaArticle'
import { useWikitaArticleLinks } from './useWikitaArticleLinks'

interface Props {
  title?: string
  itemId?: string
}

const props = defineProps<Props>()

const effectiveSkin = useWikitaUiSkin()

const blocks = ref<WikitaArticleBlock[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const articleRef = ref<HTMLElement | null>(null)

const { onArticleClick, prefetchLinkTargets } = useWikitaArticleLinks(
  articleRef,
  () => props.title,
)

let fetchAbort: AbortController | null = null

async function loadArticle(title: string) {
  fetchAbort?.abort()
  fetchAbort = new AbortController()

  if (props.itemId) {
    const cached = getCachedMusicalGroup(props.itemId)
    if (cached?.articleHtml) {
      loading.value = false
      error.value = null
      blocks.value = parseWikitaArticleBlocks(cached.articleHtml)
      void prefetchLinkTargets(blocks.value, fetchAbort.signal)
      return
    }
  }

  loading.value = true
  error.value = null
  blocks.value = []

  try {
    const html = await fetchWikitaArticleHtml(title, {
      signal: fetchAbort.signal,
      itemId: props.itemId,
    })
    const parsed = parseWikitaArticleBlocks(html)
    blocks.value = parsed
    void prefetchLinkTargets(parsed, fetchAbort.signal)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    error.value = 'Could not load this article. Try again.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.title,
  (title) => {
    if (!title) {
      fetchAbort?.abort()
      blocks.value = []
      loading.value = false
      error.value = null
      return
    }
    void loadArticle(title)
  },
  { immediate: true },
)
</script>

<template>
  <div class="musical-group-article">
    <CdxProgressBar v-if="loading" inline aria-label="Loading article" />

    <p v-else-if="!title" class="musical-group-article__empty">No English Wikipedia article.</p>

    <p v-else-if="error" class="musical-group-article__empty">{{ error }}</p>

    <p v-else-if="!blocks.length" class="musical-group-article__empty">No article content available.</p>

    <div
      v-else
      ref="articleRef"
      class="wikita-article"
      :class="{
        'wikita-article--wikipedia': effectiveSkin === 'wikipedia',
        'mw-parser-output': effectiveSkin === 'wikipedia',
      }"
      :data-skin="effectiveSkin === 'wikipedia' ? 'mobile' : undefined"
      @click="onArticleClick"
    >
      <template v-for="(block, index) in blocks" :key="index">
        <WikitaCardScrollTable
          v-if="block.type === 'table'"
          class="wikita-article-table"
          :html="block.html"
          :caption="block.caption"
        />
        <WikitaCardSidebar v-else-if="block.type === 'sidebar'" class="wikita-article-sidebar" :html="block.html" />
        <WikitaCardNotice v-else-if="block.type === 'notice'" :html="block.html" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else class="wikita-article__prose" v-html="block.html" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.musical-group-article {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 0;
}

.musical-group-article__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.wikita-article {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 0;
}

.wikita-article--wikipedia {
  gap: var(--spacing-75);
}

.wikita-article--wikipedia .wikita-article__prose :deep(h2) {
  font-family: var(--font-family-base);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large);
  border-bottom-color: var(--border-color-muted);
}

.wikita-article--wikipedia .wikita-article__prose :deep(.thumb),
.wikita-article--wikipedia .wikita-article__prose :deep(figure) {
  border-color: var(--border-color-base);
  border-radius: var(--border-radius-base);
}

.wikita-article__prose {
  min-width: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.wikita-article__prose :deep(h3),
.wikita-article__prose :deep(h4) {
  margin: var(--spacing-100) 0 var(--spacing-50);
  font-family: var(--font-family-base);
  color: var(--color-emphasized);
}

.wikita-article__prose :deep(h2) {
  margin: var(--spacing-100) 0 var(--spacing-50);
  padding-bottom: var(--spacing-50);
  border-bottom: 1px solid var(--color-base);
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xx-large);
  color: var(--color-emphasized);
}

.wikita-article__prose :deep(h3) {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
}

.wikita-article__prose :deep(h4) {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
}

.wikita-article__prose :deep(p),
.wikita-article__prose :deep(ul),
.wikita-article__prose :deep(ol) {
  margin: 0 0 var(--spacing-100);
}

.wikita-article__prose :deep(a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-article__prose :deep(a:hover) {
  text-decoration: underline;
}

.wikita-article__prose :deep(.thumb),
.wikita-article__prose :deep(figure) {
  float: none !important;
  clear: both;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0 0 var(--spacing-100);
  border: 1px solid var(--color-base);
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--background-color-base);
}

.wikita-article__prose :deep(.thumbinner),
.wikita-article__prose :deep(.thumbcaption) {
  width: 100% !important;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
}

.wikita-article__prose :deep(.thumbcaption),
.wikita-article__prose :deep(figcaption) {
  margin: 0;
  padding: var(--spacing-25) var(--spacing-50);
  border-top: 1px solid var(--color-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.wikita-article__prose :deep(.thumb img),
.wikita-article__prose :deep(figure img) {
  display: block;
  width: 100%;
  height: auto;
}

.wikita-article__prose :deep(sup.wikita-ref) {
  font-family: var(--font-family-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: 0;
  vertical-align: super;
}

.wikita-article__prose :deep(sup.wikita-ref a) {
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-article__prose :deep(sup.wikita-ref a:hover) {
  text-decoration: underline;
}

.wikita-article__prose :deep(.mw-halign-left),
.wikita-article__prose :deep(.mw-halign-right),
.wikita-article__prose :deep(.mw-halign-none) {
  float: none !important;
  margin-inline: 0;
}

/* Sister-project and other Wikipedia side boxes (e.g. {{Wikiquote}}, {{Commons category}}). */
.wikita-article__prose :deep(.side-box) {
  box-sizing: border-box;
  width: 100%;
  clear: both;
  float: none;
  margin: var(--spacing-50) 0;
  border: 1px solid var(--border-color-muted);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base);
  background-color: var(--background-color-neutral-subtle);
}

.wikita-article__prose :deep(.side-box-flex) {
  display: flex;
  align-items: center;
}

.wikita-article__prose :deep(.side-box-text) {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-25) var(--spacing-100);
}

.wikita-article__prose :deep(.side-box-image) {
  flex-shrink: 0;
  padding: var(--spacing-25) 0 var(--spacing-25) var(--spacing-100);
  text-align: center;
}

.wikita-article__prose :deep(.side-box-imageright) {
  flex-shrink: 0;
  padding: var(--spacing-25) var(--spacing-100) var(--spacing-25) 0;
  text-align: center;
}

.wikita-article__prose :deep(.side-box-abovebelow) {
  padding: var(--spacing-25) var(--spacing-100);
}

.wikita-article__prose :deep(.side-box .plainlist ul),
.wikita-article__prose :deep(.side-box .plainlist ol) {
  margin: 0;
  padding: 0;
  list-style: none;
}

.wikita-article__prose :deep(.side-box img) {
  display: block;
  width: auto;
  height: auto;
  max-width: none;
}

/* Wikipedia navboxes at the foot of articles (e.g. {{Little Mix}}). */
.wikita-article__prose :deep(.navbox) {
  box-sizing: border-box;
  width: auto;
  min-width: 0;
  max-width: none;
  clear: both;
  margin: var(--spacing-100) 0 0;
  padding: 1px var(--spacing-50);
  border: 1px solid var(--border-color-muted);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  text-align: center;
  color: var(--color-base);
  background-color: var(--background-color-base);
  overflow-x: auto;
  overscroll-behavior-x: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  scroll-padding-inline: var(--spacing-50);
  scrollbar-width: none;
}

.wikita-article__prose :deep(.navbox::-webkit-scrollbar) {
  display: none;
}

.wikita-article__prose :deep(.navbox .navbox) {
  margin-top: 0;
  margin-inline: 0;
}

.wikita-article__prose :deep(.navbox-inner),
.wikita-article__prose :deep(.navbox-subgroup) {
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.wikita-article__prose :deep(.navbox-title),
.wikita-article__prose :deep(.navbox-abovebelow),
.wikita-article__prose :deep(.navbox-group) {
  padding: var(--spacing-25) var(--spacing-100);
  line-height: var(--line-height-small);
}

.wikita-article__prose :deep(.navbox-title) {
  background-color: var(--background-color-interactive-subtle);
}

.wikita-article__prose :deep(.navbox-abovebelow),
.wikita-article__prose :deep(.navbox-group) {
  background-color: var(--background-color-neutral-subtle);
}

.wikita-article__prose :deep(.navbox-group) {
  white-space: normal;
  text-align: end;
  font-weight: var(--font-weight-bold);
  width: 1%;
}

.wikita-article__prose :deep(.navbox-list) {
  width: 100%;
  max-width: 1px;
  text-align: start;
  line-height: var(--line-height-small);
  white-space: normal;
}

.wikita-article__prose :deep(.navbox-list-with-group) {
  width: 100%;
  max-width: 1px;
  text-align: start;
  border-inline-start: 2px solid var(--background-color-base);
  white-space: normal;
}

.wikita-article__prose :deep(.navbox-even) {
  background-color: var(--background-color-neutral-subtle);
}

.wikita-article__prose :deep(.navbox-inner tr + tr > .navbox-abovebelow),
.wikita-article__prose :deep(.navbox-inner tr + tr > .navbox-group),
.wikita-article__prose :deep(.navbox-inner tr + tr > .navbox-image),
.wikita-article__prose :deep(.navbox-inner tr + tr > .navbox-list) {
  border-top: 2px solid var(--background-color-base);
}

.wikita-article__prose :deep(.navbox .navbar) {
  display: block;
  font-size: var(--font-size-small);
}

.wikita-article__prose :deep(.navbox-title .navbar) {
  float: inline-start;
  text-align: start;
  margin-inline-end: var(--spacing-100);
  padding-inline-end: var(--spacing-50);
}

.wikita-article__prose :deep(.navbox .hlist ul),
.wikita-article__prose :deep(.navbox .hlist ol),
.wikita-article__prose :deep(.navbox td.hlist ul),
.wikita-article__prose :deep(.navbox td.hlist ol) {
  margin: 0;
  padding: 0;
  display: inline;
  list-style: none;
  white-space: normal;
}

.wikita-article__prose :deep(.navbox .hlist li),
.wikita-article__prose :deep(.navbox td.hlist li) {
  margin: 0;
  display: inline;
}

.wikita-article__prose :deep(.navbox .hlist li::after),
.wikita-article__prose :deep(.navbox td.hlist li::after) {
  content: ' · ';
  font-weight: var(--font-weight-bold);
}

.wikita-article__prose :deep(.navbox .hlist li:last-child::after),
.wikita-article__prose :deep(.navbox td.hlist li:last-child::after) {
  content: none;
}

.wikita-article__prose :deep(.navbox ul),
.wikita-article__prose :deep(.navbox ol) {
  margin: 0;
}

/*
 * Route nav tables inside navboxes (e.g. {{London Outer Orbital Path}} on Kingston upon Thames).
 * Parsoid renders these as a full-width inner table; without fixed columns, centered th cells
 * and start-aligned td cells no longer line up.
 */
.wikita-article__prose :deep(.navbox-list:has(> div > table)) {
  max-width: none;
  width: 100%;
  text-align: center;
}

.wikita-article__prose :deep(.navbox-list > div > table) {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: var(--font-size-small);
  text-align: center;
}

.wikita-article__prose :deep(.navbox-list > div > table th),
.wikita-article__prose :deep(.navbox-list > div > table td) {
  text-align: center;
  vertical-align: middle;
  padding: var(--spacing-25) var(--spacing-50);
  border: none;
  font-weight: var(--font-weight-normal);
  background-color: transparent;
}

.wikita-article__prose :deep(.navbox-list > div > table th:nth-child(1)),
.wikita-article__prose :deep(.navbox-list > div > table td:nth-child(1)) {
  width: 30%;
}

.wikita-article__prose :deep(.navbox-list > div > table th:nth-child(2)),
.wikita-article__prose :deep(.navbox-list > div > table td:nth-child(2)) {
  width: 40%;
}

.wikita-article__prose :deep(.navbox-list > div > table th:nth-child(3)),
.wikita-article__prose :deep(.navbox-list > div > table td:nth-child(3)) {
  width: 30%;
}

.wikita-article__prose :deep(.navbox-list > div > table a) {
  font-weight: var(--font-weight-bold);
}

/* Maintenance notices sit tight under section headings — avoid stacked gap + heading margin. */
.wikita-article-notice {
  margin-bottom: calc(-1 * var(--spacing-50));
}

.wikita-article__prose + .wikita-article-notice {
  margin-top: calc(-1 * var(--spacing-50));
}

/*
 * Tighten spacing only at prose ↔ notice/table block boundaries.
 * Scope to the first/last direct child so nested section endings (e.g. p then h3
 * in the same prose block) keep their normal margins.
 */
.wikita-article__prose:has(+ .wikita-article-notice) > :deep(:last-child) :is(h2, h3, h4):last-child {
  margin-bottom: 0;
}

.wikita-article-notice + .wikita-article__prose > :deep(:first-child) :is(h2, h3, h4, p):first-child {
  margin-top: 0;
}

.wikita-article__prose:has(+ .wikita-article-table)
  > :deep(:last-child)
  :is(h2, h3, h4, p, ul, ol):last-child {
  margin-bottom: 0;
}

.wikita-article-table + .wikita-article__prose > :deep(:first-child) :is(h2, h3, h4, p):first-child {
  margin-top: 0;
}

.wikita-article__prose:has(+ .wikita-article-sidebar)
  > :deep(:last-child)
  :is(h2, h3, h4, p, ul, ol, figure):last-child {
  margin-bottom: 0;
}

.wikita-article-sidebar + .wikita-article__prose > :deep(:first-child) :is(h2, h3, h4, p):first-child {
  margin-top: 0;
}
</style>
