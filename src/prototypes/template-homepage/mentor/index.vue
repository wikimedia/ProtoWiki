<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconEllipsis } from '@wikimedia/codex-icons'

import DashpageChromeWrapper from '../DashpageChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import MentorModule from '../MentorModule.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import { HOMEPAGE, MENTOR } from '../dashpage-fixtures'

definePage({
  meta: {
    title: 'Dashpage — Mentor',
    description: 'Full-page mobile drill-down for the Your mentor homepage module.',
  },
})
</script>

<template>
  <DashpageChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="null" class="mentor-page">
      <MobileSubpageHeader title="Your mentor" :back-to="HOMEPAGE" back-label="Back to dashpage">
        <template #actions>
          <CdxButton weight="quiet" :icon-only="true" aria-label="More options">
            <CdxIcon :icon="cdxIconEllipsis" />
          </CdxButton>
        </template>
      </MobileSubpageHeader>

      <MentorModule
        standalone
        :mentor-name="MENTOR.name"
        :edit-count="MENTOR.editCount"
        :last-active-days-ago="MENTOR.lastActiveDaysAgo"
        :mentor-note="MENTOR.note"
        :learn-more-href="MENTOR.learnMoreHref"
        :conversations-href="MENTOR.conversationsHref"
      />
    </SpecialPageWrapper>
  </DashpageChromeWrapper>
</template>

<style scoped>
.mentor-page :deep(.special-page-wrapper[data-skin='mobile']) {
  padding-top: var(--spacing-100, 16px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.mentor-page :deep(.special-page-wrapper[data-skin='mobile'] .special-page-wrapper__body) {
  padding-inline: 0;
}
</style>
