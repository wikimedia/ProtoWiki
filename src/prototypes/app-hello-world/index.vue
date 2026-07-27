<script setup lang="ts">
definePage({
  meta: {
    title: 'Hello world',
    platform: 'app',
  },
})

import PlainWrapper from '@/components/PlainWrapper.vue'
</script>

<template>
  <PlainWrapper heading="Hello world">
    <p>Hello, world!</p>
  </PlainWrapper>
</template>
