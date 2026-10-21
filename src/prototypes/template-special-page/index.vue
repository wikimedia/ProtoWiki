<script setup lang="ts">
import { cdxIconSpecialPages } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { SAVED_PAGES_TEMPLATE_PATH } from '@/composables/webTemplatePaths'

definePage({
  meta: {
    title: 'Special page',
    description: 'Template for special page prototypes.',
    category: 'template',
    platform: 'web',
    order: 5,
    icon: cdxIconSpecialPages,
  },
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH">
    <SpecialPageWrapper title="Special page wrapper">
      <p>Starter template — empty special page wrapper.</p>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>
