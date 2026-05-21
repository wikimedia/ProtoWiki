<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowNext } from '@wikimedia/codex-icons'

interface Props {
  /** Centered toolbar title (Minerva subpage pattern). */
  title: string
  /** Vue Router target for the back control. */
  backTo: RouteLocationRaw
  /** Accessible name for the back link. */
  backLabel?: string
  /**
   * Pull the bar into `SpecialPageWrapper` mobile padding so it hugs the top and sides.
   * Matches `--spacing-100` on the wrapper’s inline / top inset.
   */
  bleed?: boolean
}

withDefaults(defineProps<Props>(), {
  backLabel: 'Back',
  bleed: true,
})
</script>

<template>
  <header class="mobile-subpage-header" :class="{ 'mobile-subpage-header--bleed': bleed }">
    <RouterLink
      :to="backTo"
      class="mobile-subpage-header__back"
      :aria-label="backLabel"
    >
      <CdxButton weight="quiet" :icon-only="true" tabindex="-1">
        <CdxIcon :icon="cdxIconArrowNext" dir="rtl" />
      </CdxButton>
    </RouterLink>
    <h1 class="mobile-subpage-header__title">{{ title }}</h1>
    <div class="mobile-subpage-header__actions">
      <slot name="actions">
        <span class="mobile-subpage-header__spacer" aria-hidden="true" />
      </slot>
    </div>
  </header>
</template>

<style scoped>
.mobile-subpage-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  width: 100%;
  min-height: 2.75rem;
  margin: 0 0 var(--spacing-100, 16px);
  padding-bottom: var(--spacing-50, 8px);
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.mobile-subpage-header--bleed {
  --mobile-subpage-bleed: var(--spacing-100, 16px);
  width: calc(100% + 2 * var(--mobile-subpage-bleed));
  margin-top: calc(-1 * var(--mobile-subpage-bleed));
  margin-inline: calc(-1 * var(--mobile-subpage-bleed));
  padding-inline: var(--mobile-subpage-bleed);
}

.mobile-subpage-header__back {
  flex-shrink: 0;
  width: 2.75rem;
  color: inherit;
  text-decoration: none;
}

.mobile-subpage-header__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.375);
  color: var(--color-base, #202122);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-subpage-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  width: 2.75rem;
}

/* Balance the back button so the title stays visually centered. */
.mobile-subpage-header__spacer {
  flex-shrink: 0;
  width: 2.75rem;
}
</style>
