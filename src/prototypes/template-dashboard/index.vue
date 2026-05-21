<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconUserTalk } from '@wikimedia/codex-icons'
import { RouterLink } from 'vue-router'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import Dashboard from '@/components/Dashboard.vue'
import DashboardModule from '@/components/DashboardModule.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Template: Dashboard',
    description: 'Template for dashboard prototypes that contain "box modules".',
  },
})

const { pageTitle } = useConfig()

/** Gallery / app home (file-based route `/`). */
const HOME = '/'

/** Shared across mobile + desktop for each matching module */
const MODULE = {
  thankTitle: 'Review changes',
  thankBody: 'No suggestions (yet)',
  impactTitle: 'Your impact',
  policiesTitle: 'Learn',
  policiesBody: 'Learn how to edit Wikipedia',
} as const
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="pageTitle" help>
      <div class="template-dashboard-shell">
        <Dashboard>
          <template #banner>
            <RouterLink :to="HOME" class="dashboard-mobile-banner__feedback">
              Share feedback
            </RouterLink>
          </template>

          <template #mobile>
            <DashboardModule
              class="dashboard-slot--mobile-primary"
              :to="HOME"
              :title="MODULE.thankTitle"
              cta="Open module"
            >
              <p class="dashboard-template-placeholder">{{ MODULE.thankBody }}</p>
            </DashboardModule>

            <DashboardModule class="dashboard-slot--mobile-sidebar" :title="MODULE.impactTitle">
              <div class="dashboard-impact-rows">
                <div class="dashboard-impact-row">
                  <CdxIcon
                    :icon="cdxIconUserTalk"
                    size="small"
                    class="dashboard-impact-icon"
                  />
                  <span class="dashboard-impact-metric">—</span>
                  <span>Thanks sent.</span>
                </div>
                <div class="dashboard-impact-row">
                  <CdxIcon
                    :icon="cdxIconCheck"
                    size="small"
                    class="dashboard-impact-icon"
                  />
                  <span class="dashboard-impact-metric">—</span>
                  <span>Edits completed.</span>
                </div>
              </div>
            </DashboardModule>

            <DashboardModule
              :to="HOME"
              :title="MODULE.policiesTitle"
              :cta="null"
            >
              <p class="dashboard-template-placeholder">{{ MODULE.policiesBody }}</p>
            </DashboardModule>
          </template>

          <template #primary>
            <DashboardModule :title="MODULE.thankTitle">
              <p class="dashboard-template-placeholder">{{ MODULE.thankBody }}</p>
            </DashboardModule>
          </template>

          <template #sidebar>
            <DashboardModule
              class="dashboard-slot--desktop-sidebar"
              :title="MODULE.impactTitle"
            >
              <div class="dashboard-impact-rows">
                <div class="dashboard-impact-row">
                  <CdxIcon
                    :icon="cdxIconUserTalk"
                    size="small"
                    class="dashboard-impact-icon"
                  />
                  <span class="dashboard-impact-metric">—</span>
                  <span>Thanks sent.</span>
                </div>
                <div class="dashboard-impact-row">
                  <CdxIcon
                    :icon="cdxIconCheck"
                    size="small"
                    class="dashboard-impact-icon"
                  />
                  <span class="dashboard-impact-metric">—</span>
                  <span>Edits completed.</span>
                </div>
              </div>
            </DashboardModule>
            <DashboardModule
              class="dashboard-slot--desktop-secondary"
              :title="MODULE.policiesTitle"
            >
              <p class="dashboard-template-placeholder">{{ MODULE.policiesBody }}</p>
            </DashboardModule>
          </template>
        </Dashboard>
      </div>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.template-dashboard-shell {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.dashboard-template-placeholder {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-base--subtle, #54595d);
}

.dashboard-impact-rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-base, #202122);
}

.dashboard-impact-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: var(--spacing-50, 8px);
  row-gap: var(--spacing-25, 4px);
}

.dashboard-impact-icon {
  flex-shrink: 0;
  color: var(--color-base--subtle, #54595d);
}

.dashboard-impact-metric {
  color: var(--color-progressive, #36c);
  font-weight: var(--font-weight-bold, 700);
  min-width: 1.25em;
}

:deep(.dashboard-slot--mobile-primary .dashboard-module__body) {
  min-height: 3rem;
}

:deep(.dashboard-slot--desktop-primary .dashboard-module) {
  min-height: 8rem;
}
</style>
