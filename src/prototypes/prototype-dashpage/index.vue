<script setup lang="ts">
import { RouterLink } from 'vue-router'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import Dashboard from '@/components/Dashboard.vue'
import DashboardModule from '@/components/DashboardModule.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import HelpModule from './HelpModule.vue'
import ImpactModule from './ImpactModule.vue'
import type { MostViewedArticle } from './ImpactModule.vue'
import MentorModule from './MentorModule.vue'

definePage({
  meta: {
    title: 'Dashpage',
    description: '',
  },
})

/** Gallery / app home (file-based route `/`). */
const HOME = '/'

const HELP_LINKS = [
  { label: 'How to edit a page', href: '#' },
  { label: 'How to add an image', href: '#' },
  { label: 'How to edit a citation', href: '#' },
  { label: 'Simplified Manual of Style', href: '#' },
  { label: 'How to write a good article', href: '#' },
  { label: 'How to create a new article', href: '#' },
]

const MENTOR = {
  name: 'ARoseWolf',
  editCount: 12596,
  lastActiveDaysAgo: 451,
  note: 'This experienced user knows you\'re new and can help you with editing.',
  learnMoreHref: '#',
  conversationsHref: '#',
} as const

const IMPACT = {
  viewCount: '10.8K',
  sparklineData: [
    420, 390, 410, 430, 400, 380, 415, 440, 425, 405, 390, 420, 435, 410,
    395, 430, 450, 420, 400, 415, 440, 425, 410, 395, 380, 400, 420, 410,
    390, 405, 430, 415, 395, 380, 400, 420, 440, 410, 390, 380, 350, 360,
  ],
  lastEdited: '5 months ago',
  longestStreak: '1 day',
} as const

const IMPACT_DESKTOP: {
  totalEdits: number
  thanksReceived: number
  lastEdited: string
  longestStreak: string
  viewCount: string
  sparklineData: number[]
  recentActivityData: number[]
  activityStartDate: string
  activityEndDate: string
  mostViewed: MostViewedArticle[]
  viewAllEditsHref: string
} = {
  totalEdits: 52,
  thanksReceived: 0,
  lastEdited: '5 months ago',
  longestStreak: '1 day',
  viewCount: '10,754',
  sparklineData: [
    420, 390, 410, 430, 400, 380, 415, 440, 425, 405, 390, 420, 435, 410,
    395, 430, 450, 420, 400, 415, 440, 425, 410, 395, 380, 400, 420, 410,
    390, 405, 430, 415, 395, 380, 400, 420, 440, 410, 390, 380, 350, 360,
  ],
  recentActivityData: [
    0, 0, 2, 0, 1, 0, 0, 3, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0,
    0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0,
    1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
  ],
  activityStartDate: 'Mar 17',
  activityEndDate: 'May 15',
  mostViewed: [
    {
      title: 'Bora Bora',
      views: 4821,
      sparklineData: [300, 320, 280, 350, 310, 290, 340, 360, 330, 300],
      href: '#',
    },
    {
      title: 'Wikipedia',
      views: 3104,
      sparklineData: [200, 210, 195, 220, 205, 215, 200, 210, 205, 195],
      href: '#',
    },
    {
      title: 'Atlantic Ocean',
      views: 2187,
      sparklineData: [150, 160, 145, 170, 155, 140, 160, 155, 145, 150],
      href: '#',
    },
  ],
  viewAllEditsHref: '#',
}

/** Shared across mobile + desktop for each matching module */
const MODULE = {
  thankTitle: 'Contribute',
  thankBody: 'No suggestions (yet)',
  policiesTitle: 'Learn',
  policiesBody: 'Learn how to edit Wikipedia',
} as const
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <SpecialPageWrapper title="Dashboard" help>
      <div class="prototype-dashpage-shell">
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
              <p class="prototype-dashpage-placeholder">{{ MODULE.thankBody }}</p>
            </DashboardModule>

            <MentorModule
              :mentor-name="MENTOR.name"
              :edit-count="MENTOR.editCount"
              :last-active-days-ago="MENTOR.lastActiveDaysAgo"
              :mentor-note="MENTOR.note"
              :to="HOME"
              :learn-more-href="MENTOR.learnMoreHref"
              :conversations-href="MENTOR.conversationsHref"
            />

            <ImpactModule :to="HOME" />

            <ImpactModule
              :to="HOME"
              :view-count="IMPACT.viewCount"
              :sparkline-data="[...IMPACT.sparklineData]"
              :last-edited="IMPACT.lastEdited"
              :longest-streak="IMPACT.longestStreak"
            />

            <DashboardModule
              :to="HOME"
              :title="MODULE.policiesTitle"
              :cta="null"
            >
              <p class="prototype-dashpage-placeholder">{{ MODULE.policiesBody }}</p>
            </DashboardModule>

            <HelpModule compact />
          </template>

          <template #primary>
            <DashboardModule :title="MODULE.thankTitle">
              <p class="prototype-dashpage-placeholder">{{ MODULE.thankBody }}</p>
            </DashboardModule>
          </template>

          <template #sidebar>
            <MentorModule
              :mentor-name="MENTOR.name"
              :edit-count="MENTOR.editCount"
              :last-active-days-ago="MENTOR.lastActiveDaysAgo"
              :mentor-note="MENTOR.note"
              :learn-more-href="MENTOR.learnMoreHref"
              :conversations-href="MENTOR.conversationsHref"
            />

            <ImpactModule />

            <ImpactModule
              :total-edits="IMPACT_DESKTOP.totalEdits"
              :thanks-received="IMPACT_DESKTOP.thanksReceived"
              :last-edited="IMPACT_DESKTOP.lastEdited"
              :longest-streak="IMPACT_DESKTOP.longestStreak"
              :view-count="IMPACT_DESKTOP.viewCount"
              :sparkline-data="IMPACT_DESKTOP.sparklineData"
              :recent-activity-data="IMPACT_DESKTOP.recentActivityData"
              :activity-start-date="IMPACT_DESKTOP.activityStartDate"
              :activity-end-date="IMPACT_DESKTOP.activityEndDate"
              :most-viewed="IMPACT_DESKTOP.mostViewed"
              :view-all-edits-href="IMPACT_DESKTOP.viewAllEditsHref"
            />
            <DashboardModule
              class="dashboard-slot--desktop-secondary"
              :title="MODULE.policiesTitle"
            >
              <p class="prototype-dashpage-placeholder">{{ MODULE.policiesBody }}</p>
            </DashboardModule>

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

.prototype-dashpage-placeholder {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-base--subtle, #54595d);
}


:deep(.dashboard-slot--mobile-primary .dashboard-module__body) {
  min-height: 3rem;
}

:deep(.dashboard-slot--desktop-primary .dashboard-module) {
  min-height: 8rem;
}
</style>
