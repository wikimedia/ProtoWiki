<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowPrevious } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

import { useWikitaLiteSubpageBack } from '../composables/useWikitaLiteSubpageBack'

interface Props {
  title: string
  backLabel?: string
  bleed?: boolean
}

withDefaults(defineProps<Props>(), {
  backLabel: () => t('common.back'),
  bleed: true,
})

const { goBack } = useWikitaLiteSubpageBack()
</script>

<template>
  <header class="mobile-subpage-header" :class="{ 'mobile-subpage-header--bleed': bleed }">
    <CdxButton
      class="mobile-subpage-header__back"
      weight="quiet"
      :icon-only="true"
      :aria-label="backLabel"
      @click="goBack"
    >
      <CdxIcon :icon="cdxIconArrowPrevious" />
    </CdxButton>
    <h1 class="mobile-subpage-header__title">{{ title }}</h1>
    <div class="mobile-subpage-header__actions">
      <slot name="actions">
        <span class="mobile-subpage-header__spacer" aria-hidden="true" />
      </slot>
    </div>
  </header>
</template>

<style scoped>
/* 48px toolbar: 32px controls inside a uniform 8px padding box. The bottom
   rule is a box-shadow rather than a border so it sits *outside* those 48px —
   the bar measures 48px and the hairline is drawn under it. */
.mobile-subpage-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  width: 100%;
  min-height: 3rem;
  margin: 0 0 var(--spacing-75, 12px);
  padding: var(--spacing-50, 8px);
  box-shadow: 0 1px 0 var(--border-color-base, #a2a9b1);
}

/* Pull the bar out of the page's horizontal inset so it (and its rule) runs
   edge to edge, while the content below keeps that inset. The host surface
   publishes its own inset as `--mobile-subpage-inset`, so the two stay in sync. */
.mobile-subpage-header--bleed {
  --mobile-subpage-bleed: var(--mobile-subpage-inset, var(--spacing-50, 8px));
  width: calc(100% + 2 * var(--mobile-subpage-bleed));
  margin-top: calc(-1 * var(--mobile-subpage-bleed));
  margin-inline: calc(-1 * var(--mobile-subpage-bleed));
}

.mobile-subpage-header__back {
  flex-shrink: 0;
  width: 2rem;
}

.mobile-subpage-header__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
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
  width: 2rem;
}

.mobile-subpage-header__spacer {
  flex-shrink: 0;
  width: 2rem;
}
</style>
