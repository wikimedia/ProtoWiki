<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import { CdxProgressBar, CdxToast } from '@wikimedia/codex'

import ArticleLoadErrorMessage from '@/components/article/ArticleLoadErrorMessage.vue'
import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import type { Skin, Theme } from '@/theme'

import VeEditor from './VeEditor.vue'
import { STR } from './engine/strings'
import { useVisualEditorArticle, type VisualEditorPage } from './useVisualEditorArticle'
import { useWikiPrototypeNavigation } from '@/composables/useWikiPrototypeNavigation'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    error?: string | null
    liveHtml: string | null
    page: VisualEditorPage | null
    skin: Skin
    startInEditMode?: boolean
    /** When set, exit / publish navigates to the read prototype instead of in-place read. */
    readRoute?: string
    prefetchSuggestionCount?: number | null
    /** Suggestion types the editor opens on (see `VeEditor` `focusTypes`). */
    focusSuggestionTypes?: readonly string[] | null
    lang?: string
    dir?: 'ltr' | 'rtl'
    theme?: Theme
  }>(),
  {
    loading: false,
    error: null,
    startInEditMode: false,
    readRoute: undefined,
    prefetchSuggestionCount: null,
    focusSuggestionTypes: null,
    lang: undefined,
    dir: undefined,
    theme: undefined,
  },
)

const editing = defineModel<boolean>('editing', { default: false })
const suggestionCount = defineModel<number | null>('suggestionCount', { default: null })
const sidebarOpenModel = defineModel<boolean>('sidebarOpen', { default: false })

const { navigateToWikiPrototype } = useWikiPrototypeNavigation()

const editorOnly = computed(() => Boolean(props.readRoute))

const liveHtmlComputed = computed(() => props.liveHtml ?? '')
const pageComputed = computed(() => props.page)
const skinComputed = computed(() => props.skin)
const startInEditModeRef = computed(() => props.startInEditMode || editorOnly.value)

const {
  editing: veEditing,
  editKey,
  editorRef,
  editSection,
  readerRef,
  sidebarOpen,
  detectedCount,
  publishedToast,
  displayHtml,
  stopEditing,
  onPublished,
  onEditClick,
  onReadClick,
  exitEditForNavigation,
} = useVisualEditorArticle({
  html: liveHtmlComputed,
  page: pageComputed,
  skin: skinComputed,
  startInEditMode: startInEditModeRef,
  editorOnly,
})

watch(
  veEditing,
  (value) => {
    editing.value = value
  },
  { immediate: true },
)
watch(editing, (value) => {
  if (veEditing.value !== value) veEditing.value = value
})

const shownCount = computed(() => detectedCount.value ?? props.prefetchSuggestionCount ?? null)
watch(
  shownCount,
  (value) => {
    suggestionCount.value = value
  },
  { immediate: true },
)

watch(
  sidebarOpen,
  (value) => {
    sidebarOpenModel.value = value
  },
  { immediate: true },
)
watch(sidebarOpenModel, (value) => {
  if (sidebarOpen.value !== value) sidebarOpen.value = value
})

function navigateToReadRoute() {
  const title = props.page?.title
  if (!props.readRoute || !title?.trim()) return false
  navigateToWikiPrototype(props.readRoute, title)
  return true
}

function handleEditorExit() {
  if (navigateToReadRoute()) return
  stopEditing()
}

function handlePublished(newHtml: string) {
  if (navigateToReadRoute()) return
  onPublished(newHtml)
}

defineExpose({ exitEditForNavigation, onEditClick, onReadClick })
</script>

<template>
  <div class="ve-page__content">
    <CdxProgressBar v-if="loading" inline aria-label="Loading article" />
    <p v-if="loading" class="ve-page__loading">Loading article…</p>
    <ArticleLoadErrorMessage v-if="error" :error="error" />

    <template v-if="page && liveHtml !== null && !loading">
      <VeEditor
        v-if="veEditing && page"
        ref="editorRef"
        :key="editKey"
        :html="displayHtml"
        :skin="skin"
        :page="page"
        :section="editSection"
        :focus-types="focusSuggestionTypes"
        @exit="handleEditorExit"
        @published="handlePublished"
        @sidebar="(open) => (sidebarOpen = open)"
        @detected="(n) => (detectedCount = n)"
      />
      <p v-else-if="editorOnly" class="ve-page__loading">Opening editor…</p>
      <ArticleRenderer
        v-else
        ref="readerRef"
        :key="`${page.title}-${publishedToast}`"
        :lang="lang"
        :dir="dir"
        :skin="skin"
        :theme="theme"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="displayHtml" />
      </ArticleRenderer>
    </template>
  </div>

  <CdxToast v-if="publishedToast" :key="publishedToast" type="success" auto-dismiss>
    {{ STR.editPublished }}
  </CdxToast>
</template>

<style>
html.ve-template-vector .cdx-toast-container {
  top: var(--ve-toast-top, 16px);
  bottom: auto;
  left: auto;
  right: 16px;
  width: 325px;
  max-width: calc(100% - 32px);
}

html.ve-template-vector .cdx-toast-container__stack {
  flex-direction: column;
  align-items: flex-end;
}

html.ve-template-vector .cdx-toast-container .cdx-toast {
  transform: none;
  left: 0;
  width: 100%;
  max-width: 100%;
}
</style>

<style scoped>
.ve-page__loading {
  margin: var(--spacing-75, 12px) 0 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 14px);
}
</style>
