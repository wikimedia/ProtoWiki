<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleRenderer from '@/components/ArticleRenderer.vue'
import ArticleWrapper from '@/components/ArticleWrapper.vue'
import type { Skin, Theme } from '@/lib/theming'

/** Cache of successfully fetched live article HTML (key: host + title). */
type CachedArticleBody = { html: string; liveTitle: string }
const articleBodyCache = new Map<string, CachedArticleBody>()
const inFlightFetches = new Map<string, Promise<CachedArticleBody>>()

const STORAGE_PREFIX = 'protowiki:articleBody:v1:'

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function loadFromStorage(key: string): CachedArticleBody | null {
  const store = getLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CachedArticleBody
  } catch {
    return null
  }
}

function saveToStorage(key: string, body: CachedArticleBody) {
  const store = getLocalStorage()
  if (!store) return
  try {
    store.setItem(STORAGE_PREFIX + key, JSON.stringify(body))
  } catch {
    // Most likely a QuotaExceededError. The in-memory cache still works.
  }
}

function normalizeTitleForCache(title: string) {
  return title.trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

function articleCacheKey(host: string, title: string) {
  return `${host}\0${normalizeTitleForCache(title)}`
}

const LOG_PREFIX = '[ProtoWiki][LiveArticle]'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  /**
   * Wiki page title for REST **`page/html/{title}`**.
   * When **`header`** is **`undefined`**, seeds **`ArticleWrapper`** **`title`** (and thus **`ArticleHeader`**) from this value (normalized).
   */
  article?: string
  /** Reader-visible title override for **`ArticleHeader`**. **`undefined`** → derive from **`article`** (normalized). */
  header?: string
  host?: string
  skin?: Skin
  theme?: Theme
  /** Forwarded **`ArticleWrapper`** → **`ArticleHeader`** (**`languagesCount` languages**). */
  languagesCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  article: undefined,
  header: undefined,
  host: 'en.wikipedia.org',
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
})

const liveHtml = ref<string | null>(null)
const liveTitle = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

function extractParserOutput(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1]
  return raw
}

async function fetchArticle(title: string) {
  if (!title) return

  const key = articleCacheKey(props.host, title)
  let cached = articleBodyCache.get(key)
  let cacheSource: 'memory' | 'localStorage' | null = cached ? 'memory' : null
  if (!cached) {
    const stored = loadFromStorage(key)
    if (stored) {
      articleBodyCache.set(key, stored)
      cached = stored
      cacheSource = 'localStorage'
    }
  }
  if (cached) {
    console.info(`${LOG_PREFIX} load from cache`, {
      host: props.host,
      title: title.trim(),
      source: cacheSource,
    })
    error.value = null
    liveHtml.value = cached.html
    liveTitle.value = cached.liveTitle
    loading.value = false
    return
  }

  let bodyPromise = inFlightFetches.get(key)
  const isFollower = Boolean(bodyPromise)
  if (!bodyPromise) {
    bodyPromise = (async (): Promise<CachedArticleBody> => {
      const url = `https://${props.host}/api/rest_v1/page/html/${encodeURIComponent(title)}`
      console.info(`${LOG_PREFIX} fetching from network`, {
        host: props.host,
        title: title.trim(),
        url,
      })
      const headers: Record<string, string> = {
        Accept: 'text/html; charset=utf-8',
        'Api-User-Agent': 'ProtoWiki/0.1 (https://github.com/wikimedia-research/protowiki) prototype',
      }
      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      const text = await response.text()
      const html = extractParserOutput(text)
      const liveTitleResolved = title.replace(/_/g, ' ')
      const body: CachedArticleBody = { html, liveTitle: liveTitleResolved }
      articleBodyCache.set(key, body)
      saveToStorage(key, body)
      console.info(`${LOG_PREFIX} fetch OK (cached)`, {
        host: props.host,
        title: title.trim(),
        htmlChars: html.length,
      })
      return body
    })().finally(() => {
      inFlightFetches.delete(key)
    })
    inFlightFetches.set(key, bodyPromise)
  } else {
    console.info(`${LOG_PREFIX} coalesced with in-flight fetch`, {
      host: props.host,
      title: title.trim(),
    })
  }

  if (!isFollower) {
    loading.value = true
    error.value = null
    liveHtml.value = null
    liveTitle.value = null
  }

  try {
    const body = await bodyPromise
    liveHtml.value = body.html
    liveTitle.value = body.liveTitle
    error.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.host, props.article] as const,
  ([, article]) => {
    if (article) void fetchArticle(article)
  },
  { immediate: true },
)
</script>

<template>
  <ArticleWrapper
    :lang="props.lang"
    :dir="props.dir"
    :title="props.article"
    :header="props.header"
    :skin="props.skin"
    :theme="props.theme"
    :languages-count="props.languagesCount"
  >
    <CdxProgressBar v-if="loading" inline aria-label="Loading article" />

    <CdxMessage v-if="error" type="error" :allow-user-dismiss="false">
      Couldn't load this article: {{ error }}
    </CdxMessage>

    <ArticleRenderer
      v-if="liveHtml !== null || $slots.default"
      :lang="props.lang"
      :dir="props.dir"
      :skin="props.skin"
      :theme="props.theme"
    >
      <template v-if="$slots.default"><slot /></template>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else v-html="liveHtml" />
    </ArticleRenderer>
  </ArticleWrapper>
</template>

