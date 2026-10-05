<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import ArticleRenderer from './ArticleRenderer.vue'
import ArticleWrapper from './ArticleWrapper.vue'
import { articleSnapshotSlug, snapshotPullCommandLines } from './shared/articleSnapshotSlug'
import type { Skin, Theme } from '@/theme'

interface Props {
  /** Which committed snapshot HTML file to load (see **`articleSnapshotSlug`** in `./shared/articleSnapshotSlug.ts`). */
  article: string
  lang?: string
  dir?: 'ltr' | 'rtl'
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
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
  app: false,
  description: undefined,
  leadImageUrl: undefined,
})

/** Coalesce in-flight **`fetch`** calls per slug (Wet Leg, etc.). */
const snapshotLoads = new Map<string, Promise<string>>()

function loadSnapshotBySlug(slug: string): Promise<string> {
  let p = snapshotLoads.get(slug)
  if (!p) {
    const url = `${import.meta.env.BASE_URL}snapshots/${slug}.html`
    p = fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.text()
      })
      .then((html) => {
        if (!html.trim()) {
          throw new Error('Empty snapshot body')
        }
        return html
      })
      .finally(() => {
        snapshotLoads.delete(slug)
      })
    snapshotLoads.set(slug, p)
  }
  return p
}

const snapshotSlug = computed(() => articleSnapshotSlug(props.article))

const snapshotHtml = ref<string | null>(null)

const snapshotError = ref<string | null>(null)
const snapshotLoading = ref(false)
const pullInstructions = computed(() =>
  snapshotSlug.value ? snapshotPullCommandLines(props.article, snapshotSlug.value).join('\n') : '',
)

watch(
  () => [props.article, snapshotSlug.value] as const,
  ([, slug]) => {
    snapshotError.value = null
    snapshotHtml.value = null

    if (!slug) {
      snapshotError.value =
        'Article title is missing — pass a non-empty article prop on ArticleSnapshot.'
      snapshotLoading.value = false
      return
    }

    snapshotLoading.value = true
    void loadSnapshotBySlug(slug)
      .then((html) => {
        snapshotHtml.value = html
        snapshotError.value = null
      })
      .catch((err: unknown) => {
        snapshotError.value = err instanceof Error ? err.message : String(err)
        snapshotHtml.value = null
      })
      .finally(() => {
        snapshotLoading.value = false
      })
  },
  { immediate: true },
)
</script>

<template>
  <ArticleWrapper
    :lang="props.lang"
    :dir="props.dir"
    :title="props.article"
    :skin="props.skin"
    :theme="props.theme"
    :languages-count="props.languagesCount"
    :app="props.app"
    :description="props.description"
    :lead-image-url="props.leadImageUrl"
  >
    <div class="article-snapshot__below-header">
      <CdxProgressBar v-if="snapshotLoading" inline aria-label="Loading snapshot article" />

      <CdxMessage
        v-else-if="snapshotError || !snapshotHtml"
        type="error"
        :allow-user-dismiss="false"
      >
        <p class="article-snapshot__error-lead">
          <template v-if="snapshotSlug">
            No snapshot at
            <code>public/snapshots/{{ snapshotSlug }}.html</code>
            for <strong>{{ props.article }}</strong
            >.
          </template>
          <template v-else>
            Missing article title — pass <code>article="…"</code> on ArticleSnapshot.
          </template>
        </p>
        <p v-if="snapshotError" class="article-snapshot__error-detail">
          {{ snapshotError }}
        </p>
        <p class="article-snapshot__error-hint">From the repo root, add the file with:</p>
        <pre class="article-snapshot__command">{{ pullInstructions }}</pre>
      </CdxMessage>
    </div>

    <ArticleRenderer
      v-if="snapshotHtml !== null || $slots.default"
      :lang="props.lang"
      :dir="props.dir"
      :skin="props.skin"
      :theme="props.theme"
      :app="props.app"
    >
      <template v-if="$slots.default"><slot /></template>
      <div v-else v-html="snapshotHtml" />
    </ArticleRenderer>
  </ArticleWrapper>
</template>

<style scoped>
.article-snapshot__error-lead {
  margin: 0 0 var(--spacing-50, 8px);
}

.article-snapshot__error-detail {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: 0.925em;
  opacity: 0.92;
}

.article-snapshot__error-hint {
  margin: 0 0 var(--spacing-35, 6px);
}

.article-snapshot__command {
  margin: 0;
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px);
  overflow-x: auto;
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-neutral-subtle, #eaecf0);
  font-family: monospace;
  font-size: 0.8125rem;
  line-height: 1.45;
}
</style>
