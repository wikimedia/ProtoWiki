<script setup lang="ts">
import { computed } from 'vue'

import './onboarding-layout.css'

/**
 * Full-height onboarding shell for the personalisation steps: a 3-segment
 * progress indicator at the top and a scrollable content area. When screens
 * use inline actions (Figma dashpage pattern), they pin CTAs inside `.ob-body`.
 */
interface Props {
  /** Active step (1 = survey, 2 = interests, 3 = email). 0 = welcome — no segment highlighted. */
  current?: number
  /** Total number of progress segments. */
  total?: number
  /** Hide the progress bar entirely (kept for flexibility). */
  showProgress?: boolean
  /** Remove padding from the scrollable content area (full-bleed layouts). */
  flushContent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  current: 0,
  total: 3,
  showProgress: true,
  flushContent: false,
})

/** Figma highlights one segment at a time, not a cumulative fill. */
const activeSegment = computed(() => (props.current > 0 ? props.current - 1 : -1))
</script>

<template>
  <div class="onboarding-shell">
    <div v-if="props.showProgress" class="onboarding-shell__progress" role="presentation">
      <span
        v-for="index in props.total"
        :key="index"
        class="onboarding-shell__segment"
        :class="{ 'onboarding-shell__segment--active': index - 1 === activeSegment }"
      />
    </div>

    <div
      class="onboarding-shell__content"
      :class="{ 'onboarding-shell__content--flush': props.flushContent }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.onboarding-shell {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  background-color: var(--background-color-base);
}

.onboarding-shell__progress {
  display: flex;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-100, 16px);
}

.onboarding-shell__segment {
  flex: 1;
  height: 4px;
  border-radius: var(--border-radius-pill, 9999px);
  background-color: var(--background-color-neutral, #eaecf0);
}

.onboarding-shell__segment--active {
  background-color: var(--background-color-interactive, #c8ccd1);
}

.onboarding-shell__content {
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px) var(--spacing-100, 16px);
}

.onboarding-shell__content--flush {
  display: flex;
  flex-direction: column;
  padding: 0;
}
</style>
