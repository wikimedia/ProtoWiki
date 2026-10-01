<script setup lang="ts">
import { nextTick, ref, watch, type ComponentPublicInstance } from 'vue'

import { CdxPopover } from '@wikimedia/codex'

import { t } from '@/i18n'

import type { OnboardingScreen } from '../data/useWikitaLiteOnboardingFlow'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  anchor?: HTMLElement | ComponentPublicInstance | null
}>()

const emit = defineEmits<{
  navigate: [screen: OnboardingScreen]
  closed: []
}>()

const pendingScreen = ref<OnboardingScreen | null>(null)

const primaryAction = {
  label: t('onboarding.savePagesCreateAccount'),
  actionType: 'progressive' as const,
}

const defaultAction = {
  label: t('onboarding.savePagesLogIn'),
}

function queueNavigation(screen: OnboardingScreen): void {
  pendingScreen.value = screen
  open.value = false
}

function onCreateAccount(): void {
  queueNavigation('account')
}

function onLogIn(): void {
  queueNavigation('home')
}

// Emit only after the teleported popover has closed — routing away or unmounting
// the parent while CdxPopover is still tearing down causes Vue patch errors.
watch(open, async (isOpen) => {
  if (isOpen) return
  await nextTick()
  if (pendingScreen.value) {
    const screen = pendingScreen.value
    pendingScreen.value = null
    emit('navigate', screen)
  } else {
    emit('closed')
  }
})
</script>

<template>
  <CdxPopover
    v-model:open="open"
    class="save-pages-sheet mobile-wrapper__sheet-popover"
    use-bottom-sheet
    :anchor="props.anchor"
    :title="t('onboarding.savePagesTitle')"
    :use-close-button="true"
    :primary-action="primaryAction"
    :default-action="defaultAction"
    :stacked-actions="true"
    @primary="onCreateAccount"
    @default="onLogIn"
  >
    {{ t('onboarding.savePagesBody') }}
  </CdxPopover>
</template>

<!-- Teleports into MobileWrapper overlay; sheet layout via mobile-wrapper-overlays.css. -->
<style>
.save-pages-sheet .cdx-popover__header__title {
  font-family: var(--font-family-base, sans-serif);
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large, 1.5);
}

.save-pages-sheet .cdx-popover__footer__actions .cdx-button {
  box-sizing: border-box;
  width: 100%;
  min-height: 3rem;
  padding-block: var(--spacing-100, 16px);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold);
}
</style>
