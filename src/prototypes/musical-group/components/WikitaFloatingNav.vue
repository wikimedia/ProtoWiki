<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconEdit, cdxIconHome } from '@wikimedia/codex-icons'

defineProps<{
  showEdit?: boolean
  homeActive?: boolean
  editActive?: boolean
}>()

const emit = defineEmits<{
  'go-home': []
  'go-contribute': []
}>()
</script>

<template>
  <div class="wikita-floating-nav" role="navigation" aria-label="Quick navigation">
    <button
      type="button"
      class="wikita-floating-nav__btn"
      :class="{ 'wikita-floating-nav__btn--active': homeActive }"
      aria-label="Home"
      :aria-pressed="homeActive"
      @click="emit('go-home')"
    >
      <CdxIcon :icon="cdxIconHome" />
    </button>
    <button
      v-if="showEdit"
      type="button"
      class="wikita-floating-nav__btn"
      :class="{ 'wikita-floating-nav__btn--active': editActive }"
      aria-label="Contribute"
      :aria-pressed="editActive"
      @click="emit('go-contribute')"
    >
      <CdxIcon :icon="cdxIconEdit" />
    </button>
  </div>
</template>

<style scoped>
.wikita-floating-nav {
  position: fixed;
  right: max(var(--spacing-100), calc((100vw - 412px) / 2 + var(--spacing-100)));
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
  padding: var(--spacing-25);
  border-radius: var(--border-radius-pill);
  background-color: var(--background-color-interactive);
}

.wikita-floating-nav__btn {
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

.wikita-floating-nav__btn--active {
  background-color: var(--background-color-interactive-subtle--active);
}

.wikita-floating-nav__btn:focus-visible {
  background-color: var(--background-color-interactive-subtle);
}
</style>
