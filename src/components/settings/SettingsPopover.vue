<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

import { CdxPopover } from '@wikimedia/codex'

const props = defineProps<{
  /** When set, reopen after `sessionStorage` was written before a navigation. */
  restoreOpenKey?: string
}>()

const open = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
/** Popover placement anchor; defaults to the trigger wrapper, or a specific control when opening. */
const popoverAnchor = ref<HTMLElement | null>(null)
const panelId = `settings-popover-panel-${useId()}`

function resolvePopoverAnchor(from?: HTMLElement | Event): HTMLElement | null {
  if (from instanceof HTMLElement) return from
  if (from instanceof Event && from.currentTarget instanceof HTMLElement) {
    return from.currentTarget
  }
  return triggerEl.value
}

function toggle(): void {
  if (!open.value) {
    popoverAnchor.value = triggerEl.value
  }
  open.value = !open.value
}

function openPopover(from?: HTMLElement | Event): void {
  popoverAnchor.value = resolvePopoverAnchor(from)
  open.value = true
}

/** Floating popovers have no scrim; dismiss when the pointer goes outside anchor + panel. */
function isInsidePopoverTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false
  if (triggerEl.value?.contains(target)) return true
  const panel = document.getElementById(panelId)
  if (panel?.contains(target)) return true
  if (target instanceof Element && target.closest('.cdx-menu, .cdx-select-vue__menu')) return true
  return false
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!open.value || isInsidePopoverTarget(event.target)) return
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    // Defer so the opening click does not immediately dismiss.
    requestAnimationFrame(() => {
      document.addEventListener('pointerdown', onDocumentPointerDown, true)
    })
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})

onMounted(() => {
  popoverAnchor.value = triggerEl.value
  if (!props.restoreOpenKey) return
  try {
    if (sessionStorage.getItem(props.restoreOpenKey) === '1') {
      sessionStorage.removeItem(props.restoreOpenKey)
      open.value = true
    }
  } catch {
    /* ignore */
  }
})
</script>

<template>
  <div class="settings-popover">
    <span ref="triggerEl" class="settings-popover__trigger">
      <slot :open="open" :toggle="toggle" :open-popover="openPopover" />
    </span>
    <CdxPopover
      v-model:open="open"
      :anchor="popoverAnchor ?? triggerEl"
      placement="bottom-end"
      use-bottom-sheet="responsive"
      class="settings-popover__overlay"
    >
      <div :id="panelId" class="settings-popover__panel" @click.stop>
        <slot name="panel" :open="open" />
      </div>
    </CdxPopover>
  </div>
</template>

<style scoped>
.settings-popover {
  display: inline-flex;
  flex-shrink: 0;
}

.settings-popover__trigger {
  display: inline-flex;
}
</style>

<!-- Teleported popover: scroll on Codex `.cdx-popover__body` (select menus are portaled). -->
<style>
.settings-popover__overlay.cdx-popover:not(.cdx-popover--bottom-sheet) {
  max-width: min(var(--size-2400), calc(100vw - var(--spacing-200)));
}

/*
 * Floating `.cdx-popover` padding (16px) sits outside `.cdx-popover__body`, so a default
 * body scroll leaves the scrollbar inset from the border. Extend the scrollport to the
 * popover edge; keep content aligned with Codex padding.
 */
.settings-popover__overlay.cdx-popover:not(.cdx-popover--bottom-sheet) .cdx-popover__body {
  min-height: 0;
  margin: -16px;
  padding: 16px;
}

.settings-popover__overlay .settings-popover__panel {
  box-sizing: border-box;
  width: 100%;
}
</style>
