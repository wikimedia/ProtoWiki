<script setup lang="ts">
definePage({
  meta: {
    title: 'Template: Article (snapshot)',
    description: "Template for an article page that's loaded from a static snapshot.",
  },
})

import ArticleSnapshot from '@/components/ArticleSnapshot.vue'
import ChromeWrapper from '@/components/ChromeWrapper.vue'
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
