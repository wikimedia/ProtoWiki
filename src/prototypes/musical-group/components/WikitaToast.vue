<script setup lang="ts">
import { CdxToast } from '@wikimedia/codex'

import BookmarkIcon from '../BookmarkIcon.vue'
import { useWikitaSaveFeedback } from '../composables/useWikitaSaveFeedback'
import WikitaButton from './WikitaButton.vue'

const { toastOpen, toastPageTitle, dismissToast, openListsSheet } = useWikitaSaveFeedback()

function onDismissed(): void {
  dismissToast()
}

function onAddToListClick(event: MouseEvent): void {
  event.stopPropagation()
  event.preventDefault()
  openListsSheet()
}
</script>

<template>
  <CdxToast
    v-if="toastOpen"
    type="notice"
    class="wikita-toast"
    standalone
    target="#wikita-overlay-root"
    prevent-user-dismiss
    :auto-dismiss="4000"
    @user-dismissed="onDismissed"
    @auto-dismissed="onDismissed"
  >
    <div class="wikita-toast__content">
      <BookmarkIcon filled class="wikita-toast__icon" />
      <p class="wikita-toast__message">
        <strong class="wikita-toast__title">{{ toastPageTitle }}</strong><span class="wikita-toast__suffix">&nbsp;saved</span>
      </p>
      <WikitaButton
        variant="outlined"
        class="wikita-toast__action"
        @click="onAddToListClick"
      >
        Add to list
      </WikitaButton>
    </div>
  </CdxToast>
</template>

<style scoped>
.wikita-toast__content {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  width: 100%;
}

.wikita-toast__icon {
  flex-shrink: 0;
  width: 18px;
  height: 20px;
  color: var(--color-base);
}

.wikita-toast__message {
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
  white-space: nowrap;
}

.wikita-toast__title {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wikita-toast__suffix {
  flex-shrink: 0;
}

.wikita-toast__action {
  flex-shrink: 0;
  margin-inline-start: calc(var(--spacing-100) - var(--spacing-50));
}
</style>

<!-- Teleported toast: override Codex defaults to match Wikita Figma. -->
<style>
#wikita-overlay-root .wikita-toast.cdx-toast,
.musical-group-shell .wikita-toast.cdx-toast {
  position: absolute !important;
  bottom: var(--wikita-toast-bottom, var(--spacing-100, 16px));
  left: 50%;
  right: auto;
  width: calc(100% - var(--spacing-100));
  max-width: calc(100% - var(--spacing-100));
  min-width: 0;
  transform: translateX(-50%);
  pointer-events: auto;
}

#wikita-overlay-root .wikita-toast.cdx-toast .cdx-toast__message,
.musical-group-shell .wikita-toast.cdx-toast .cdx-toast__message {
  align-items: center;
  padding: var(--spacing-50);
  border: 1px solid var(--border-color-muted);
  border-bottom-width: 2px;
  border-right-width: 2px;
  border-radius: 4px;
  background-color: var(--background-color-base);
  color: var(--color-base);
  box-shadow: none;
}

#wikita-overlay-root .wikita-toast.cdx-toast .cdx-message__dismiss-button,
.musical-group-shell .wikita-toast.cdx-toast .cdx-message__dismiss-button {
  display: none !important;
}

#wikita-overlay-root .wikita-toast.cdx-toast .cdx-message__icon,
#wikita-overlay-root .wikita-toast.cdx-toast .cdx-message__icon--vue,
.musical-group-shell .wikita-toast.cdx-toast .cdx-message__icon,
.musical-group-shell .wikita-toast.cdx-toast .cdx-message__icon--vue {
  display: none !important;
}

#wikita-overlay-root .wikita-toast.cdx-toast .cdx-message__content,
.musical-group-shell .wikita-toast.cdx-toast .cdx-message__content {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  color: inherit;
}

#wikita-overlay-root .wikita-toast.cdx-toast.cdx-toast-enter-from,
#wikita-overlay-root .wikita-toast.cdx-toast.cdx-toast-leave-to,
.musical-group-shell .wikita-toast.cdx-toast.cdx-toast-enter-from,
.musical-group-shell .wikita-toast.cdx-toast.cdx-toast-leave-to {
  transform: translateX(-50%) translateY(20px);
}

#wikita-overlay-root .wikita-toast.cdx-toast.cdx-toast-leave-active-system.cdx-toast-leave-to,
#wikita-overlay-root .wikita-toast.cdx-toast.cdx-toast-leave-active-user.cdx-toast-leave-to,
.musical-group-shell .wikita-toast.cdx-toast.cdx-toast-leave-active-system.cdx-toast-leave-to,
.musical-group-shell .wikita-toast.cdx-toast.cdx-toast-leave-active-user.cdx-toast-leave-to {
  transform: translateX(-50%);
}
</style>
