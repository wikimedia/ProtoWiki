<script setup lang="ts">
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { provideWikitaSaveFeedback } from '../musical-group/composables/useWikitaSaveFeedback'
import WikitaLiteHome from './WikitaLiteHome.vue'
import './wikita-lite-shell.css'

definePage({
  meta: {
    title: 'Wikita-lite',
    description: 'Toned down Wikita dashpage.',
  },
})

const { pageTitle } = useConfig()
provideWikitaSaveFeedback()
</script>

<template>
  <MobileWrapper>
    <ChromeWrapper skin="mobile" :last-edited-notice="false">
      <SpecialPageWrapper :title="pageTitle" help class="wikita-lite-shell">
        <WikitaLiteHome />
      </SpecialPageWrapper>
    </ChromeWrapper>
  </MobileWrapper>
</template>
