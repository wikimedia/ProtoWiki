<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconMenu } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import PrototypeChromeMenuPopover from '@/components/PrototypeChromeMenuPopover.vue'
import TopicPickerView from './TopicPickerView.vue'
import SuggestedEditsFeed from './SuggestedEditsFeed.vue'
import TopicSuggestedEditsMenuPanel from './TopicSuggestedEditsMenuPanel.vue'
import { useTopicSuggestedEdits } from './useTopicSuggestedEdits'

definePage({
  meta: {
    title: 'Topic suggested edits',
    description:
      'Pick topics you care about, then browse live edit suggestions for those pages and related articles.',
  },
})

const { step } = useTopicSuggestedEdits()
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
            <TopicSuggestedEditsMenuPanel />
          </template>
        </PrototypeChromeMenuPopover>
      </template>

      <div class="topic-suggested-edits">
        <TopicPickerView v-if="step === 'topics'" />
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
  /* MobileWrapper uses min-height: 100vh above 480px — that can exceed 100dvh. */
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
