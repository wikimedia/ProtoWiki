<script setup lang="ts">
import {
  CdxButton,
  CdxMessage,
  CdxProgressBar,
  CdxProgressIndicator,
  useToast,
} from '@wikimedia/codex'
import type { StatusType } from '@wikimedia/codex'

import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'

const toast = useToast()

const messageTypes: StatusType[] = ['notice', 'warning', 'error', 'success']

function showToast(type: StatusType) {
  toast.show({ type, message: 'Toast message', autoDismiss: 3000 })
}
</script>

<template>
    <PlaygroundSection title="CdxMessage">
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

    <PlaygroundSection title="CdxProgressBar">
      <PlaygroundGrid min="220px">
        <PlaygroundCell label="default / indeterminate">
          <CdxProgressBar aria-label="Loading" />
        </PlaygroundCell>
        <PlaygroundCell label="inline / indeterminate">
          <CdxProgressBar inline aria-label="Loading" />
        </PlaygroundCell>
        <PlaygroundCell label="determinate / 42">
          <CdxProgressBar :progress="42" aria-label="Progress" />
        </PlaygroundCell>
        <PlaygroundCell label="disabled">
          <CdxProgressBar disabled aria-label="Loading" />
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxProgressIndicator">
      <PlaygroundGrid min="180px">
        <PlaygroundCell label="default">
          <CdxProgressIndicator />
        </PlaygroundCell>
        <PlaygroundCell label="inline">
          <CdxProgressIndicator inline />
        </PlaygroundCell>
        <PlaygroundCell label="in button">
          <CdxButton action="progressive" disabled>
            <CdxProgressIndicator inline />
            Loading
          </CdxButton>
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxToast">
      <PlaygroundGrid min="180px">
        <PlaygroundCell v-for="type in messageTypes" :key="type" :label="type">
          <CdxButton @click="showToast(type)">Show</CdxButton>
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>
</template>
