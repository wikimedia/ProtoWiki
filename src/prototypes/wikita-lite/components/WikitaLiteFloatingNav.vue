<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconHome } from '@wikimedia/codex-icons'

defineProps<{
  homeActive?: boolean
}>()

const emit = defineEmits<{
  'go-home': []
}>()
</script>

<template>
  <div class="wikita-lite-floating-nav" role="navigation" aria-label="Quick navigation">
    <button
      type="button"
      class="wikita-lite-floating-nav__btn"
      :class="{ 'wikita-lite-floating-nav__btn--active': homeActive }"
      aria-label="Home"
      :aria-pressed="homeActive"
      @click="emit('go-home')"
    >
      <CdxIcon :icon="cdxIconHome" />
    </button>
  </div>
</template>

<style scoped>
.wikita-lite-floating-nav {
  position: fixed;
  right: var(--spacing-100);
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  padding: var(--spacing-25);
  border-radius: var(--border-radius-pill);
  background-color: var(--background-color-interactive);
}

/* Match MobileWrapper’s centred column (inherits --mobile-wrapper-max-width). */
@media (min-width: 480px) {
  .wikita-lite-floating-nav {
    right: calc(
      (100vw - var(--mobile-wrapper-max-width, 360px)) / 2 + var(--spacing-100)
    );
  }
}

.wikita-lite-floating-nav__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--border-radius-circle);
  background-color: transparent;
  color: var(--color-base);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-lite-floating-nav__btn--active {
  background-color: var(--background-color-interactive-subtle--active);
}

.wikita-lite-floating-nav__btn:focus-visible {
  background-color: var(--background-color-interactive-subtle);
}
</style>
