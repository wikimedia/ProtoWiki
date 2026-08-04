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
import { fetchArticleBody } from './shared/fetchArticleBody'
import { DEFAULT_RANDOM_SOURCE, selectRandomArticle } from './shared/selectRandomArticle'
import { wikiHostFromLang } from '@/config'

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

async function fetchArticle(title: string, host: string) {
  if (!title) return

  loading.value = true
  error.value = null
  liveHtml.value = null
  liveTitle.value = null

  try {
    const body = await fetchArticleBody(title, host)
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
