<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { CdxButton, CdxIcon, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { WIKITAB_CONFIGURE_MODULES, type WikitabModuleId } from './sections'

const props = defineProps<{
  isHidden: (id: WikitabModuleId) => boolean
}>()

const emit = defineEmits<{
  close: []
  show: [id: WikitabModuleId]
  hide: [id: WikitabModuleId]
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

function onToggle(id: WikitabModuleId, visible: boolean): void {
  if (visible) emit('show', id)
  else emit('hide', id)
}

const SCROLL_LOCK_CLASS = 'wikitab-configure-open'

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
  <div class="wikitab-configure-panel" role="dialog" aria-modal="true" aria-label="Modules">
    <div class="wikitab-configure-panel__column">
      <header class="wikitab-configure-panel__head">
        <h2 class="wikitab-configure-panel__title">Modules</h2>
        <CdxButton
          class="wikitab-configure-panel__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          @click="emit('close')"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </header>

      <ul class="wikitab-configure-panel__list">
        <li
          v-for="module in WIKITAB_CONFIGURE_MODULES"
          :key="module.id"
          class="wikitab-configure-panel__row"
        >
          <CdxToggleSwitch
            :model-value="!props.isHidden(module.id)"
            @update:model-value="onToggle(module.id, $event)"
          >
            {{ module.heading }}
          </CdxToggleSwitch>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
:global(html.wikitab-configure-open) {
  overflow: hidden;
  scrollbar-gutter: auto;
}

.wikitab-configure-panel {
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

.wikitab-configure-panel__column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
  width: min(100%, 17.5rem);
  max-width: 17.5rem;
  margin-inline: auto;
}

.wikitab-configure-panel__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  width: 100%;
  padding-top: var(--spacing-200);
}

.wikitab-configure-panel__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-configure-panel__close {
  flex-shrink: 0;
  width: 2.75rem;
}

.wikitab-configure-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  margin: 0;
  padding: 0 0 var(--spacing-400);
  list-style: none;
}

.wikitab-configure-panel__row {
  margin: 0;
}

.wikitab-configure-panel__row :deep(.cdx-toggle-switch) {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.wikitab-configure-panel__row :deep(.cdx-toggle-switch__label) {
  flex: 1 1 auto;
  min-width: 0;
}

.wikitab-configure-panel__row :deep(.cdx-toggle-switch__switch) {
  flex-shrink: 0;
}

@media (max-width: 639px) {
  .wikitab-configure-panel {
    padding: 0;
  }

  .wikitab-configure-panel__column {
    width: 100%;
    max-width: none;
    padding-top: var(--spacing-150);
  }

  .wikitab-configure-panel__head {
    padding-top: 0;
    padding-inline: var(--spacing-100);
  }

  .wikitab-configure-panel__list {
    padding-inline: var(--spacing-100);
  }
}

@media (min-width: 640px) and (max-width: 767px) {
  [data-skin='desktop'] .wikitab-configure-panel {
    padding-top: 0;
  }

  [data-skin='desktop'] .wikitab-configure-panel__column {
    width: min(100%, 17.5rem);
    max-width: 17.5rem;
    padding-top: var(--spacing-150);
  }

  [data-skin='desktop'] .wikitab-configure-panel__head {
    padding-top: 0;
  }
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-configure-panel {
    --wikitab-page-gutter: var(--spacing-400);
  }
}
</style>
