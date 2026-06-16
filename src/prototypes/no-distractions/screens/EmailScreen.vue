<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxField, CdxTextInput } from '@wikimedia/codex'
import { cdxIconMessage } from '@wikimedia/codex-icons'

import OnboardingShell from '../components/OnboardingShell.vue'
import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const email = ref(props.flow.email.value)

function finish(): void {
  props.flow.goTo('home', { email: email.value })
}
</script>

<template>
  <OnboardingShell :current="3" flush-content>
    <div class="ob-page">
      <h1 class="ob-title">Add your email address</h1>

      <div class="ob-body">
        <CdxField class="ob-field email__field">
          <template #label>
            Email is required to recover your account if you lose your password or log in from a
            unfamiliar location or new browser.
          </template>
          <CdxTextInput
            v-model="email"
            input-type="email"
            :start-icon="cdxIconMessage"
            placeholder="Enter your email address"
            aria-label="Email address"
          />
        </CdxField>

        <div class="ob-actions">
          <CdxButton action="progressive" weight="primary" @click="finish">Go to your Home</CdxButton>
        </div>
      </div>
    </div>
  </OnboardingShell>
</template>

<style scoped>
.email__field {
  margin: 0;
}

.email__field :deep(.cdx-label) {
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
