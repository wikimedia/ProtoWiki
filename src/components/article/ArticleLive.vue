<script lang="ts">
import type { RandomArticleSource } from './shared/selectRandomArticle'
import type { Skin, Theme } from '@/theme'

interface ArticleLiveCommonProps {
  lang?: string
  dir?: 'ltr' | 'rtl'
  header?: string
  host?: string
  skin?: Skin
  theme?: Theme
  languagesCount?: number
}

/** Fixed article: `article` set; the random-only props are forbidden. */
export type ArticleLiveFixedProps = ArticleLiveCommonProps & {
  article: string
  source?: never
  langs?: never
}

/** Random article: `article` omitted; optional `source` / `langs` / `vitalLevel`. */
export type ArticleLiveRandomProps = ArticleLiveCommonProps & {
  article?: undefined
  source?: RandomArticleSource
  langs?: string[]
  vitalLevel?: number
}

/**
 * Public prop contract for **`ArticleLive`** — `source` / `langs` are
 * type-gated to the no-`article` (random) case. Annotate call sites against
 * this type to catch e.g. `<ArticleLive article="X" source="vital" />`.
 */
export type ArticleLiveProps = ArticleLiveFixedProps | ArticleLiveRandomProps
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleRenderer from './ArticleRenderer.vue'
import ArticleWrapper from './ArticleWrapper.vue'
import { DEFAULT_RANDOM_SOURCE, selectRandomArticle } from './shared/selectRandomArticle'
import { wikiHostFromLang, wikimediaApiFetchHeaders } from '@/config'
// `RandomArticleSource`, `Skin`, and `Theme` types come from the companion
// `<script>` block above (merged into this module's scope).
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

function normalizeArticleBody(value: unknown): CachedArticleBody | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.html !== 'string' || typeof record.liveTitle !== 'string') return null
  return { html: record.html, liveTitle: record.liveTitle }
}

function storageKeyForArticle(key: string): string {
  return STORAGE_PREFIX + key
}

function removeFromStorage(key: string): void {
  const store = getLocalStorage()
  if (!store) return
  try {
    store.removeItem(storageKeyForArticle(key))
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function loadFromStorage(key: string): CachedArticleBody | null {
  const store = getLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(storageKeyForArticle(key))
    if (!raw) return null
    const normalized = normalizeArticleBody(JSON.parse(raw))
    if (!normalized) {
      removeFromStorage(key)
      return null
    }
    return normalized
  } catch {
    removeFromStorage(key)
    return null
  }
}

function saveToStorage(key: string, body: CachedArticleBody) {
  const store = getLocalStorage()
  if (!store) return
  const normalized = normalizeArticleBody(body)
  if (!normalized) return
  try {
    store.setItem(storageKeyForArticle(key), JSON.stringify(normalized))
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

const LOG_PREFIX = '[ProtoWiki][ArticleLive]'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  /**
   * Wiki page title for REST **`page/html/{title}`**.
   * When **`header`** is **`undefined`**, seeds **`ArticleWrapper`** **`title`** (and thus **`ArticleHeader`**) from this value (normalized).
   *
   * **Omit `article` to load a random article on each mount** (see **`source`** / **`langs`**).
   */
  article?: string
  /** Reader-visible title override for **`ArticleHeader`**. **`undefined`** → derive from **`article`** (normalized). */
  header?: string
  host?: string
  /**
   * Random-mode pool — only meaningful when **`article`** is omitted.
   * **`'random'`** (default) draws a live random page; **`'vital'`** draws a Wikipedia Vital article.
   */
  source?: RandomArticleSource
  /**
   * Random-mode languages — only meaningful when **`article`** is omitted.
   * One is chosen at random per mount (default **`['en']`**); the wiki host is derived from it.
   */
  langs?: string[]
  /**
   * Vital articles level to draw from — only meaningful when **`article`** is omitted and **`source`** is **`'vital'`** (default **`2`** ≈ 100 titles; **`3`** ≈ 1,000).
   */
  vitalLevel?: number
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
  source: undefined,
  langs: undefined,
  vitalLevel: undefined,
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
})

const liveHtml = ref<string | null>(null)
const liveTitle = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

/** Title shown in chrome — the `article` prop, or the selected random title. */
const resolvedTitle = ref<string | null>(props.article ?? null)
/** Host actually being read — `host` prop, or derived from the random language. */
const resolvedHost = ref(props.host)

function extractParserOutput(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1]
  return raw
}

async function fetchArticle(title: string, host: string) {
  if (!title) return

  const key = articleCacheKey(host, title)
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
      host,
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
      const url = `https://${host}/api/rest_v1/page/html/${encodeURIComponent(title)}`
      console.info(`${LOG_PREFIX} fetching from network`, {
        host,
        title: title.trim(),
        url,
      })
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html; charset=utf-8',
          ...wikimediaApiFetchHeaders('page-html'),
        },
      })
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
        host,
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
      host,
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

/**
 * Resolve which article to load, then fetch its body. When **`article`** is
 * set, this is the fixed page on **`host`**; when omitted, a random title is
 * *selected* (title-only) from the requested pool/language, and the host is
 * derived from that language.
 */
async function resolveAndFetch() {
  if (props.article) {
    resolvedTitle.value = props.article
    resolvedHost.value = props.host
    void fetchArticle(props.article, props.host)
    return
  }

  loading.value = true
  error.value = null
  liveHtml.value = null
  liveTitle.value = null
  resolvedTitle.value = null

  try {
    const selected = await selectRandomArticle({
      source: props.source ?? DEFAULT_RANDOM_SOURCE,
      langs: props.langs,
      vitalLevel: props.vitalLevel,
    })
    resolvedHost.value = wikiHostFromLang(selected.lang)
    resolvedTitle.value = selected.title
    await fetchArticle(selected.title, resolvedHost.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    loading.value = false
  }
}

watch(
  () =>
    [props.host, props.article, props.source, (props.langs ?? []).join('|'), props.vitalLevel] as const,
  () => {
    void resolveAndFetch()
  },
  { immediate: true },
)
</script>

<template>
  <ArticleWrapper
    :lang="props.lang"
    :dir="props.dir"
    :title="resolvedTitle ?? undefined"
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
