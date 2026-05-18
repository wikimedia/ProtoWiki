<script setup lang="ts">
import ArticleRenderer from '@/components/ArticleRenderer.vue'
import ArticleWrapper from '@/components/ArticleWrapper.vue'
import type { Skin, Theme } from '@/lib/theming'

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
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  title: undefined,
  header: undefined,
  skin: undefined,
  theme: undefined,
  languagesCount: undefined,
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
  >
    <ArticleRenderer :lang="props.lang" :dir="props.dir" :skin="props.skin" :theme="props.theme">
      <slot />
    </ArticleRenderer>
  </ArticleWrapper>
</template>
