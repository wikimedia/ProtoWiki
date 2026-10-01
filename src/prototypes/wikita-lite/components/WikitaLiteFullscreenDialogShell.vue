<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CdxButton, CdxDialog, type PrimaryModalAction } from '@wikimedia/codex'

import { t } from '@/i18n'
import { globalSkin } from '@/theme'

interface Props {
  title: string
  /** Description under the title. Codex renders it in the dialog header. */
  subtitle?: string | null
  closeLabel?: string
  /** Renders a large primary button in the dialog footer — no button injected into the body. */
  primaryAction?: PrimaryModalAction | null
}

withDefaults(defineProps<Props>(), {
  subtitle: null,
  closeLabel: () => t('common.close'),
  primaryAction: null,
})

const emit = defineEmits<{ close: []; primary: [] }>()

/*
 * Phone: a full-height takeover. Desktop: an ordinary centred modal sized to its
 * content. Keyed on the global skin rather than a media query so it flips at the
 * same 640px threshold as the chrome, and follows `?skin=` when that pins it.
 */
const isDesktop = computed(() => globalSkin.value === 'desktop')

const shellEl = ref<HTMLElement | null>(null)
const bodyScrolls = ref(false)
let resizeObserver: ResizeObserver | null = null

function measureScroll(): void {
  const body = shellEl.value?.querySelector<HTMLElement>('.cdx-dialog__body')
  if (!body) return
  bodyScrolls.value = body.scrollHeight - body.clientHeight > 1
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0)
  }

  const body = shellEl.value?.querySelector<HTMLElement>('.cdx-dialog__body')
  measureScroll()
  resizeObserver = new ResizeObserver(() => measureScroll())
  if (body) {
    resizeObserver.observe(body)
    // The slot content, skipping the zero-height focus holder ahead of it.
    const content = body.querySelector<HTMLElement>(':scope > :not([data-dialog-focus-holder])')
    if (content) resizeObserver.observe(content)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())

function onDialogClose(open: boolean): void {
  if (!open) emit('close')
}

</script>

<template>
  <div
    ref="shellEl"
    class="wikita-lite-fullscreen-dialog-shell"
    :class="{
      'wikita-lite-fullscreen-dialog-shell--scrolls': bodyScrolls,
      'wikita-lite-fullscreen-dialog-shell--centred': isDesktop,
    }"
  >
    <CdxDialog
      :open="true"
      :fixed-height="!isDesktop"
      render-in-place
      :title="title"
      :subtitle="subtitle"
      :use-close-button="true"
      :close-button-label="closeLabel"
      :stacked-actions="true"
      @update:open="onDialogClose"
      @primary="emit('primary')"
    >
      <!--
        Focus holder. On open, Codex's focus trap focuses the first focusable
        node in the dialog body, which would be a control the reader never
        picked (the first drag handle in the Home layout list). This sits ahead
        of the slot so the trap lands here instead, leaving the dialog with
        nothing selected and Tab starting from the top.

        `tabindex="-1"` keeps it out of the tab order while still accepting
        programmatic focus. It is an `<a>` rather than a `<div>` because the
        trap only looks for focusable tags and non-negative `[tabindex]`, so a
        `tabindex="-1"` div would be skipped over and the handle focused again.
      -->
      <a
        class="wikita-lite-fullscreen-dialog-shell__focus-holder"
        data-dialog-focus-holder
        tabindex="-1"
      />

      <slot />

      <template
        v-if="primaryAction"
        #footer
      >
        <div class="cdx-dialog__footer__actions">
          <CdxButton
            class="cdx-dialog__footer__primary-action"
            weight="primary"
            size="large"
            :action="primaryAction.actionType"
            :disabled="primaryAction.disabled"
            @click="emit('primary')"
          >
            {{ primaryAction.label }}
          </CdxButton>
        </div>
      </template>
    </CdxDialog>
  </div>
</template>

<style scoped>
.wikita-lite-fullscreen-dialog-shell {
  /* Pin to the visible viewport — relative + min-height sits in document flow and
     ends up off-screen when Home was scrolled before opening configure. */
  position: fixed;
  inset: 0;
  z-index: var(--z-index-overlay, 450);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  --wikita-lite-dialog-safe-area-top: env(safe-area-inset-top, 0px);
  --wikita-lite-dialog-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --wikita-lite-dialog-top-inset: max(
    var(--spacing-100, 16px),
    var(--wikita-lite-dialog-safe-area-top)
  );
  --wikita-lite-dialog-bottom-inset: max(
    var(--spacing-100, 16px),
    var(--wikita-lite-dialog-safe-area-bottom)
  );
  background-color: var(--background-color-base);
}

@media (min-width: 480px) {
  .wikita-lite-fullscreen-dialog-shell {
    inset-inline: 0;
    margin-inline: auto;
    width: min(100%, var(--mobile-wrapper-max-width, 412px));
  }
}

.wikita-lite-fullscreen-dialog-shell :deep(.cdx-dialog-backdrop) {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding-top: var(--wikita-lite-dialog-top-inset);
  padding-bottom: var(--wikita-lite-dialog-bottom-inset);
}

.wikita-lite-fullscreen-dialog-shell :deep(.cdx-dialog) {
  width: calc(100% - 2rem);
  max-width: none;
}

.wikita-lite-fullscreen-dialog-shell :deep(.cdx-dialog--fixed-height) {
  height: calc(100% - 2rem);
}

/* Desktop: hand height back to the content and restore Codex's own width clamp,
   so the backdrop's flex centring places a normal modal on the page. */
.wikita-lite-fullscreen-dialog-shell--centred :deep(.cdx-dialog) {
  max-width: 32rem;
}

.wikita-lite-fullscreen-dialog-shell :deep(.cdx-dialog__body) {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
}

.wikita-lite-fullscreen-dialog-shell__focus-holder {
  flex: 0 0 auto;
  height: 0;
  outline: none;
}

.wikita-lite-fullscreen-dialog-shell--scrolls :deep(.cdx-dialog__header) {
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-muted, #c8ccd1);
}
</style>
