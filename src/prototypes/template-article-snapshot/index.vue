<script setup lang="ts">
import { cdxIconArticle } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Article (snapshot)',
    description: "Template for an article page that's loaded from a static snapshot.",
    category: 'template',
    platform: 'web',
    order: 4,
    icon: cdxIconArticle,
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
