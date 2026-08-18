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
  app?: boolean
  source?: never
  langs?: never
}

/** Random article: `article` omitted; optional `source` / `langs` / `vitalLevel`. */
export type ArticleLiveRandomProps = ArticleLiveCommonProps & {
  article?: undefined
  app?: boolean
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
/**
 * Live article from REST `page/html`, rendered through {@link ArticleRenderer}
 * inside {@link ArticleWrapper}. **`app`** swaps the web chrome for the apps'
 * lead block and in-app reading affordances; everything else is shared.
 *
 * App articles are deliberately **not** REST `page/mobile-html` / PCS. PCS ships
 * stylesheets rooted at `html` / `body` sized by viewport media queries, so it
 * only renders correctly in a document of its own — and an iframe puts the
 * article beyond the reach of ProtoWiki CSS, Codex components and devtools, which
 * is the opposite of what prototypes need. Staying in one document is the point:
 * `parserReady` hands out a plain element, so `<Teleport>` and any Codex
 * component work with no plumbing.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleRenderer from './ArticleRenderer.vue'
import ArticleWrapper from './ArticleWrapper.vue'
import { fetchArticleBody } from './shared/fetchArticleBody'
import { fetchArticleView, type ArticleView } from './shared/fetchArticleView'
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
  /** Reader-visible title override for **`ArticleHeader`**. **`undefined`** → derive from **`article`**. */
  header?: string
  /** Wiki hostname. **`undefined`** → derived from **`lang`** (default **`en.wikipedia.org`**). */
  host?: string
  /**
   * In-app article screen: the apps' lead block (image, title, short
   * description) replaces web chrome, end matter folds away, wide tables become
   * collapsed widgets, and the skin is pinned to **`'mobile'`**. Pair it with
   * **`AppChromeWrapper`**. Works in random mode too — the lead block fills in
   * once the title resolves.
   */
  app?: boolean
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
  host: undefined,
  app: false,
  source: undefined,
  langs: undefined,
  vitalLevel: undefined,
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
})

const emit = defineEmits<{
  /** Parser root, once the body is in the DOM — for `<Teleport>` and in-article overlays. */
  parserReady: [root: HTMLElement]
}>()

const liveHtml = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
/** Lead-block metadata (title, description, image) — app articles only. */
const view = ref<ArticleView | null>(null)
const rendererRef = ref<InstanceType<typeof ArticleRenderer> | null>(null)

/** Title shown in chrome — the live `view` title, the `article` prop, or the random pick. */
const resolvedTitle = ref<string | null>(props.article ?? null)

const defaultHost = computed(() => wikiHostFromLang(props.lang ?? 'en'))
/** Host actually being read — `host` prop, `lang`, or the random language. */
const resolvedHost = ref(props.host ?? defaultHost.value)

let loadAbort: AbortController | null = null

async function fetchArticle(title: string, host: string, lang: string, signal: AbortSignal) {
  if (!title) return

  liveHtml.value = null
  view.value = null

  const [body, articleView] = await Promise.all([
    fetchArticleBody(title, host, { signal }),
    // The lead block is the only consumer — web chrome takes its title from the body.
    props.app ? fetchArticleView(title, { signal, lang }) : Promise.resolve(null),
  ])
  if (signal.aborted) return

  liveHtml.value = body.html
  view.value = articleView
  if (articleView) resolvedTitle.value = articleView.title
}

/**
 * Resolve which article to load, then fetch its body. When **`article`** is
 * set, this is the fixed page on the resolved host; when omitted, a random title
 * is *selected* (title-only) from the requested pool/language, and the host is
 * derived from that language.
 */
async function resolveAndFetch() {
  loadAbort?.abort()
  loadAbort = new AbortController()
  const { signal } = loadAbort

  loading.value = true
  error.value = null

  try {
    if (props.article) {
      resolvedTitle.value = props.article
      resolvedHost.value = props.host ?? defaultHost.value
      await fetchArticle(props.article, resolvedHost.value, props.lang ?? 'en', signal)
      return
    }

    liveHtml.value = null
    view.value = null
    resolvedTitle.value = null

    const selected = await selectRandomArticle({
      source: props.source ?? DEFAULT_RANDOM_SOURCE,
      langs: props.langs,
      vitalLevel: props.vitalLevel,
    })
    if (signal.aborted) return
    resolvedHost.value = wikiHostFromLang(selected.lang)
    resolvedTitle.value = selected.title
    await fetchArticle(selected.title, resolvedHost.value, selected.lang, signal)
  } catch (err) {
    if (signal.aborted) return
    error.value = err instanceof Error ? err.message : String(err)
    liveHtml.value = null
    view.value = null
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

watch(
  () =>
    [
      props.host ?? defaultHost.value,
      props.article,
      // App mode fetches the lead-block metadata alongside the body.
      props.app,
      props.source,
      (props.langs ?? []).join('|'),
      props.vitalLevel,
    ] as const,
  () => {
    void resolveAndFetch()
  },
  { immediate: true },
)

watch(liveHtml, async (html) => {
  if (!html) return
  await nextTick()
  const root = rendererRef.value?.$el as HTMLElement | undefined
  if (root) emit('parserReady', root)
})
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
    :app="props.app"
    :description="view?.description"
    :lead-image-url="view?.thumbnailUrl ?? undefined"
  >
    <CdxProgressBar v-if="loading" inline aria-label="Loading article" />

    <CdxMessage v-if="error" type="error" :allow-user-dismiss="false">
      Couldn't load this article: {{ error }}
    </CdxMessage>

    <ArticleRenderer
      v-if="liveHtml !== null || $slots.default"
      ref="rendererRef"
      :lang="props.lang"
      :dir="props.dir"
      :skin="props.skin"
      :theme="props.theme"
      :app="props.app"
    >
      <template v-if="$slots.default"><slot /></template>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else v-html="liveHtml" />
    </ArticleRenderer>
  </ArticleWrapper>
</template>
