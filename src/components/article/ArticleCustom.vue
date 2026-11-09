<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'

import ArticleRenderer from './ArticleRenderer.vue'
import ArticleWrapper from './ArticleWrapper.vue'
import VisualEditorArticleShell from '@/components/visual-editor/VisualEditorArticleShell.vue'
import VisualEditorPageLayout from '@/components/visual-editor/VisualEditorPageLayout.vue'
import { countArticleSuggestions } from '@/components/visual-editor/countArticleSuggestions'
import { useEffectiveEditorEditCount } from '@/composables/useEffectiveEditorEditCount'
import { wikiHostFromLang } from '@/config'
import { globalSkin, PROTOWIKI_CHROME_SKIN, type Skin, type Theme } from '@/theme'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  /** Seeds **`ArticleHeader`** when **`header`** is **`undefined`** (underscores → spaces). Required for **`editable`** (Visual Editor page identity). */
  title?: string
  /** Reader-visible **`ArticleHeader`** override. **`undefined`** → derive from **`title`**. */
  header?: string
  skin?: Skin
  theme?: Theme
  /** Forwarded **`ArticleWrapper`** → **`ArticleHeader`** (**`languagesCount` languages**). */
  languagesCount?: number
  /**
   * In-app article screen: lead block instead of web chrome, in-app reading
   * affordances, skin pinned to **`'mobile'`**. Pair it with **`AppChromeWrapper`**.
   */
  app?: boolean
  /** Short description under the title — **`app`** only. */
  description?: string
  /** Lead image — **`app`** only. */
  leadImageUrl?: string
  /** Web Visual Editor: Edit tab opens in-place editor (ignored when **`app`**). */
  editable?: boolean
  /** Open edit mode once hand-authored body HTML is captured (**`editable`** only). */
  startInEditMode?: boolean
  savedPagesRoute?: string
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  title: undefined,
  header: undefined,
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
  app: false,
  description: undefined,
  leadImageUrl: undefined,
  editable: false,
  startInEditMode: false,
  savedPagesRoute: undefined,
})

const editing = defineModel<boolean>('editing', { default: false })
const suggestionCount = defineModel<number | null>('suggestionCount', { default: null })

const effectiveEditable = computed(() => props.editable && !props.app)

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN, null)
const effectiveSkin = computed(
  () => props.skin ?? inheritedSkin?.value ?? globalSkin.value,
)

const resolvedLang = computed(() => props.lang ?? 'en')

/** Parser HTML captured from the default slot (`.mw-parser-output` innerHTML). */
const bodyHtml = ref<string | null>(null)
const captureRendererRef = ref<InstanceType<typeof ArticleRenderer> | null>(null)
const veShellRef = ref<InstanceType<typeof VisualEditorArticleShell> | null>(null)
const veSidebarOpen = ref(false)

const prefetchSuggestionCount = ref<number | null>(null)
const { editCount, editCountReady } = useEffectiveEditorEditCount()

const vePage = computed(() => {
  if (!bodyHtml.value) return null
  const title = (props.title ?? props.header ?? '').trim().replace(/_/g, ' ')
  if (!title) return null
  return {
    title,
    lang: resolvedLang.value,
    host: wikiHostFromLang(resolvedLang.value),
  }
})

async function captureBodyHtml() {
  if (bodyHtml.value !== null) return
  await nextTick()
  const root = captureRendererRef.value?.$el as HTMLElement | undefined
  const parser = root?.querySelector('.mw-parser-output')
  const html = parser?.innerHTML?.trim()
  if (html) {
    bodyHtml.value = html
    if (effectiveEditable.value) void refreshPrefetchSuggestionCount()
  }
}

async function refreshPrefetchSuggestionCount() {
  if (!effectiveEditable.value || !bodyHtml.value || !vePage.value) {
    prefetchSuggestionCount.value = null
    return
  }
  prefetchSuggestionCount.value = await countArticleSuggestions(
    bodyHtml.value,
    vePage.value,
    editCount.value,
  )
}

async function onEditClick() {
  await captureBodyHtml()
  veShellRef.value?.onEditClick()
}

function onReadClick() {
  veShellRef.value?.onReadClick()
}

onMounted(() => {
  if (effectiveEditable.value) void captureBodyHtml()
})

watch([editCount, editCountReady], () => {
  if (editCountReady.value && effectiveEditable.value) void refreshPrefetchSuggestionCount()
})
</script>

<template>
  <VisualEditorPageLayout
    v-if="effectiveEditable"
    :sidebar-open="veSidebarOpen"
    :editing="editing"
    :skin="effectiveSkin"
  >
    <ArticleWrapper
      :lang="props.lang"
      :dir="props.dir"
      :title="props.title"
      :header="props.header"
      :skin="props.skin"
      :theme="props.theme"
      :languages-count="props.languagesCount"
      :app="props.app"
      :description="props.description"
      :lead-image-url="props.leadImageUrl"
      :active-view="editing ? 'edit' : 'read'"
      :saved-pages-route="props.savedPagesRoute"
      @edit-click="onEditClick()"
      @read-click="onReadClick()"
    >
      <ArticleRenderer
        v-if="bodyHtml === null"
        ref="captureRendererRef"
        :lang="props.lang"
        :dir="props.dir"
        :skin="props.skin"
        :theme="props.theme"
        :app="props.app"
      >
        <slot />
      </ArticleRenderer>
      <VisualEditorArticleShell
        v-else
        ref="veShellRef"
        v-model:editing="editing"
        v-model:sidebar-open="veSidebarOpen"
        v-model:suggestion-count="suggestionCount"
        :live-html="bodyHtml"
        :page="vePage"
        :skin="effectiveSkin"
        :start-in-edit-mode="startInEditMode"
        :prefetch-suggestion-count="prefetchSuggestionCount"
        :lang="resolvedLang"
        :dir="props.dir"
        :theme="props.theme"
      />
    </ArticleWrapper>
  </VisualEditorPageLayout>
  <ArticleWrapper
    v-else
    :lang="props.lang"
    :dir="props.dir"
    :title="props.title"
    :header="props.header"
    :skin="props.skin"
    :theme="props.theme"
    :languages-count="props.languagesCount"
    :app="props.app"
    :description="props.description"
    :lead-image-url="props.leadImageUrl"
    :saved-pages-route="props.savedPagesRoute"
  >
    <ArticleRenderer
      :lang="props.lang"
      :dir="props.dir"
      :skin="props.skin"
      :theme="props.theme"
      :app="props.app"
    >
      <slot />
    </ArticleRenderer>
  </ArticleWrapper>
</template>
