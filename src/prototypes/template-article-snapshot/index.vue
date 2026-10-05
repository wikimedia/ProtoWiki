<script setup lang="ts">
definePage({
  meta: {
    title: 'Article (snapshot)',
    description: "Template for an article page that's loaded from a static snapshot.",
    category: 'template',
    platform: 'web',
  },
})

import ArticleSnapshot from '@/components/article/ArticleSnapshot.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <ArticleSnapshot class="article" article="Wet Leg" />
  </ChromeWrapper>
</template>
