<script setup lang="ts">
import { cdxIconSettings } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import CommunityConfigurationDashboard from '@/components/community-configuration/CommunityConfigurationDashboard.vue'

import { FEATURES, useCommunityConfigurationPath } from './features'

definePage({
  meta: {
    title: 'Community Configuration',
    description: 'Template for prototyping Community Configuration',
    category: 'template',
    platform: 'web',
    order: 6.5,
    icon: cdxIconSettings,
  },
})

const basePath = useCommunityConfigurationPath()
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <CommunityConfigurationDashboard :features="FEATURES" :base-path="basePath" />
  </ChromeWrapper>
</template>
