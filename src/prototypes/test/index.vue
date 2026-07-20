<script setup>
import ArticleCustom from '@/components/article/ArticleCustom.vue'
import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <ArticleLive :langs="['en', 'fr', 'es']" />
  </ChromeWrapper>
</template>
