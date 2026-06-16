<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import Dashboard from '@/components/dashboard/Dashboard.vue'
import DashboardModule from '@/components/dashboard/DashboardModule.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import HelpModule from './HelpModule.vue'
import ImpactModule from './ImpactModule.vue'
import MentorModule from './MentorModule.vue'
import StructuredTasksModule from './StructuredTasksModule.vue'
import {
  APP_HOME,
  HELP_LINKS,
  HELP_MODULE,
  HELP_PAGE,
  MENTOR,
  MENTOR_PAGE,
  SUGGESTED_EDITS_PAGE,
} from './dashpage-fixtures'
import { useHomepageImpact } from './useHomepageImpact'
import { useSuggestedEdits } from './suggested-edits/data/useSuggestedEdits'

const { user, pageTitle } = useConfig()
const { impactMobileProps, impactDesktopProps, onImpactRefresh } = useHomepageImpact()

const {
  currentIndex,
  totalCount,
  currentSuggestion,
  loadPending,
  loading,
  hasStarted,
} = useSuggestedEdits()

const showLoggedInModules = computed(() => user.value !== 'logged-out')

const structuredTasksProps = computed(() => {
  const suggestion = currentSuggestion.value
  const index = hasStarted.value && suggestion ? currentIndex.value + 1 : 1
  const count = hasStarted.value && totalCount.value > 0 ? totalCount.value : 0

  if (loadPending.value || loading.value) {
    return {
      currentIndex: index,
      totalCount: count || 1,
      articleTitle: loading.value ? 'Loading suggestions…' : 'Suggested edits',
      articleDescription: 'Tap to load article suggestions based on your interests.',
      thumbnailSrc: undefined,
      taskTypeLabel: loading.value ? 'Loading…' : 'Get started',
    }
  }

  if (!suggestion) {
    return {
      currentIndex: 1,
      totalCount: 1,
      articleTitle: 'Suggested edits',
      articleDescription: 'Add interests or enable editing history to see suggestions.',
      thumbnailSrc: undefined,
      taskTypeLabel: 'Get started',
    }
  }

  return {
    currentIndex: index,
    totalCount: count,
    articleTitle: suggestion.articleTitle,
    articleDescription: suggestion.articleShortDescription,
    thumbnailSrc: suggestion.thumbnailSrc,
    taskTypeLabel: suggestion.taskHeading,
  }
})

definePage({
  meta: {
    title: 'Template: Homepage',
    description: 'Template for prototyping the newcomer homepage.',
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
              :to="SUGGESTED_EDITS_PAGE"
              v-bind="structuredTasksProps"
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
              class="dashboard-slot--desktop-primary"
              :to="APP_HOME"
              v-bind="structuredTasksProps"
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
