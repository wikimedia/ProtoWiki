<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconUserRights } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'

interface Props {
  mentorName: string
  lastActiveDaysAgo: number
  editCount?: number
  mentorNote?: string
  to?: RouteLocationRaw
  learnMoreHref?: string
  conversationsHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  editCount: undefined,
  mentorNote: undefined,
  to: undefined,
  learnMoreHref: undefined,
  conversationsHref: undefined,
})
</script>

<template>
  <DashboardModule title="Your mentor" :to="props.to" :cta="null">
    <!-- Mobile: simplified user row inside link card -->
    <template v-if="props.to != null">
      <p class="mentor-module__intro">
        We've assigned you an experienced editor to answer your questions about editing.
      </p>
      <div class="mentor-module__user">
        <CdxIcon :icon="cdxIconUserRights" size="medium" class="mentor-module__avatar" />
        <div class="mentor-module__user-info">
          <span class="mentor-module__name">{{ props.mentorName }}</span>
        </div>
      </div>
      <span class="mentor-module__meta">Active {{ props.lastActiveDaysAgo }} days ago</span>
    </template>

    <!-- Desktop: full detail inside static sidebar card -->
    <template v-else>
      <p class="mentor-module__intro">
        We've assigned you an experienced editor to answer your questions about editing.
        <a
          v-if="props.learnMoreHref"
          :href="props.learnMoreHref"
          class="mentor-module__link"
        >Learn more about mentors.</a>
      </p>
      <div class="mentor-module__user">
        <CdxIcon :icon="cdxIconUserRights" size="medium" class="mentor-module__avatar" />
        <div class="mentor-module__user-info">
          <span class="mentor-module__name mentor-module__name--progressive">{{ props.mentorName }}</span>
        </div>
      </div>
      <p class="mentor-module__meta">
        <span v-if="props.editCount != null">{{ props.editCount.toLocaleString() }} edits · </span>Active {{ props.lastActiveDaysAgo }} days ago
      </p>
      <blockquote v-if="props.mentorNote" class="mentor-module__note">
        {{ props.mentorNote }}
      </blockquote>
      <CdxButton class="mentor-module__ask-btn" weight="normal">Ask your mentor a question about editing</CdxButton>
      <p
        v-if="props.conversationsHref"
        :href="props.conversationsHref"
        class="mentor-module__conversations">
        <a class="mentor-module__link">View your mentor's other conversations</a>
      </p>
    </template>
  </DashboardModule>
</template>

<style scoped>
.mentor-module__intro {
  line-height: var(--line-height-medium);
}

@media (min-width: 641px) {
  .mentor-module__intro {
    line-height: var(--line-height-small);
  }
}

.mentor-module__user {
  display: flex;
  align-items: center;
  gap: var(--spacing-100, 16px);
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
  gap: 2px;
  min-width: 0;
}

.mentor-module__name--progressive {
  font-size: var(--font-size-large);
  color: var(--color-progressive, #36c);
}

.mentor-module__meta {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

@media (min-width: 641px) {
  .mentor-module__meta {
    font-size: var(--font-size-x-small);
  }
}

.mentor-module__note {
  margin: var(--spacing-75) 0 0;
  padding: 0.25rem 0 0.25rem var(--spacing-75);
  border-left: 4px solid var(--border-color-subtle, #a2a9b1);
  font-family: var(--font-family-system-sans);
}

@media (min-width: 641px) {
  .mentor-module__note {
    font-size: var(--font-size-small);
    line-height: var(--line-height-small);
  }
}

.mentor-module__ask-btn {
  margin: var(--spacing-75) 0;
  white-space: wrap;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}
.mentor-module__conversations {
  margin: 0;
  line-height: var(--line-height-medium);
}

@media (min-width: 641px) {
  .mentor-module__conversations {
    line-height: var(--line-height-small);
  }
}
</style>
