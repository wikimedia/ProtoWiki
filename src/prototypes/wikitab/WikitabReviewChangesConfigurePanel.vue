<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { CdxButton, CdxIcon, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

const props = defineProps<{
  showSavedEdits: boolean
  showRecentRiskyEdits: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:showSavedEdits': [value: boolean]
  'update:showRecentRiskyEdits': [value: boolean]
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

const SCROLL_LOCK_CLASS = 'wikitab-review-changes-configure-open'

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
  <div
    class="wikitab-review-changes-configure-panel wikitab-panel"
    role="dialog"
    aria-modal="true"
    aria-label="Review changes"
  >
    <div class="wikitab-review-changes-configure-panel__column">
      <header class="wikitab-review-changes-configure-panel__head">
        <h2 class="wikitab-review-changes-configure-panel__title">Review changes</h2>
        <CdxButton
          class="wikitab-review-changes-configure-panel__close"
          weight="quiet"
          :icon-only="true"
          aria-label="Close"
          @click="emit('close')"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </header>

      <div class="wikitab-review-changes-configure-panel__toggles">
        <CdxToggleSwitch
          class="wikitab-review-changes-configure-panel__toggle"
          :model-value="props.showSavedEdits"
          @update:model-value="emit('update:showSavedEdits', $event)"
        >
          Show edits from saved articles
        </CdxToggleSwitch>
        <CdxToggleSwitch
          class="wikitab-review-changes-configure-panel__toggle"
          :model-value="props.showRecentRiskyEdits"
          @update:model-value="emit('update:showRecentRiskyEdits', $event)"
        >
          Show recent risky edits
        </CdxToggleSwitch>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(html.wikitab-review-changes-configure-open) {
  overflow: hidden;
  scrollbar-gutter: auto;
}

.wikitab-review-changes-configure-panel__column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
  box-sizing: border-box;
  width: min(100%, 640px);
  max-width: 640px;
  margin-inline: auto;
  padding-top: var(--wikitab-chrome-inset);
}

.wikitab-review-changes-configure-panel__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--min-size-interactive-touch);
  padding-top: 0;
}

.wikitab-review-changes-configure-panel__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--wikitab-theme-fg, var(--color-base));
}

.wikitab-review-changes-configure-panel__close {
  flex-shrink: 0;
  width: var(--min-size-interactive-touch);
  min-width: var(--min-size-interactive-touch);
  height: var(--min-size-interactive-touch);
  min-height: var(--min-size-interactive-touch);
}

.wikitab-review-changes-configure-panel__toggles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  padding-bottom: var(--spacing-400);
}

.wikitab-review-changes-configure-panel__toggle {
  width: 100%;
}

.wikitab-review-changes-configure-panel__toggle :deep(.cdx-toggle-switch) {
  width: 100%;
}

.wikitab-review-changes-configure-panel__toggle :deep(.cdx-toggle-switch__label) {
  flex: 1;
  min-width: 0;
}

@media (max-width: 767px) {
  .wikitab-review-changes-configure-panel {
    padding: 0;
  }

  .wikitab-review-changes-configure-panel__column {
    width: 100%;
    min-width: 0;
    max-width: none;
  }

  .wikitab-review-changes-configure-panel__head {
    padding-inline: var(--spacing-100);
  }

  .wikitab-review-changes-configure-panel__toggles {
    padding-inline: var(--spacing-100);
  }
}

@media (min-width: 768px) {
  [data-skin='desktop'] .wikitab-review-changes-configure-panel {
    --wikitab-page-gutter: var(--spacing-400);
    padding-inline: 0;
    padding-block-start: var(--spacing-100);
    padding-block-end: 0;
  }

  [data-skin='desktop'] .wikitab-review-changes-configure-panel__column {
    padding-top: 0;
    padding-inline: var(--wikitab-page-gutter);
  }

  [data-skin='desktop'] .wikitab-review-changes-configure-panel__head {
    padding-top: var(--spacing-200);
    padding-inline: 0;
  }

  [data-skin='desktop'] .wikitab-review-changes-configure-panel__toggles {
    padding-inline: 0;
  }
}
</style>
