<script setup lang="ts">
definePage({
  meta: {
    title: 'Template: Chrome',
    description: 'Template for prototypes with a Wikipedia header and footer.',
  },
})

import ChromeWrapper from '@/components/ChromeWrapper.vue'
</script>

<template>
  <ChromeWrapper username="Username">
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
