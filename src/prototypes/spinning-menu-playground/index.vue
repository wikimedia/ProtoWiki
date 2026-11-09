<script setup lang="ts">
import { ref } from 'vue'
import { cdxIconLogoCodex } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'

import KitchenSinkMenus from '../example-codex-menu-kitchen-sink/KitchenSinkMenus.vue'

definePage({
  meta: {
    category: 'prototype',
    platform: 'web',
    icon: cdxIconLogoCodex,
  },
})

const spinning = ref(false)

function onClick(): void {
  spinning.value = !spinning.value
}
</script>

<template>
  <PlainWrapper heading="Spinning menu playground" class="spinning-menu-playground">
    <p class="spinning-menu-playground__hint">Click anywhere below to spin. Click again to stop.</p>
    <div
      class="spinning-menu-playground__stage"
      :class="{ 'spinning-menu-playground__stage--spinning': spinning }"
      @click="onClick"
    >
      <KitchenSinkMenus class="spinning-menu-playground__content" />
    </div>
  </PlainWrapper>
</template>

<style scoped>
.spinning-menu-playground__hint {
  margin: 0 0 var(--spacing-100);
  color: var(--color-subtle);
  font: var(--font-small);
}

.spinning-menu-playground__stage {
  width: 100%;
  min-width: 0;
  cursor: pointer;
  transform-origin: center center;
}

.spinning-menu-playground__stage--spinning {
  animation: spinning-menu-playground-spin 2.4s linear infinite;
}

.spinning-menu-playground__stage--spinning :deep(.kitchen-sink-menus > *),
.spinning-menu-playground__stage--spinning :deep(.kitchen-sink-menus__menu-buttons > *) {
  animation: spinning-menu-playground-spin-reverse 1.2s linear infinite;
}

.spinning-menu-playground__content {
  width: 100%;
  min-width: 0;
}

@keyframes spinning-menu-playground-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spinning-menu-playground-spin-reverse {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}
</style>
