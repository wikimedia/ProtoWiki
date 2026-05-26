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
import SuggestionFeedModule from './SuggestionFeedModule.vue'
import RecentChangesModule from './RecentChangesModule.vue'
import {
  APP_HOME,
  HELP_LINKS,
  HELP_MODULE,
  HELP_PAGE,
  MENTOR,
  MENTOR_PAGE,
  RECENT_CHANGES_PAGE,
} from './dashpage-fixtures'
import { useDashpageSettings } from './useDashpageSettings'
import { useDashpageStructuredTasksModule } from './useDashpageStructuredTasksModule'
import { useDashpageSuggestionModule } from './useDashpageSuggestionModule'
import { useDashpageRecentChangesModule } from './useDashpageRecentChangesModule'
import { useHomepageImpact } from './useHomepageImpact'
import { useHomepageSuggestedEdits } from './useHomepageSuggestedEdits'

const { user, pageTitle, realUsername, currentUserPageLists } = useConfig()
const { editSuggestionSource } = useDashpageSettings()
const { moduleProps: structuredModuleProps } = useDashpageStructuredTasksModule()
const { impactMobileProps, impactDesktopProps, onImpactRefresh } = useHomepageImpact()
const { suggestedEditsLinkTo } = useHomepageSuggestedEdits()
const {
  moduleProps: suggestionModuleProps,
  feedModuleProps,
  onSuggestionLoad,
  onSuggestionRefresh,
  onSuggestionOpenFullscreen,
} = useDashpageSuggestionModule()
const {
  moduleProps: recentChangesModuleProps,
  onRecentChangesLoad,
  onRecentChangesRefresh,
} = useDashpageRecentChangesModule()

const showStructuredTasks = computed(() => editSuggestionSource.value === 'structured-tasks')
const showSuggestionMode = computed(() => editSuggestionSource.value === 'suggestion-mode')
const showSuggestionFeed = computed(() => editSuggestionSource.value === 'suggestion-feed')

const showLoggedInModules = computed(() => user.value !== 'logged-out')

const showRecentChangesModule = computed(() => {
  if (user.value === 'logged-out' || user.value === 'new') return false

  if (user.value === 'real') {
    if (!realUsername.value.trim()) return false
    const { totalEdits } = impactMobileProps.value
    if (totalEdits != null) return totalEdits > 0
    return currentUserPageLists.value.editedPages.length > 0
  }

  return currentUserPageLists.value.editedPages.length > 0
})

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
              :to="suggestedEditsLinkTo"
              v-bind="structuredModuleProps"
            />
            <SuggestionModeModule
              v-else-if="showSuggestionMode"
              class="dashboard-slot--mobile-primary"
              :to="suggestedEditsLinkTo"
              v-bind="suggestionModuleProps"
              @load="onSuggestionLoad"
              @refresh="onSuggestionRefresh"
              @open-fullscreen="onSuggestionOpenFullscreen"
            />
            <SuggestionFeedModule
              v-else-if="showSuggestionFeed"
              class="dashboard-slot--mobile-primary"
              :to="suggestedEditsLinkTo"
              v-bind="feedModuleProps"
              @load="onSuggestionLoad"
              @refresh="onSuggestionRefresh"
            />

            <RecentChangesModule
              v-if="showRecentChangesModule"
              class="dashboard-slot--mobile-primary"
              :to="RECENT_CHANGES_PAGE"
              v-bind="recentChangesModuleProps"
              @load="onRecentChangesLoad"
              @refresh="onRecentChangesRefresh"
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
              v-bind="structuredModuleProps"
            />
            <SuggestionModeModule
              v-else-if="showSuggestionMode"
              class="dashboard-slot--desktop-primary"
              v-bind="suggestionModuleProps"
              @load="onSuggestionLoad"
              @refresh="onSuggestionRefresh"
            />
            <SuggestionFeedModule
              v-else-if="showSuggestionFeed"
              class="dashboard-slot--desktop-primary"
              v-bind="feedModuleProps"
              @load="onSuggestionLoad"
              @refresh="onSuggestionRefresh"
            />

            <RecentChangesModule
              v-if="showRecentChangesModule"
              class="dashboard-slot--desktop-primary"
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
