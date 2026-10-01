<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { CdxButton } from '@wikimedia/codex'

import { t } from '@/i18n'

import { useWikitaLiteRoute } from '../composables/useWikitaLiteRoute'
import { PERSONALIZATION_PAGE } from '../routes'

const { wikitaLiteRoute } = useWikitaLiteRoute()
</script>

<template>
  <div class="wikita-lite-interests-empty">
    <p class="wikita-lite-interests-empty__body">
      {{ t('components.interestsEmpty') }}
    </p>
    <RouterLink v-slot="{ navigate }" :to="wikitaLiteRoute(PERSONALIZATION_PAGE)" custom>
      <CdxButton class="wikita-lite-interests-empty__cta" weight="normal" @click="navigate">
        {{ t('components.addInterests') }}
      </CdxButton>
    </RouterLink>
  </div>
</template>

<style scoped>
.wikita-lite-interests-empty {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  width: 100%;
}

.wikita-lite-interests-empty__body {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.25rem);
  color: var(--color-subtle, #54595d);
}

.wikita-lite-interests-empty__cta {
  width: 100%;
}
</style>
