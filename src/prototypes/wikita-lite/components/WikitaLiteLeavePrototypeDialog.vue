<script setup lang="ts">
import { computed, ref } from 'vue'

import { CdxDialog, CdxPopover } from '@wikimedia/codex'

import { t } from '@/i18n'
import { globalSkin } from '@/theme'

import { useWikitaLiteLeavePrototype } from '../composables/useWikitaLiteLeavePrototype'

const { dialogOpen, confirmLeave, cancelLeave } = useWikitaLiteLeavePrototype()

const sheetAnchor = ref<HTMLElement | null>(null)

/*
 * Phone: a bottom sheet anchored to the column. Desktop: an ordinary centred
 * modal over the page. Keyed on the global skin rather than a media query so it
 * flips at the same 640px threshold as the chrome, and follows `?skin=` when
 * that pins it — same rule as WikitaLiteFullscreenDialogShell.
 */
const isDesktop = computed(() => globalSkin.value === 'desktop')

const primaryAction = {
  label: t('components.leaveContinue'),
  actionType: 'progressive' as const,
}

const defaultAction = {
  label: t('components.leaveStay'),
}

const bodyText = t('components.leaveBody')

function onOpenChange(open: boolean): void {
  if (!open) cancelLeave()
}
</script>

<template>
  <CdxDialog
    v-if="isDesktop"
    v-model:open="dialogOpen"
    class="wikita-lite-leave-prototype-dialog"
    :title="t('components.leaveTitle')"
    :use-close-button="true"
    :primary-action="primaryAction"
    :default-action="defaultAction"
    @update:open="onOpenChange"
    @primary="confirmLeave"
    @default="cancelLeave"
  >
    {{ bodyText }}
  </CdxDialog>

  <template v-else>
    <span
      ref="sheetAnchor"
      class="wikita-lite-leave-prototype-sheet__anchor"
      aria-hidden="true"
    />
    <CdxPopover
      v-if="sheetAnchor"
      v-model:open="dialogOpen"
      class="wikita-lite-leave-prototype-sheet mobile-wrapper__sheet-popover"
      use-bottom-sheet
      :anchor="sheetAnchor"
      :title="t('components.leaveTitle')"
      :use-close-button="true"
      :primary-action="primaryAction"
      :default-action="defaultAction"
      :stacked-actions="true"
      @update:open="onOpenChange"
      @primary="confirmLeave"
      @default="cancelLeave"
    >
      {{ bodyText }}
    </CdxPopover>
  </template>
</template>

<!-- Teleports into MobileWrapper overlay; sheet layout via mobile-wrapper-overlays.css. -->
<style>
.wikita-lite-leave-prototype-sheet__anchor {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
  opacity: 0;
}

.wikita-lite-leave-prototype-sheet .cdx-popover__header__title,
.wikita-lite-leave-prototype-dialog .cdx-dialog__header__title {
  font-family: var(--font-family-base, sans-serif);
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large, 1.5);
}

.wikita-lite-leave-prototype-sheet .cdx-popover__body,
.wikita-lite-leave-prototype-dialog .cdx-dialog__body {
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.5rem);
}

.wikita-lite-leave-prototype-sheet .cdx-popover__footer__actions .cdx-button {
  box-sizing: border-box;
  width: 100%;
}

.wikita-lite-leave-prototype-dialog {
  max-width: 32rem;
}
</style>
