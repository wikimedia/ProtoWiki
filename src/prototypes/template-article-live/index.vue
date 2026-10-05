<script setup lang="ts">
definePage({
  meta: {
    title: 'Article (live)',
    description: "Template for an article page that's loaded from live data.",
    category: 'template',
    platform: 'web',
  },
})

import { ref } from 'vue'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { provideChromeSearchHandlers } from '@/composables/useChromeSearch'

const selectedArticle = ref<string | undefined>(undefined)

// Header search is wired via provide — see `useChromeSearch.ts`.
provideChromeSearchHandlers({
  onSelect(title) {
    selectedArticle.value = title
  },
  onSubmit({ title }) {
    if (title) selectedArticle.value = title
  },
})
</script>

<template>
  <ChromeWrapper>
    <ArticleLive :article="selectedArticle" />

    <!-- Draw from Wikipedia's Vital articles instead of a purely random page: -->
    <!-- <ArticleLive source="vital" /> -->

    <!-- Random across several languages (one chosen per load): -->
    <!-- <ArticleLive :langs="['en', 'fr', 'es']" /> -->

    <!-- Pin a specific article (fixed, not random): -->
    <!-- <ArticleLive article="Wet Leg" /> -->
  </ChromeWrapper>
</template>
