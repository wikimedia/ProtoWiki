<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconArrowNext } from '@wikimedia/codex-icons'

interface Props {
  title: string
  backLabel?: string
  bleed?: boolean
}

withDefaults(defineProps<Props>(), {
  backLabel: 'Back',
  bleed: true,
})

const router = useRouter()

function goBack() {
  router.back()
}
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
      <CdxIcon :icon="cdxIconArrowNext" dir="rtl" />
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
  --mobile-subpage-bleed: var(--spacing-50, 8px);
  width: calc(100% + 2 * var(--mobile-subpage-bleed));
  margin-top: calc(-1 * var(--mobile-subpage-bleed));
  margin-inline: calc(-1 * var(--mobile-subpage-bleed));
  padding-inline: var(--mobile-subpage-bleed);
}

.mobile-subpage-header__back {
  flex-shrink: 0;
  width: 2.75rem;
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
  width: 2.75rem;
}

.mobile-subpage-header__spacer {
  flex-shrink: 0;
  width: 2.75rem;
}
</style>
