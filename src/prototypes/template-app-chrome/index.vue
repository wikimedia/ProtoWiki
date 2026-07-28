<script setup lang="ts">
definePage({
  meta: {
    title: 'Chrome',
    category: 'template',
    platform: 'app',
    order: 0,
  },
})

import AppChromeWrapper from '@/components/app/AppChromeWrapper.vue'
</script>

<template>
  <AppChromeWrapper>
    <h1 class="mw-first-heading">App chrome wrapper</h1>
    <p>Starter template — empty app chrome wrapper.</p>
  </AppChromeWrapper>
</template>
