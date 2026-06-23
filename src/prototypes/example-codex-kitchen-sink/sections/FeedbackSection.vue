<script setup lang="ts">
import {
  CdxButton,
  CdxInfoChip,
  CdxMessage,
  CdxProgressBar,
  CdxProgressIndicator,
  useToast,
} from '@wikimedia/codex'
import { cdxIconAlert } from '@wikimedia/codex-icons'
import type { StatusType } from '@wikimedia/codex'

import { feedbackSubTabs } from '../lib/component-tabs'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const toast = useToast()

const messageTypes: StatusType[] = ['notice', 'warning', 'error', 'success']

function showToast(type: StatusType) {
  toast.show({ type, message: 'Toast message', autoDismiss: 3000 })
}
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-feedback"
    :items="feedbackSubTabs"
    default-active="info-chip"
    ariaLabel="Feedback"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'info-chip'">
        <div class="info-chip-stack">
          <CdxInfoChip status="notice" :icon="cdxIconAlert">Notice</CdxInfoChip>
          <CdxInfoChip status="warning" :icon="cdxIconAlert">Warning</CdxInfoChip>
          <CdxInfoChip status="error" :icon="cdxIconAlert">Error</CdxInfoChip>
          <CdxInfoChip status="success" :icon="cdxIconAlert">Success</CdxInfoChip>
          <CdxInfoChip status="notice">No icon</CdxInfoChip>
        </div>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'message'">
        <PlaygroundGrid min="280px">
          <PlaygroundCell v-for="type in messageTypes" :key="`${type}-block`" :label="`${type} / block`">
            <CdxMessage :type="type">Message text</CdxMessage>
          </PlaygroundCell>
          <PlaygroundCell v-for="type in messageTypes" :key="`${type}-inline`" :label="`${type} / inline`">
            <CdxMessage :type="type" inline>Message text</CdxMessage>
          </PlaygroundCell>
          <PlaygroundCell label="dismissable">
            <CdxMessage type="notice" allow-user-dismiss dismiss-button-label="Close">
              Message text
            </CdxMessage>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'progress-bar'">
        <PlaygroundGrid min="220px">
          <PlaygroundCell label="default / indeterminate">
            <CdxProgressBar aria-label="Loading" />
          </PlaygroundCell>
          <PlaygroundCell label="inline / indeterminate">
            <CdxProgressBar inline aria-label="Loading" />
          </PlaygroundCell>
          <PlaygroundCell label="determinate / 42">
            <CdxProgressBar :value="42" aria-label="Progress" />
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxProgressBar disabled aria-label="Loading" />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'progress-indicator'">
        <PlaygroundGrid min="180px">
          <PlaygroundCell label="spinner only">
            <CdxProgressIndicator aria-label="Loading" />
          </PlaygroundCell>
          <PlaygroundCell label="with label">
            <CdxProgressIndicator show-label>
              Loading
            </CdxProgressIndicator>
          </PlaygroundCell>
          <PlaygroundCell label="in button">
            <CdxButton action="progressive" disabled>
              <CdxProgressIndicator />
              Loading
            </CdxButton>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'toast'">
        <PlaygroundGrid min="180px">
          <PlaygroundCell v-for="type in messageTypes" :key="type" :label="type">
            <CdxButton @click="showToast(type)">Show</CdxButton>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped>
.info-chip-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-75);
}
</style>
