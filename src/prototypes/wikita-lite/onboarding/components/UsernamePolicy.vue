<template>
  <!--
    Vector: a Codex popover anchored to whichever affordance opened it, the way
    a help affordance behaves on a desktop page.
  -->
  <CdxPopover
    v-if="isDesktop"
    class="policy-popover"
    :open="visible"
    :anchor="anchor"
    :title="t('createAccount.usernamePolicy')"
    use-close-button
    render-in-place
    @update:open="onPopoverOpenUpdate"
  >
    <UsernamePolicyBody />
  </CdxPopover>

  <!-- Minerva: bottom sheet, inside the phone column. -->
  <Teleport v-else :to="overlayTarget!" :disabled="teleportDisabled">
    <Transition name="slide-up">
      <div
        v-show="visible"
        class="policy-overlay"
        :class="{ 'policy-overlay--viewport': teleportDisabled }"
        @click.self="$emit('close')"
      >
        <div class="policy-sheet">
          <div class="policy-header">
            <h2 class="policy-title">{{ t('createAccount.usernamePolicy') }}</h2>
            <CdxButton weight="quiet" :aria-label="t('onboarding.close')" @click="$emit('close')">
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
          </div>
          <UsernamePolicyBody />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'

import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { t } from '@/i18n'
import { globalSkin } from '@/theme'

import UsernamePolicyBody from './UsernamePolicyBody.vue'

defineProps({
  visible: { type: Boolean, default: false },
  /**
   * The element the popover hangs off on desktop — a template ref to whichever
   * affordance opens it (the help button, or the inline link in the copy
   * variants that use one). Unused by the mobile bottom sheet.
   */
  anchor: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const isDesktop = computed(() => globalSkin.value === 'desktop')

/** `CdxPopover` reports its own dismissals (close button, outside click, Esc). */
function onPopoverOpenUpdate(open: boolean): void {
  if (!open) emit('close')
}

const overlayTarget = inject<Ref<HTMLElement | null>>('CdxTeleportTarget', null)
const teleportDisabled = computed(() => !overlayTarget?.value)
</script>

<style scoped>
.policy-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

/* Fallback when rendered in place (no MobileWrapper overlay target). */
.policy-overlay--viewport {
  position: fixed;
  z-index: 100;
}

@media (min-width: 480px) {
  .policy-overlay--viewport {
    inset-inline: 0;
    margin-inline: auto;
    width: min(100%, var(--mobile-wrapper-max-width, 412px));
  }
}

.policy-sheet {
  width: 100%;
  background: var(--background-color-base);
  border-top: var(--border-base);
  box-shadow: var(--box-shadow-medium);
  padding: var(--spacing-100);
}

.policy-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: var(--spacing-50);
}

.policy-title {
  flex: 1;
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.slide-up-enter-active {
  transition: opacity 350ms cubic-bezier(0.77, 0, 0.175, 1);
}
.slide-up-enter-active .policy-sheet {
  transition: transform 350ms cubic-bezier(0.77, 0, 0.175, 1),
              opacity 350ms cubic-bezier(0.77, 0, 0.175, 1);
}
.slide-up-enter-from {
  opacity: 0;
}
.slide-up-enter-from .policy-sheet {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-active {
  transition: opacity 250ms cubic-bezier(0.77, 0, 0.175, 1);
}
.slide-up-leave-active .policy-sheet {
  transition: transform 250ms cubic-bezier(0.77, 0, 0.175, 1),
              opacity 250ms cubic-bezier(0.77, 0, 0.175, 1);
}
.slide-up-leave-to {
  opacity: 0;
}
.slide-up-leave-to .policy-sheet {
  transform: translateY(100%);
  opacity: 0;
}
</style>
