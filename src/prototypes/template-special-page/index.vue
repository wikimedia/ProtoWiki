<script setup lang="ts">
import ChromeWrapper from '@/components/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Template: Special page',
    description: 'Template for special page prototypes.',
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
