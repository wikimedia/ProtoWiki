<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCheck, cdxIconClose } from '@wikimedia/codex-icons'

import {
  colorThemeCardStyle,
  WIKITAB_COLOR_THEME_ITEMS,
  type WikitabColorThemeId,
} from './data/wikitabColorThemes'

const props = defineProps<{
  selectedId: WikitabColorThemeId | null
}>()

const emit = defineEmits<{
  close: []
  select: [id: WikitabColorThemeId]
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

function selectTheme(id: WikitabColorThemeId): void {
  emit('select', id)
  emit('close')
}

const SCROLL_LOCK_CLASS = 'wikitab-color-picker-open'

onMounted(() => {
  document.documentElement.classList.add(SCROLL_LOCK_CLASS)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.documentElement.classList.remove(SCROLL_LOCK_CLASS)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="wikitab-color-theme-picker" role="dialog" aria-modal="true" aria-label="Color theme">
    <div class="wikitab-color-theme-picker__column">
      <header class="wikitab-color-theme-picker__head">
        <h2 class="wikitab-color-theme-picker__title">Color theme</h2>
        <CdxButton
          class="wikitab-color-theme-picker__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          @click="emit('close')"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </header>

      <div class="wikitab-color-theme-picker__grid">
        <button
          v-for="item in WIKITAB_COLOR_THEME_ITEMS"
          :key="item.id"
          type="button"
          class="wikitab-color-theme-picker__card"
          :class="{
            'wikitab-color-theme-picker__card--selected': props.selectedId === item.id,
            'wikitab-color-theme-picker__card--light-hover': colorThemeCardStyle(item.id)
              .lightHover,
          }"
          :style="colorThemeCardStyle(item.id).style"
          :aria-pressed="props.selectedId === item.id"
          @click="selectTheme(item.id)"
        >
          <span class="wikitab-color-theme-picker__card-label">{{ item.label }}</span>
          <CdxIcon
            v-if="props.selectedId === item.id"
            class="wikitab-color-theme-picker__card-check"
            :icon="cdxIconCheck"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * While open, release html `scrollbar-gutter: stable` and lock the document so only
 * this panel scrolls — otherwise a white strip shows beside the gutter.
 */
:global(html.wikitab-color-picker-open) {
  overflow: hidden;
  scrollbar-gutter: auto;
}

.wikitab-color-theme-picker {
  --wikitab-page-gutter: var(--spacing-100);

  position: fixed;
  inset: 0;
  z-index: 20;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-inline: var(--wikitab-page-gutter);
  padding-block: var(--spacing-100);
  background-color: var(--wikitab-theme-bg, var(--background-color-base));
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-color-theme-picker__column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
  width: 100%;
  margin-inline: auto;
}

.wikitab-color-theme-picker__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  padding-top: var(--spacing-200);
}

.wikitab-color-theme-picker__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-color-theme-picker__close {
  flex-shrink: 0;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
}

.wikitab-color-theme-picker__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-100);
  padding-bottom: var(--spacing-400);
}

.wikitab-color-theme-picker__card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 4.5rem;
  padding: var(--spacing-100);
  border: 2px solid transparent;
  border-radius: var(--border-radius-base);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikitab-color-theme-picker__card:hover {
  box-shadow: inset 0 0 0 9999px rgba(255, 255, 255, 0.12);
}

.wikitab-color-theme-picker__card--light-hover:hover {
  box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.08);
}

.wikitab-color-theme-picker__card:focus-visible {
  outline: 2px solid var(--wikitab-theme-fg, var(--color-progressive));
  outline-offset: 2px;
}

.wikitab-color-theme-picker__card--selected {
  box-shadow: inset 0 0 0 2px currentColor;
}

.wikitab-color-theme-picker__card-label {
  flex: 1;
  min-width: 0;
}

.wikitab-color-theme-picker__card-check {
  flex-shrink: 0;
  margin-inline-start: var(--spacing-50);
}

@media (max-width: 639px) {
  .wikitab-color-theme-picker {
    padding: 0;
  }

  .wikitab-color-theme-picker__column {
    padding-top: var(--spacing-150);
  }

  .wikitab-color-theme-picker__head {
    padding-top: 0;
    padding-inline: var(--spacing-100);
  }

  .wikitab-color-theme-picker__grid {
    padding-inline: var(--spacing-100);
  }
}

@media (min-width: 640px) and (max-width: 767px) {
  [data-skin='desktop'] .wikitab-color-theme-picker {
    padding-top: 0;
  }

  [data-skin='desktop'] .wikitab-color-theme-picker__column {
    max-width: 640px;
    padding-top: var(--spacing-150);
  }

  [data-skin='desktop'] .wikitab-color-theme-picker__head {
    padding-top: 0;
  }
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-color-theme-picker {
    --wikitab-page-gutter: var(--spacing-400);
  }

  [data-skin='desktop'] .wikitab-color-theme-picker__column {
    max-width: 640px;
  }
}
</style>
