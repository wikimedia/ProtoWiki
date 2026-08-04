<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import AppArticlePcsRenderer from './AppArticlePcsRenderer.vue'
import { fetchMobileArticleBody, type MobileArticleBody } from './shared/fetchArticleBody'
import { fetchArticleView, type ArticleView } from './shared/fetchArticleView'
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

const view = ref<ArticleView | null>(null)
const mobileBody = ref<MobileArticleBody | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const pcsError = ref<string | null>(null)

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
  pcsError.value = null

  try {
    const [foundView, foundBody] = await Promise.all([
      fetchArticleView(props.article, { signal, lang: props.lang }),
      fetchMobileArticleBody(props.article, resolvedHost.value, { signal }),
    ])
    if (signal.aborted) return
    view.value = foundView
    mobileBody.value = foundBody
  } catch (err) {
    if (signal.aborted) return
    error.value = err instanceof Error ? err.message : 'Failed to load article.'
    view.value = null
    mobileBody.value = null
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

function onPcsError(message: string): void {
  pcsError.value = message
}
</script>

<template>
  <div class="app-article-live">
    <CdxProgressBar v-if="loading" inline />

    <CdxMessage v-else-if="error" type="error">{{ error }}</CdxMessage>

    <template v-else-if="view && mobileBody">
      <div class="app-article-live__lead-image">
        <img
          v-if="view.thumbnailUrl"
          class="app-article-live__lead-image-img"
          :src="view.thumbnailUrl"
          :alt="view.title"
        />
      </div>

      <h1 class="app-article-live__title">{{ view.title }}</h1>
      <p v-if="view.description" class="app-article-live__description">
        {{ view.description }}
      </p>

      <CdxMessage v-if="pcsError" type="warning">{{ pcsError }}</CdxMessage>

      <div class="article app-article-live__reader" data-skin="mobile">
        <AppArticlePcsRenderer
          :pcs-html="mobileBody.pcsHtml"
          :stylesheet-hrefs="mobileBody.stylesheetHrefs"
          :article-key="articleKey"
          :lang="props.lang"
          :dir="props.dir"
          :theme="props.theme"
          @parser-ready="onParserReady"
          @pcs-error="onPcsError"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-article-live {
  --app-article-bleed-inline: var(--spacing-150, 24px);
  padding-bottom: var(--spacing-150, 24px);
}

.app-article-live__lead-image {
  aspect-ratio: 16 / 9;
  margin-inline: calc(-1 * var(--app-article-bleed-inline, var(--spacing-150, 24px)));
  background-color: var(--background-color-neutral, #eaecf0);
}

.app-article-live__lead-image-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-article-live__title {
  margin: var(--spacing-100, 16px) 0 0;
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large, 1.75rem);
  font-weight: var(--font-weight-normal, 400);
  color: var(--color-base, #202122);
}

.app-article-live__description {
  margin: var(--spacing-25, 4px) 0 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
  font-style: italic;
  line-height: var(--line-height-small, 1.4);
}

.app-article-live__reader {
  margin-inline: calc(-1 * var(--app-article-bleed-inline));
  padding-inline: var(--app-article-bleed-inline);
}

/* Space between title/description chrome and first parser block (lead hatnote). */
.app-article-live__description + .app-article-live__reader,
.app-article-live__title + .app-article-live__reader {
  margin-top: var(--spacing-50);
}
</style>
