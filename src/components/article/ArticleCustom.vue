<script setup lang="ts">
import ArticleRenderer from './ArticleRenderer.vue'
import ArticleWrapper from './ArticleWrapper.vue'
import type { Skin, Theme } from '@/theme'

interface Props {
  lang?: string
  dir?: 'ltr' | 'rtl'
  /** Seeds **`ArticleHeader`** when **`header`** is **`undefined`** (underscores → spaces). */
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
})
</script>

<template>
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
