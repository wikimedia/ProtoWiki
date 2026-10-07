<script setup lang="ts">
import { cdxIconSandbox } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'

definePage({
  meta: {
    title: 'Plain',
    description: 'Template for minimal prototypes.',
    category: 'template',
    platform: 'web',
    order: 1,
    icon: cdxIconSandbox,
  },
})
</script>

<template>
  <PlainWrapper heading="Plain wrapper">
    <p>Starter template — empty plain wrapper.</p>
  </PlainWrapper>
</template>
