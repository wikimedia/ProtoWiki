<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import DashpageChromeWrapper from './DashpageChromeWrapper.vue'
import Dashboard from '@/components/Dashboard.vue'
import DashboardModule from '@/components/DashboardModule.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import HelpModule from './HelpModule.vue'
import ImpactModule from './ImpactModule.vue'
import MentorModule from './MentorModule.vue'
import StructuredTasksModule from './StructuredTasksModule.vue'
import SuggestionModeModule from './SuggestionModeModule.vue'
import {
  APP_HOME,
  HELP_LINKS,
  HELP_MODULE,
  HELP_PAGE,
  MENTOR,
  MENTOR_PAGE,
  STRUCTURED_TASKS,
} from './dashpage-fixtures'
import { useDashpageSettings } from './useDashpageSettings'
import { useDashpageSuggestionModule } from './useDashpageSuggestionModule'
import { useHomepageImpact } from './useHomepageImpact'

const { user, pageTitle } = useConfig()
const { editSuggestionSource } = useDashpageSettings()
const { impactMobileProps, impactDesktopProps, onImpactRefresh } = useHomepageImpact()
const {
  moduleProps: suggestionModuleProps,
  onSuggestionLoad,
  onSuggestionRefresh,
} = useDashpageSuggestionModule()

const showStructuredTasks = computed(() => editSuggestionSource.value === 'structured-tasks')
const showSuggestionMode = computed(() => editSuggestionSource.value === 'suggestion-mode')

const showLoggedInModules = computed(() => user.value !== 'logged-out')

definePage({
  meta: {
    title: 'Dashpage',
    description: 'Explorations for a homepage + dashboard hybrid.',
  },
})
</script>

<template>
  <MobileWrapper>
    <DashpageChromeWrapper skin="mobile" :last-edited-notice="false">
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
              v-if="showStructuredTasks"
              class="dashboard-slot--mobile-primary"
              :to="APP_HOME"
              v-bind="STRUCTURED_TASKS"
            />
            <SuggestionModeModule
              v-else-if="showSuggestionMode"
              class="dashboard-slot--mobile-primary"
              v-bind="suggestionModuleProps"
              @load="onSuggestionLoad"
              @refresh="onSuggestionRefresh"
            />

            <ImpactModule
              v-if="showLoggedInModules"
              v-bind="impactMobileProps"
              @refresh="onImpactRefresh"
            />

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
              v-if="showStructuredTasks"
              class="dashboard-slot--desktop-primary"
              :to="APP_HOME"
              v-bind="STRUCTURED_TASKS"
            />
            <SuggestionModeModule
              v-else-if="showSuggestionMode"
              class="dashboard-slot--desktop-primary"
              v-bind="suggestionModuleProps"
              @load="onSuggestionLoad"
              @refresh="onSuggestionRefresh"
            />
          </template>

          <template #sidebar>
            <ImpactModule
              v-if="showLoggedInModules"
              v-bind="impactDesktopProps"
              @refresh="onImpactRefresh"
            />

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
    </DashpageChromeWrapper>
  </MobileWrapper>
</template>

<style scoped>
.prototype-dashpage-shell {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

:deep(.dashboard-slot--mobile-primary .dashboard-module__body) {
  min-height: 3rem;
  min-width: 0;
}

:deep(.dashboard-slot--desktop-primary .dashboard-module) {
  min-height: 8rem;
}
</style>
