<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import WikitabConfigureModuleList from './WikitabConfigureModuleList.vue'
import type { WikitabModuleId } from './sections'

const props = defineProps<{
  moduleOrder: WikitabModuleId[]
  isHidden: (id: WikitabModuleId) => boolean
}>()

const emit = defineEmits<{
  close: []
  show: [id: WikitabModuleId]
  hide: [id: WikitabModuleId]
  reorder: [order: WikitabModuleId[]]
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
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
  <div class="wikitab-configure-panel wikitab-panel" role="dialog" aria-modal="true" aria-label="Modules">
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

      <WikitabConfigureModuleList
        :order="props.moduleOrder"
        :is-hidden="props.isHidden"
        @show="emit('show', $event)"
        @hide="emit('hide', $event)"
        @reorder="emit('reorder', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
:global(html.wikitab-configure-open) {
  overflow: hidden;
  scrollbar-gutter: auto;
}

.wikitab-configure-panel__column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
  box-sizing: border-box;
  width: min(100%, 640px);
  max-width: 640px;
  margin-inline: auto;
  padding-top: var(--wikitab-chrome-inset);
}

.wikitab-configure-panel__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--min-size-interactive-touch);
  padding-top: 0;
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
  width: var(--min-size-interactive-touch);
  min-width: var(--min-size-interactive-touch);
  height: var(--min-size-interactive-touch);
  min-height: var(--min-size-interactive-touch);
}

@media (max-width: 767px) {
  .wikitab-configure-panel {
    padding: 0;
  }

  .wikitab-configure-panel__column {
    width: 100%;
    min-width: 0;
    max-width: none;
  }

  .wikitab-configure-panel__head {
    padding-inline: var(--spacing-100);
  }
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-configure-panel {
    --wikitab-page-gutter: var(--spacing-400);
    padding-inline: 0;
    padding-block-start: var(--spacing-100);
    padding-block-end: 0;
  }

  [data-skin='desktop'] .wikitab-configure-panel__column {
    padding-top: 0;
    padding-inline: var(--wikitab-page-gutter);
  }

  [data-skin='desktop'] .wikitab-configure-panel__head {
    padding-top: var(--spacing-200);
    padding-inline: 0;
  }
}
</style>
