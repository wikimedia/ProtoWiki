<script setup lang="ts">
/**
 * In-app live article screen: fetches REST `page/mobile-html` and hands the whole
 * document to {@link AppArticlePcsRenderer}.
 *
 * PCS renders its own lead header (title, description, divider) inside the frame,
 * so this component adds no article chrome of its own. Place it in an
 * `AppChromeWrapper` with `full-bleed`, so the frame fills the content area.
 */
import { computed, ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import AppArticlePcsRenderer from './AppArticlePcsRenderer.vue'
import { fetchMobileArticleBody, type MobileArticleBody } from './shared/fetchArticleBody'
import { wikiHostFromLang } from '@/config'
import type { Theme } from '@/theme'

interface Props {
  article: string
  lang?: string
  host?: string
  dir?: 'ltr' | 'rtl'
  theme?: Theme
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'en',
  host: undefined,
  dir: undefined,
  theme: undefined,
})

const emit = defineEmits<{
  parserReady: [root: HTMLElement]
}>()

const body = ref<MobileArticleBody | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const resolvedHost = computed(() => props.host ?? wikiHostFromLang(props.lang ?? 'en'))

const articleKey = computed(
  () => `${resolvedHost.value}:${props.lang ?? 'en'}:${props.article.trim()}`,
)

let loadAbort: AbortController | null = null

async function load(): Promise<void> {
  loadAbort?.abort()
  loadAbort = new AbortController()
  const { signal } = loadAbort

  loading.value = true
  error.value = null

  try {
    const found = await fetchMobileArticleBody(props.article, resolvedHost.value, { signal })
    if (signal.aborted) return
    body.value = found
  } catch (err) {
    if (signal.aborted) return
    error.value = err instanceof Error ? err.message : 'Failed to load article.'
    body.value = null
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

watch(
  () => [props.article, props.lang, resolvedHost.value] as const,
  () => {
    void load()
  },
  { immediate: true },
)

function onParserReady(root: HTMLElement): void {
  emit('parserReady', root)
}
</script>

<template>
  <div class="app-article-live">
    <div v-if="loading || error" class="app-article-live__status">
      <CdxProgressBar v-if="loading" inline />
      <CdxMessage v-else-if="error" type="error">{{ error }}</CdxMessage>
    </div>

    <AppArticlePcsRenderer
      v-else-if="body"
      :html="body.html"
      :title="body.liveTitle"
      :article-key="articleKey"
      :dir="props.dir"
      :theme="props.theme"
      @parser-ready="onParserReady"
    />
  </div>
</template>

<style scoped>
.app-article-live {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.app-article-live__status {
  padding: var(--spacing-150, 24px);
}
</style>
