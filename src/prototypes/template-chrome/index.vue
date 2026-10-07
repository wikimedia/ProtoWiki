<script setup lang="ts">
import { cdxIconBrowser } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Chrome',
    description: 'Template for prototypes with a Wikipedia header and footer.',
    category: 'template',
    platform: 'web',
    order: 0,
    icon: cdxIconBrowser,
  },
})

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper>
    <main>
      <h1>Chrome wrapper</h1>
      <p>Starter template — empty chrome wrapper.</p>
    </main>
  </ChromeWrapper>
</template>

<style scoped>
main {
  padding: var(--spacing-100);
}
</style>
