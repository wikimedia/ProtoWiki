<script setup lang="ts">
import { provide, ref } from 'vue'

import '@/styles/mobile-wrapper-overlays.css'

/**
 * Phone-frame preview shell: full-width children below **480px** viewport;
 * centred column with neutral side gutters (Codex **`--background-color-neutral`**) when wider.
 *
 * Compose with **`ChromeWrapper skin="mobile"`** (or other mobile-skinned content)
 * inside the default slot.
 *
 * Provides `#mobile-wrapper-overlay` as Codex's teleport target so popovers,
 * bottom sheets, and dialogs stay inside the phone column on wide viewports.
 */
interface Props {
  /** BCP-47 language tag on the inner column (optional). */
  lang?: string
  /** Writing direction on the inner column (optional). */
  dir?: 'ltr' | 'rtl'
  /** Max width of the centred column when clamped (wide viewports). */
  maxWidth?: string
  /** Side borders on the centred column when previewing above 480px. */
  showFrameBorder?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lang: undefined,
  dir: undefined,
  maxWidth: '412px',
  showFrameBorder: true,
})

/** Element ref (not a selector) so Teleport resolves the target before slot children mount. */
const overlayEl = ref<HTMLElement | null>(null)

provide('CdxTeleportTarget', overlayEl)
</script>

<template>
  <div
    class="mobile-wrapper"
    :style="{ '--mobile-wrapper-max-width': props.maxWidth }"
  >
    <div
      id="mobile-wrapper-overlay"
      ref="overlayEl"
      class="mobile-wrapper__overlay"
      aria-hidden="true"
    />
    <div
      class="mobile-wrapper__column"
      :class="{ 'mobile-wrapper__column--frameless': !props.showFrameBorder }"
      :lang="props.lang"
      :dir="props.dir"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.mobile-wrapper {
  box-sizing: border-box;
  width: 100%;
}

.mobile-wrapper__column {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
}

/* Wider than a typical phone column — show frame + gutters (below global skin 640px). */
@media (min-width: 480px) {
  .mobile-wrapper {
    min-height: 100vh;
    background-color: var(--background-color-neutral);
  }

  .mobile-wrapper__column {
    max-width: var(--mobile-wrapper-max-width, 412px);
    margin-inline: auto;
    background-color: var(--background-color-base);
    border-inline: var(--border-width-base) solid var(--border-color-muted);
  }

  .mobile-wrapper__column--frameless {
    border-inline: none;
  }
}
</style>
