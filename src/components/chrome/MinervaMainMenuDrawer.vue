<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

const route = useRoute()

const open = ref(false)
const trigger = ref<InstanceType<typeof CdxButton> | null>(null)
const panel = ref<HTMLElement | null>(null)

function close(): void {
  open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(open, async (isOpen) => {
  document.documentElement.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    panel.value?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true })
  } else {
    document.removeEventListener('keydown', onKeydown)
    ;(trigger.value?.$el as HTMLElement | undefined)?.focus({ preventScroll: true })
  }
})

watch(() => route.fullPath, close)

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ close })
</script>

<template>
  <CdxButton
    ref="trigger"
    class="minerva-main-menu-drawer__trigger"
    weight="quiet"
    size="large"
    aria-label="Main menu"
    :aria-expanded="open"
    aria-controls="minerva-main-menu-drawer"
    @click="open = !open"
  >
    <CdxIcon :icon="cdxIconMenu" />
  </CdxButton>

  <div
    class="minerva-main-menu-drawer__mask"
    :class="{ 'minerva-main-menu-drawer__mask--open': open }"
    aria-hidden="true"
    @click="close"
  />

  <nav
    id="minerva-main-menu-drawer"
    ref="panel"
    class="minerva-main-menu-drawer"
    :class="{ 'minerva-main-menu-drawer--open': open }"
    aria-label="Main menu"
    :inert="!open"
  >
    <div class="minerva-main-menu-drawer__scroll">
      <slot />
    </div>
    <slot name="footer" />
  </nav>
</template>

<style scoped>
/*
 * Minerva's main menu shell — production `#mw-mf-page-left`, `.main-menu-mask`,
 * on Codex tokens.
 */
.minerva-main-menu-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-index-off-canvas);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 275px;
  max-width: 80%;
  background-color: var(--background-color-interactive);
  visibility: hidden;
  transform: translate(-100%, 0);
  transition:
    visibility 250ms ease-in-out,
    transform 250ms ease-in-out;
}

.minerva-main-menu-drawer--open {
  visibility: visible;
  box-shadow: var(--box-shadow-medium);
  transform: translate(0, 0);
}

@media screen and (min-width: 640px) {
  .minerva-main-menu-drawer {
    min-width: 320px;
  }
}

.minerva-main-menu-drawer__mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-off-canvas-backdrop);
  background: rgba(0, 0, 0, 0.8);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 100ms ease-in-out,
    visibility 0ms linear 100ms;
}

.minerva-main-menu-drawer__mask--open {
  opacity: 0.5;
  visibility: visible;
  transition: opacity 100ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .minerva-main-menu-drawer {
    transition: visibility 0ms;
  }
}

.minerva-main-menu-drawer__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
</style>
