<script setup lang="ts">
import { CdxButton, CdxIcon, CdxTab, CdxTabs } from '@wikimedia/codex'
import { cdxIconExpand } from '@wikimedia/codex-icons'

interface Props {
  activeTab: 'community' | 'foryou'
  /** True on the For you tab, where this row floats over media instead of
   * sitting on a normal page background — same layout, inverted colors. */
  overlay?: boolean
}

withDefaults(defineProps<Props>(), {
  overlay: false,
})

const emit = defineEmits<{
  'update:activeTab': [value: 'community' | 'foryou']
}>()
</script>

<template>
  <div
    class="home-tabs-row"
    :class="{ 'home-tabs-row--overlay': overlay }"
  >
    <CdxTabs
      :active="activeTab"
      class="home-tabs-row__tabs"
      @update:active="emit('update:activeTab', $event as 'community' | 'foryou')"
    >
      <CdxTab
        name="community"
        label="Community"
      />
      <CdxTab
        name="foryou"
        label="For you"
      />
    </CdxTabs>
    <CdxButton
      class="home-tabs-row__lang-pill"
      weight="quiet"
    >
      EN
      <CdxIcon :icon="cdxIconExpand" />
    </CdxButton>
  </div>
</template>

<style scoped>
.home-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75, 12px);
}

.home-tabs-row__tabs {
  flex: 1 1 auto;
  min-width: 0;
}

.home-tabs-row__lang-pill {
  flex-shrink: 0;
  border: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  border-radius: var(--border-radius-pill, 9999px);
}

.home-tabs-row--overlay .home-tabs-row__lang-pill {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

/* Overlay theming — same Codex tabs structure, inverted for a transparent
   background over media instead of the normal light page background. */
.home-tabs-row--overlay :deep(.cdx-tabs__header) {
  background-color: transparent;
  border-bottom-color: rgba(255, 255, 255, 0.3);
}

/* Codex's own selectors for these states are unusually specific
   (`.cdx-tabs:not(.cdx-tabs--framed) > .cdx-tabs__header .cdx-tabs__list__item:enabled` etc.)
   — repeat the attribute selector to reliably outweigh them regardless of source order. */
.home-tabs-row--overlay
  :deep(.cdx-tabs__list__item[aria-selected='false'][aria-selected='false']) {
  color: rgba(255, 255, 255, 0.7);
}

.home-tabs-row--overlay
  :deep(.cdx-tabs__list__item[aria-selected='true'][aria-selected='true']) {
  color: #fff;
  box-shadow: inset 0 -2px 0 0 #fff;
}
</style>
