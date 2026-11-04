<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose, cdxIconPushPin } from '@wikimedia/codex-icons'

const props = withDefaults(
  defineProps<{
    title: string
    pinned?: boolean
    /** Home feed chrome (title opens screen + ⋯ slot) vs fullscreen (close). */
    variant?: 'home' | 'screen'
  }>(),
  { pinned: false, variant: 'home' },
)

const emit = defineEmits<{
  'open-screen': []
  close: []
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

function bindEscape(enabled: boolean): void {
  if (enabled) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
}

onMounted(() => {
  if (props.variant === 'screen') bindEscape(true)
})

onUnmounted(() => {
  bindEscape(false)
})

watch(
  () => props.variant,
  (variant, was) => {
    if (variant === 'screen' && was !== 'screen') bindEscape(true)
    if (variant !== 'screen' && was === 'screen') bindEscape(false)
  },
)
</script>

<template>
  <!--
    Single head for home + fullscreen so title→body spacing cannot drift.
    Trailing action is a slot (⋯ menu on home; default close on screen).
  -->
  <header
    class="wikitab-module-head"
    :class="{ 'wikitab-module-head--screen': variant === 'screen' }"
  >
    <div class="wikitab-module-head__title-row">
      <CdxIcon
        v-if="pinned"
        class="wikitab-module-head__pin"
        :icon="cdxIconPushPin"
        icon-label="Pinned to top"
      />
      <button
        v-if="variant === 'home'"
        type="button"
        class="wikitab-module-head__title"
        @click="emit('open-screen')"
      >
        {{ title }}
      </button>
      <h2 v-else class="wikitab-module-head__title">{{ title }}</h2>
    </div>
    <!--
      Same footprint as CdxMenuButton (~pointer + 1px) whether the slot is ⋯ or ✕,
      so head height — and title→cards gap — does not depend on pin / variant.
    -->
    <div class="wikitab-module-head__action">
      <slot name="action">
        <CdxButton
          v-if="variant === 'screen'"
          class="wikitab-module-head__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          @click="emit('close')"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </slot>
    </div>
  </header>
</template>

<style scoped>
.wikitab-module-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
  margin-bottom: var(--spacing-50);
  flex-shrink: 0;
}

/* Tabs own the spacing below the title row (Saved / Active discussions). */
.wikitab-module-head:has(+ .wikitab-saved-item-tabs) {
  margin-bottom: 0;
}

.wikitab-module-head--screen {
  /* Match Saved fullscreen panel title inset (above `.wikitab-panel` padding). */
  padding-top: var(--spacing-200);
}

@media (max-width: 767px) {
  .wikitab-module-head--screen {
    /* Mobile chrome inset lives on `.wikitab-module-screen.wikitab-panel`. */
    padding-top: 0;
  }
}

.wikitab-module-head__title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
  min-height: var(--min-size-interactive-pointer);
}

.wikitab-module-head__pin {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

/*
 * Shared title metrics for `<button>` (home) and `<h2>` (screen) — identical
 * box so spacing does not change when the pin icon is absent.
 */
.wikitab-module-head__title {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--wikitab-theme-fg, var(--color-base));
  text-align: start;
}

button.wikitab-module-head__title {
  cursor: pointer;
}

.wikitab-module-head__action {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  min-height: calc(var(--min-size-interactive-pointer) + 1px);
}

.wikitab-module-head__close {
  flex-shrink: 0;
}
</style>
