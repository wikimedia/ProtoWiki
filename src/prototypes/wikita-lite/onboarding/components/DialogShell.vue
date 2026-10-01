<script setup lang="ts">
import { useId } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { t } from '@/i18n'

withDefaults(
  defineProps<{
    title: string
    doneLabel?: string
    /**
     * true (default): a fixed-position overlay that covers whatever is behind it
     * (e.g. the edit-types dialog opened over the carousel).
     * false: a normal-flow, full-height screen — use when the dialog IS the routed
     * view, so it participates in the route `<Transition>` like other screens.
     * A fixed-position leaving element strands `mode="out-in"` and blanks the page.
     */
    overlay?: boolean
  }>(),
  {
    doneLabel: () => t('onboarding.done'),
    overlay: true,
  },
)

const emit = defineEmits<{
  close: []
  done: []
}>()

// Unique per instance so stacked dialogs never collide on aria-labelledby.
const titleId = useId()
</script>

<template>
  <div
    class="dialog-shell"
    :class="{ 'dialog-shell--overlay': overlay }"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
  >
    <header class="dialog-shell__header">
      <CdxButton
        weight="quiet"
        :icon-only="true"
        :aria-label="t('onboarding.close')"
        class="dialog-shell__close"
        @click="emit('close')"
      >
        <CdxIcon :icon="cdxIconClose" />
      </CdxButton>

      <h1 :id="titleId" class="dialog-shell__title">{{ title }}</h1>

      <CdxButton
        action="progressive"
        weight="primary"
        class="dialog-shell__done"
        @click="emit('done')"
      >
        {{ doneLabel }}
      </CdxButton>
    </header>

    <div class="dialog-shell__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.dialog-shell {
  display: flex;
  flex-direction: column;
  /* Routed-screen default: fill the flex column it's mounted in (e.g. the
     OnboardingShell content area), so it behaves like the other screens rather
     than a fixed overlay that would strand the route <Transition>. */
  flex: 1 1 auto;
  min-height: 0;
  box-sizing: border-box;
  width: 100%;
  margin-inline: auto;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

/* Overlay: cover whatever is behind (used when opened on top of another screen). */
.dialog-shell--overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
}

.dialog-shell__header {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  padding: calc(env(safe-area-inset-top, 0px) + var(--spacing-75, 12px)) var(--spacing-100, 16px)
    var(--spacing-75, 12px) var(--spacing-50, 8px);
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.dialog-shell__close {
  flex-shrink: 0;
}

.dialog-shell__title {
  position: absolute;
  left: 50%;
  min-width: 0;
  max-width: calc(100% - 8rem);
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.375);
  color: var(--color-base, #202122);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  transform: translateX(-50%);
}

.dialog-shell__done {
  flex-shrink: 0;
  margin-inline-start: auto;
}

.dialog-shell__body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
