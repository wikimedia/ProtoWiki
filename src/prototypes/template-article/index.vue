<script setup lang="ts">
import { cdxIconArticle } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Article',
    description: 'Template for prototyping the article page.',
    category: 'template',
    platform: 'web',
    order: 2,
    icon: cdxIconArticle,
  },
})

import { computed } from 'vue'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { useWikiPageTitleQuery } from '@/composables/useWikiPageTitleQuery'
import {
  ARTICLE_TEMPLATE_PATH,
  SAVED_PAGES_TEMPLATE_PATH,
  VISUAL_EDITOR_TEMPLATE_PATH,
} from '@/composables/webTemplatePaths'

const { titleFromQuery, setWikiPageTitle } = useWikiPageTitleQuery()

/** Fixed title from `?title=`; omit prop for random article when absent. */
const article = computed(() => titleFromQuery.value)

function onTitleResolved(title: string) {
  if (title?.trim()) setWikiPageTitle(title)
}
</script>

<template>
  <ChromeWrapper :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH">
    <ArticleLive
      :edit-route="VISUAL_EDITOR_TEMPLATE_PATH"
      :wiki-link-route="ARTICLE_TEMPLATE_PATH"
      :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH"
      :article="article"
      @title-resolved="onTitleResolved"
    />

    <!-- Draw from Wikipedia's Vital articles instead of a purely random page: -->
    <!-- <ArticleLive source="vital" /> -->

    <!-- Random across several languages (one chosen per load): -->
    <!-- <ArticleLive :langs="['en', 'fr', 'es']" /> -->

    <!-- Pin a specific article (fixed, not random): -->
    <!-- <ArticleLive article="Wet Leg" /> -->
  </ChromeWrapper>
</template>
