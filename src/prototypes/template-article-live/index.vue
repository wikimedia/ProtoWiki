<script setup lang="ts">
definePage({
  meta: {
    title: 'Article (live)',
    description: "Template for an article page that's loaded from live data.",
    category: 'template',
  },
})

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <main>
      <!-- No `article` prop → a random article loads on each visit. -->
      <ArticleLive />

      <!-- Draw from Wikipedia's Vital articles instead of a purely random page: -->
      <!-- <ArticleLive source="vital" /> -->

      <!-- Random across several languages (one chosen per load): -->
      <!-- <ArticleLive :langs="['en', 'fr', 'es']" /> -->

      <!-- Pin a specific article (fixed, not random): -->
      <!-- <ArticleLive article="Wet Leg" /> -->
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: 0 var(--spacing-100);
}
</style>
