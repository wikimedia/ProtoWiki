<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconHelp } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/dashboard/DashboardModule.vue'

export interface HelpLink {
  label: string
  href: string
}

interface Props {
  /** Full-page drill-down — body only, no `DashboardModule` card chrome. */
  standalone?: boolean
  compact?: boolean
  to?: RouteLocationRaw
  /** Mobile preview card title. */
  title?: string
  /** Mobile preview card body copy. */
  summary?: string
  helpLinks?: HelpLink[]
  viewMoreHref?: string
}

withDefaults(defineProps<Props>(), {
  standalone: false,
  compact: false,
  to: undefined,
  title: 'Get help with editing',
  summary: 'Ask the help desk or read help pages.',
  helpLinks: () => [],
  viewMoreHref: undefined,
})
</script>

<template>
  <!-- Standalone full page (mobile drill-down) -->
  <div v-if="standalone" class="help-module help-module--standalone">
    <template v-if="helpLinks.length > 0">
      <p class="help-module__section-label">Top help pages about editing</p>
      <ul class="help-module__list">
        <li v-for="link in helpLinks" :key="link.href" class="help-module__list-item">
          <a :href="link.href" class="help-module__link">{{ link.label }}</a>
        </li>
      </ul>
    </template>
    <a v-if="viewMoreHref" :href="viewMoreHref" class="help-module__link help-module__view-more">
      View more help articles
    </a>
  </div>

  <!-- Mobile: compact link card when `to` is set -->
  <DashboardModule v-else-if="compact" :title="title" :to="to" :cta="null">
    <p class="help-module__summary">{{ summary }}</p>
  </DashboardModule>

  <!-- Desktop: full static card with icon, link list, footer -->
  <DashboardModule v-else>
    <div class="help-module__full">
      <CdxIcon :icon="cdxIconHelp" size="medium" class="help-module__icon" />
      <h3 class="help-module__title">{{ title }}</h3>
      <template v-if="helpLinks.length > 0">
        <p class="help-module__section-label">Top help pages about editing</p>
        <ul class="help-module__list">
          <li v-for="link in helpLinks" :key="link.href" class="help-module__list-item">
            <a :href="link.href" class="help-module__link">{{ link.label }}</a>
          </li>
        </ul>
      </template>
      <a v-if="viewMoreHref" :href="viewMoreHref" class="help-module__link help-module__view-more">
        View more help articles
      </a>
    </div>
  </DashboardModule>
</template>

<style scoped>
.help-module--standalone {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.help-module__summary {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base--subtle, #54595d);
}

.help-module__full {
  display: flex;
  flex-direction: column;
}

.help-module__icon {
  display: block;
  flex-shrink: 0;
  width: var(--size-150, 1.5rem);
  height: var(--size-150, 1.5rem);
  margin: 0 0 var(--spacing-50, 8px);
  color: var(--color-base, #202122);
}

.help-module__title {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium);
  color: var(--color-base, #202122);
}

.help-module__section-label {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.help-module__list {
  margin: 0 0 var(--spacing-100, 16px);
  padding: 0;
  list-style: none;
}

.help-module__list-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
  margin: 0;
  padding: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small, 1.375);
}

.help-module__list-item + .help-module__list-item {
  margin-top: var(--spacing-25, 4px);
}

.help-module__list-item::before {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 0.45em;
  border-radius: 50%;
  background-color: var(--color-progressive, #36c);
  content: '';
}

.help-module__link {
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.help-module__link:hover {
  text-decoration: underline;
}

.help-module__view-more {
  display: inline-block;
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
}
</style>
