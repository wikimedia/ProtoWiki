<script setup lang="ts">
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Experimentation preferences',
    description: 'Prototyping a new preferences section to inform users and allow them to opt-out from experimentation.',
    category: 'prototype',
    platform: 'web',
  },
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper title="Special page wrapper" help>
      <p>Starter template — empty special page wrapper.</p>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>
