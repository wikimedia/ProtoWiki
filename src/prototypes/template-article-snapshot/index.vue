<script setup lang="ts">
definePage({
  meta: {
    title: 'Article (snapshot)',
    description: "Template for an article page that's loaded from a static snapshot.",
    category: 'template',
  },
})

import ArticleSnapshot from '@/components/article/ArticleSnapshot.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <main>
      <ArticleSnapshot class="article" article="Wet Leg" />
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: 0 var(--spacing-100);
}
</style>
