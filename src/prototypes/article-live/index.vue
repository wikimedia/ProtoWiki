<script setup lang="ts">
definePage({
  meta: {
    title: 'Template: Live article',
    description: "Template for an article page that's loaded from live data.",
  },
})

import LiveArticle from '@/components/LiveArticle.vue'
import ChromeWrapper from '@/components/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <main>
      <LiveArticle article="Wet Leg" />
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: 0 var(--spacing-100);
}
</style>
