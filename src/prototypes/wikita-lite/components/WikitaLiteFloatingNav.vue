<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconBook,
  cdxIconGlobe,
  cdxIconHome,
} from '@wikimedia/codex-icons'
import type { Icon } from '@wikimedia/codex-icons'

import type { WikitaLiteView } from '../routes'
import { SHOW_WIKITA_LITE_FLOATING_NAV, VIEW_TAB_LABELS } from '../routes'

const NAV_ITEMS: { id: WikitaLiteView; label: string; icon: Icon }[] = [
  { id: 'edit', label: VIEW_TAB_LABELS.edit, icon: cdxIconHome },
  { id: 'community', label: VIEW_TAB_LABELS.community, icon: cdxIconGlobe },
  { id: 'read', label: VIEW_TAB_LABELS.read, icon: cdxIconBook },
]

defineProps<{
  activeView: WikitaLiteView
}>()

const emit = defineEmits<{
  'select-view': [view: WikitaLiteView]
}>()
</script>

<template>
  <div
    v-show="SHOW_WIKITA_LITE_FLOATING_NAV"
    class="wikita-lite-floating-nav"
    role="navigation"
    aria-label="Quick navigation"
  >
    <button
      v-for="item in NAV_ITEMS"
      :key="item.id"
      type="button"
      class="wikita-lite-floating-nav__btn"
      :class="{ 'wikita-lite-floating-nav__btn--active': activeView === item.id }"
      :aria-label="item.label"
      :aria-pressed="activeView === item.id"
      @click="emit('select-view', item.id)"
    >
      <CdxIcon :icon="item.icon" />
    </button>
  </div>
</template>

<style scoped>
.wikita-lite-floating-nav {
  position: fixed;
  right: var(--spacing-100);
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  padding: var(--spacing-25);
  border-radius: var(--border-radius-pill);
  background-color: var(--background-color-interactive);
}

/* Match MobileWrapper’s centred column (inherits --mobile-wrapper-max-width). */
@media (min-width: 480px) {
  .wikita-lite-floating-nav {
    right: calc(
      (100vw - var(--mobile-wrapper-max-width, 360px)) / 2 + var(--spacing-100)
    );
  }
}

.wikita-lite-floating-nav__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--border-radius-circle);
  background-color: transparent;
  color: var(--color-base);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-lite-floating-nav__btn--active {
  background-color: var(--background-color-interactive-subtle--active);
}

.wikita-lite-floating-nav__btn:focus-visible {
  background-color: var(--background-color-interactive-subtle);
}
</style>
