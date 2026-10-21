<script setup lang="ts">
import { cdxIconNewspaper } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Main page',
    description: "Template for prototyping English Wikipedia's Main Page.",
    category: 'template',
    platform: 'web',
    order: 8,
    icon: cdxIconNewspaper,
  },
})

import { nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import { parseWikiPageTitleQuery } from '@/composables/useWikiPageTitleQuery'
import {
  MAIN_PAGE_TEMPLATE_PATH,
  WIKIPEDIA_MAIN_PAGE_TITLE,
} from '@/composables/useWordmarkMainPageLink'
import {
  ARTICLE_TEMPLATE_PATH,
  SAVED_PAGES_TEMPLATE_PATH,
} from '@/composables/webTemplatePaths'

const route = useRoute()
const router = useRouter()

function stripTitleQuery() {
  if (parseWikiPageTitleQuery(route.query) === undefined) return
  void nextTick(() => {
    void router.replace({
      path: MAIN_PAGE_TEMPLATE_PATH,
      query: preservedQueryFromLocationQuery(route.query),
    })
  })
}

stripTitleQuery()
watch(() => route.query.title, stripTitleQuery)
</script>

<template>
  <ChromeWrapper :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH">
    <!-- ArticleWrapper detects title "Main Page" and applies production Main Page header chrome. -->
    <ArticleLive
      :article="WIKIPEDIA_MAIN_PAGE_TITLE"
      :wiki-link-route="ARTICLE_TEMPLATE_PATH"
      :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH"
    />

    <!-- Other wikis use different main-page titles; set lang/host and article accordingly. -->
    <!-- <ArticleLive lang="fr" article="Wikipédia:Accueil principal" /> -->
  </ChromeWrapper>
</template>
