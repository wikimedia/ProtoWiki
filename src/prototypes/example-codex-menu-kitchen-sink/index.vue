<script setup lang="ts">
import { cdxIconLogoCodex } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'

import KitchenSinkMenus from './KitchenSinkMenus.vue'

definePage({
  meta: {
    title: 'Codex menu kitchen sink',
    description: 'A playground of various menu components.',
    category: 'example',
    platform: 'web',
    order: 1,
    icon: cdxIconLogoCodex,
  },
})
</script>

<template>
  <PlainWrapper heading="Codex menu kitchen sink" class="example-codex-menu-kitchen-sink">
    <KitchenSinkMenus class="codex-menu-kitchen-sink__content" />
  </PlainWrapper>
</template>

<style scoped>
.codex-menu-kitchen-sink__content {
  width: 100%;
  min-width: 0;
}
</style>
