<script setup lang="ts">
import ChromeWrapper from '@/components/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import HelpModule from '../HelpModule.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import { HELP_LINKS, HELP_MODULE, HOMEPAGE } from '../dashpage-fixtures'

definePage({
  meta: {
    title: 'Dashpage — Help',
    description: 'Full-page mobile drill-down for the Get help with editing homepage module.',
  },
})
</script>

<template>
  <MobileWrapper>
    <ChromeWrapper skin="mobile" :last-edited-notice="false">
    <SpecialPageWrapper :title="null" class="help-page">
      <MobileSubpageHeader
        :title="HELP_MODULE.title"
        :back-to="HOMEPAGE"
        back-label="Back to dashpage"
      />
      <HelpModule standalone :help-links="HELP_LINKS" view-more-href="#" />
    </SpecialPageWrapper>
    </ChromeWrapper>
  </MobileWrapper>
</template>

<style scoped>
/* Match bleed inset — header negative margins cancel this top/inline padding. */
.help-page :deep(.special-page-wrapper[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
}
</style>
