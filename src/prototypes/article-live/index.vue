<script setup lang="ts">
definePage({
  meta: {
    title: 'Template: Article (live)',
    description: "Template for an article page that's loaded from live data.",
  },
})

import ArticleLive from '@/components/ArticleLive.vue'
import ChromeWrapper from '@/components/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <main>
      <ArticleLive article="Wet Leg" />
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: 0 var(--spacing-100);
}
</style>
