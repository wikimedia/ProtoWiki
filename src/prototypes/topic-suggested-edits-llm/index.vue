<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import PrototypeChromeMenuPopover from '@/components/PrototypeChromeMenuPopover.vue'
import LlmTopicPickerView from './LlmTopicPickerView.vue'
import SuggestedEditsFeed from './SuggestedEditsFeed.vue'
import LlmTopicSuggestedEditsMenuPanel from './LlmTopicSuggestedEditsMenuPanel.vue'
import { useLlmQuickSuggestions } from './useLlmQuickSuggestions'
import { useLlmTopicSuggestedEdits } from './useLlmTopicSuggestedEdits'

definePage({
  meta: {
    title: 'Topic suggested edits (LLM)',
    description:
      'Describe an interest in plain language; an LLM picks Wikipedia pages, then live edit suggestions load from those articles only.',
  },
})

const { step } = useLlmTopicSuggestedEdits()
const { bindSettingsPopoverClose, unbindSettingsPopoverClose, ensureQuickSuggestions } =
  useLlmQuickSuggestions()

onMounted(() => {
  bindSettingsPopoverClose()
  ensureQuickSuggestions()
})

onUnmounted(() => {
  unbindSettingsPopoverClose()
})
</script>

<template>
  <MobileWrapper class="topic-suggested-edits-shell">
    <ChromeWrapper skin="mobile" :last-edited-notice="false" :show-footer="false">
      <template #menu>
        <PrototypeChromeMenuPopover>
          <template #default="{ toggle, open }">
            <CdxButton
              weight="quiet"
              size="large"
              aria-label="Main menu"
              :aria-expanded="open"
              @click="toggle"
            >
              <CdxIcon :icon="cdxIconMenu" size="large" />
            </CdxButton>
          </template>
          <template #panel>
            <LlmTopicSuggestedEditsMenuPanel />
          </template>
        </PrototypeChromeMenuPopover>
      </template>

      <div class="topic-suggested-edits">
        <LlmTopicPickerView v-if="step === 'topics'" />
        <SuggestedEditsFeed v-else />
      </div>
    </ChromeWrapper>
  </MobileWrapper>
</template>

<style scoped>
.topic-suggested-edits-shell {
  box-sizing: border-box;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

@media (min-width: 480px) {
  .topic-suggested-edits-shell {
    min-height: 0;
    height: 100dvh;
    max-height: 100dvh;
  }
}

.topic-suggested-edits-shell :deep(.mobile-wrapper__column) {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.topic-suggested-edits-shell :deep(.chrome-wrapper) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.topic-suggested-edits-shell :deep(.chrome-wrapper__content) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.topic-suggested-edits {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
