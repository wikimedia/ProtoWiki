<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import TaskFullscreenShell from '../TaskFullscreenShell.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import MobileSubpageHeader from '../MobileSubpageHeader.vue'
import RecentChangesView from '../RecentChangesView.vue'
import { HOMEPAGE } from '../dashpage-fixtures'
import { useDashpageRecentChangesModule } from '../useDashpageRecentChangesModule'

const { fullscreenProps, onRecentChangesLoad, onRecentChangesRefresh } =
  useDashpageRecentChangesModule()

const showHeaderRefresh = computed(() => fullscreenProps.value.showRefresh === true)

definePage({
  meta: {
    title: 'Dashpage — Recent changes',
    description: 'Full-page mobile drill-down for the Recent changes homepage module.',
  },
})
</script>

<template>
  <MobileWrapper>
    <TaskFullscreenShell skin="mobile">
      <div class="recent-changes-layout">
        <div class="recent-changes-layout__header">
          <MobileSubpageHeader
            title="Recent changes"
            :back-to="HOMEPAGE"
            back-label="Back to homepage"
            :bleed="false"
          >
            <template v-if="showHeaderRefresh" #actions>
              <CdxButton
                weight="quiet"
                :icon-only="true"
                aria-label="Refresh recent changes"
                :disabled="fullscreenProps.refreshing"
                @click="onRecentChangesRefresh"
              >
                <CdxIcon :icon="cdxIconReload" />
              </CdxButton>
            </template>
          </MobileSubpageHeader>
        </div>

        <SpecialPageWrapper :title="null" skin="mobile" class="recent-changes-page">
          <RecentChangesView
            v-bind="fullscreenProps"
            @load="onRecentChangesLoad"
            @refresh="onRecentChangesRefresh"
          />
        </SpecialPageWrapper>
      </div>
    </TaskFullscreenShell>
  </MobileWrapper>
</template>

<style scoped>
.recent-changes-layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.recent-changes-layout__header {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 100%;
  padding: 0 4px;
  background-color: var(--background-color-base, #fff);
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.recent-changes-layout__header :deep(.mobile-subpage-header) {
  margin: 0;
  padding: 0;
  border-bottom: none;
}

.recent-changes-layout :deep(.recent-changes-page) {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  max-width: none;
  margin: 0;
  padding: 0 var(--spacing-25, 4px);
  background-color: var(--background-color-neutral, #eaecf0);
}

.recent-changes-layout :deep(.recent-changes-page .special-page-wrapper__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
</style>
