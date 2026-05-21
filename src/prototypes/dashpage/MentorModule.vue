<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconUserAvatar } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'

interface Props {
  /** Full-page drill-down — body only, no `DashboardModule` card chrome. */
  standalone?: boolean
  /** Mobile preview link card. */
  compact?: boolean
  mentorName: string
  lastActiveDaysAgo: number
  editCount?: number
  mentorNote?: string
  to?: RouteLocationRaw
  learnMoreHref?: string
  conversationsHref?: string
  /** Profile link for the mentor username (standalone / desktop). */
  mentorProfileHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  compact: false,
  editCount: undefined,
  mentorNote: undefined,
  to: undefined,
  learnMoreHref: undefined,
  conversationsHref: undefined,
  mentorProfileHref: '#',
})
</script>

<template>
  <!-- Standalone full page (mobile drill-down) -->
  <div v-if="standalone" class="mentor-module mentor-module--standalone">
    <p class="mentor-module__intro">
      We've assigned you an experienced editor to answer your questions about editing.
      <a
        v-if="learnMoreHref"
        :href="learnMoreHref"
        class="mentor-module__link"
      >Learn more about mentors.</a>
    </p>

    <div class="mentor-module__user">
      <CdxIcon :icon="cdxIconUserAvatar" size="medium" class="mentor-module__avatar" />
      <div class="mentor-module__user-info">
        <a
          :href="mentorProfileHref"
          class="mentor-module__name mentor-module__name--link"
        >{{ mentorName }}</a>
        <p class="mentor-module__meta">
          <span v-if="editCount != null">{{ editCount.toLocaleString() }} edits · </span>Active {{ lastActiveDaysAgo }} days ago
        </p>
      </div>
    </div>

    <blockquote v-if="mentorNote" class="mentor-module__note mentor-module__note--quote">
      {{ mentorNote }}
    </blockquote>

    <CdxButton class="mentor-module__ask-btn mentor-module__ask-btn--standalone" weight="normal">
      Ask your mentor a question about editing
    </CdxButton>

    <p v-if="conversationsHref" class="mentor-module__conversations mentor-module__conversations--centered">
      <a :href="conversationsHref" class="mentor-module__link">View your mentor's other conversations</a>
    </p>
  </div>

  <!-- Mobile: compact preview link card -->
  <DashboardModule v-else-if="compact" title="Your mentor" :to="to" :cta="null">
    <p class="mentor-module__intro">
      We've assigned you an experienced editor to answer your questions about editing.
    </p>
    <div class="mentor-module__user">
      <CdxIcon :icon="cdxIconUserAvatar" size="medium" class="mentor-module__avatar" />
      <div class="mentor-module__user-info">
        <span class="mentor-module__name">{{ mentorName }}</span>
      </div>
    </div>
    <span class="mentor-module__meta">Active {{ lastActiveDaysAgo }} days ago</span>
  </DashboardModule>

  <!-- Desktop: full detail inside static sidebar card -->
  <DashboardModule v-else>
    <p class="mentor-module__intro">
      We've assigned you an experienced editor to answer your questions about editing.
      <a
        v-if="learnMoreHref"
        :href="learnMoreHref"
        class="mentor-module__link"
      >Learn more about mentors.</a>
    </p>
    <div class="mentor-module__user">
      <CdxIcon :icon="cdxIconUserAvatar" size="medium" class="mentor-module__avatar" />
      <div class="mentor-module__user-info">
        <a
          :href="mentorProfileHref"
          class="mentor-module__name mentor-module__name--progressive"
        >{{ mentorName }}</a>
      </div>
    </div>
    <p class="mentor-module__meta">
      <span v-if="editCount != null">{{ editCount.toLocaleString() }} edits · </span>Active {{ lastActiveDaysAgo }} days ago
    </p>
    <blockquote v-if="mentorNote" class="mentor-module__note">
      {{ mentorNote }}
    </blockquote>
    <CdxButton class="mentor-module__ask-btn" weight="normal">Ask your mentor a question about editing</CdxButton>
    <p v-if="conversationsHref" class="mentor-module__conversations">
      <a :href="conversationsHref" class="mentor-module__link">View your mentor's other conversations</a>
    </p>
  </DashboardModule>
</template>

<style scoped>
.mentor-module--standalone {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: var(--spacing-100, 16px);
  background-color: var(--background-color-base, #fff);
}

.mentor-module__intro {
  margin: 0 0 var(--spacing-100, 16px);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base, #202122);
}

.mentor-module__link {
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.mentor-module__link:hover {
  text-decoration: underline;
}

.mentor-module__user {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
  margin-bottom: var(--spacing-100, 16px);
}

.mentor-module__avatar {
  flex-shrink: 0;
  color: var(--color-base--subtle, #54595d);
  width: 2.5rem;
  height: 2.5rem;
}

.mentor-module__user-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
  min-width: 0;
}

.mentor-module__name {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
}

.mentor-module__name--progressive,
.mentor-module__name--link {
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.mentor-module__name--link:hover {
  text-decoration: underline;
}

.mentor-module__meta {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.mentor-module__note {
  margin: 0 0 var(--spacing-100, 16px);
  padding: 0 var(--spacing-75, 12px);
  border-left: 4px solid var(--border-color-subtle, #a2a9b1);
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}

.mentor-module__note--quote {
  font-family: var(--font-family-serif, 'Linux Libertine', Georgia, Times, serif);
  font-style: italic;
}

.mentor-module__ask-btn {
  margin: 0 0 var(--spacing-100, 16px);
  white-space: normal;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.mentor-module__ask-btn--standalone {
  display: flex;
  width: 100%;
  justify-content: center;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
  border: 1px solid var(--border-color-subtle, #a2a9b1);
}

.mentor-module__conversations {
  margin: 0;
  line-height: var(--line-height-medium);
}

.mentor-module__conversations--centered {
  text-align: center;
}

@media (min-width: 641px) {
  .mentor-module__intro {
    line-height: var(--line-height-small);
  }

  .mentor-module__meta {
    font-size: var(--font-size-x-small);
  }

  .mentor-module__note {
    font-size: var(--font-size-small);
    line-height: var(--line-height-small);
  }

  .mentor-module__conversations {
    line-height: var(--line-height-small);
  }
}
</style>
