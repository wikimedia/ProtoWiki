<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconHelp } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'

interface HelpLink {
  label: string
  href: string
}

interface Props {
  compact?: boolean
  to?: RouteLocationRaw
  helpLinks?: HelpLink[]
  viewMoreHref?: string
}

withDefaults(defineProps<Props>(), {
  compact: false,
  to: undefined,
  helpLinks: () => [],
  viewMoreHref: undefined,
})
</script>

<template>
  <!-- Mobile: compact link card when `to` is set -->
  <DashboardModule v-if="compact" title="Get help with editing" :to="to">
    <p class="help-module__summary">Ask the help desk or read help pages.</p>
  </DashboardModule>

  <!-- Desktop: full static card with icon, link list, footer -->
  <DashboardModule v-else>
    <div class="help-module__full">
      <CdxIcon :icon="cdxIconHelp" size="medium" class="help-module__icon" />
      <div class="sidebar-card__title">Get help with editing</div>
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
.help-module__summary {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.help-module__icon {
  color: var(--color-base, #202122);
  width: var(--size-150);
}

.help-module__title {
  margin: 0;
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
}

.help-module__section-label {
  margin: 0;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.help-module__link {
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.help-module__link:hover {
  text-decoration: underline;
}

.help-module__view-more {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}
</style>
