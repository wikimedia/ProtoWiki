<script setup lang="ts">
import { cdxIconHome } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Main page',
    description: "Template for prototyping English Wikipedia's Main Page",
    category: 'template',
    platform: 'web',
    order: 2.5,
    icon: cdxIconHome,
  },
})

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <!-- ArticleWrapper detects title "Main Page" and applies production Main Page header chrome. -->
    <ArticleLive article="Main Page" />

    <!-- Other wikis use different main-page titles; set lang/host and article accordingly. -->
    <!-- <ArticleLive lang="fr" article="Wikipédia:Accueil principal" /> -->
  </ChromeWrapper>
</template>
