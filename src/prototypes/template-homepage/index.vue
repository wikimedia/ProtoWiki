<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import Dashboard from '@/components/Dashboard.vue'
import DashboardModule from '@/components/DashboardModule.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import { configUserPageTitle } from '@/lib/config'
import HelpModule from './HelpModule.vue'
import ImpactModule from './ImpactModule.vue'
import MentorModule from './MentorModule.vue'
import StructuredTasksModule from './StructuredTasksModule.vue'
import {
  APP_HOME,
  HELP_LINKS,
  HELP_MODULE,
  HELP_PAGE,
  IMPACT,
  IMPACT_DESKTOP,
  IMPACT_PAGE,
  MENTOR,
  MENTOR_PAGE,
  STRUCTURED_TASKS,
} from './dashpage-fixtures'

const { user } = useConfig()

const showLoggedInModules = computed(() => user.value !== 'logged-out')

const impactMobileProps = computed(() =>
  user.value === 'experienced' ? { to: IMPACT_PAGE, ...IMPACT } : { to: IMPACT_PAGE },
)

const impactDesktopProps = computed(() =>
  user.value === 'experienced' ? IMPACT_DESKTOP : {},
)

const pageTitle = computed(() => configUserPageTitle(user.value))

definePage({
  meta: {
    title: 'Dashpage',
    description: 'Explorations for a homepage + dashboard hybrid.',
  },
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper :title="pageTitle" help>
      <div class="prototype-dashpage-shell">
        <Dashboard>
          <template #banner>
            <RouterLink :to="APP_HOME" class="dashboard-mobile-banner__feedback">
              Share feedback
            </RouterLink>
          </template>

          <template #mobile>
            <StructuredTasksModule
              class="dashboard-slot--mobile-primary"
              :to="APP_HOME"
              v-bind="STRUCTURED_TASKS"
            />

            <ImpactModule v-if="showLoggedInModules" v-bind="impactMobileProps" />

            <MentorModule
              v-if="showLoggedInModules"
              compact
              :to="MENTOR_PAGE"
              :mentor-name="MENTOR.name"
              :edit-count="MENTOR.editCount"
              :last-active-days-ago="MENTOR.lastActiveDaysAgo"
              :mentor-note="MENTOR.note"
              :learn-more-href="MENTOR.learnMoreHref"
              :conversations-href="MENTOR.conversationsHref"
            />

            <HelpModule compact :to="HELP_PAGE" v-bind="HELP_MODULE" />
          </template>

          <template #primary>
            <StructuredTasksModule
              class="dashboard-slot--desktop-primary"
              :to="APP_HOME"
              v-bind="STRUCTURED_TASKS"
            />
          </template>

          <template #sidebar>
            <ImpactModule v-if="showLoggedInModules" v-bind="impactDesktopProps" />

            <MentorModule
              v-if="showLoggedInModules"
              :mentor-name="MENTOR.name"
              :edit-count="MENTOR.editCount"
              :last-active-days-ago="MENTOR.lastActiveDaysAgo"
              :mentor-note="MENTOR.note"
              :learn-more-href="MENTOR.learnMoreHref"
              :conversations-href="MENTOR.conversationsHref"
            />

            <HelpModule :help-links="HELP_LINKS" view-more-href="#" />
          </template>
        </Dashboard>
      </div>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.prototype-dashpage-shell {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

:deep(.dashboard-slot--mobile-primary .dashboard-module__body) {
  min-height: 3rem;
}

:deep(.dashboard-slot--desktop-primary .dashboard-module) {
  min-height: 8rem;
}
</style>
