<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconSuccess } from '@wikimedia/codex-icons'

import OnboardingShell from '../components/OnboardingShell.vue'
import type { FlowState, SurveyChoice } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const OPTIONS: { value: SurveyChoice; label: string }[] = [
  { value: 'read', label: 'Read and explore' },
  { value: 'edit', label: 'Edit and contribute' },
  { value: 'both', label: 'A bit of both' },
]

const selected = computed(() => props.flow.survey.value)

function choose(value: SurveyChoice): void {
  props.flow.survey.value = value
}
</script>

<template>
  <OnboardingShell :current="1" flush-content>
    <div class="ob-page">
      <h1 class="ob-title">What would you like to do on Wikipedia?</h1>

      <div class="ob-body">
        <div
          class="survey__options"
          role="radiogroup"
          aria-label="What would you like to do on Wikipedia?"
        >
          <button
            v-for="option in OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="selected === option.value"
            class="survey__option"
            :class="{ 'survey__option--selected': selected === option.value }"
            @click="choose(option.value)"
          >
            <span v-if="selected === option.value" class="survey__indicator">
              <CdxIcon :icon="cdxIconSuccess" />
            </span>
            <span v-else class="survey__radio" aria-hidden="true" />
            <span class="survey__label">{{ option.label }}</span>
          </button>
        </div>

        <div class="ob-actions">
          <CdxButton weight="quiet" @click="props.flow.goTo('interests')">Skip</CdxButton>
          <CdxButton
            action="progressive"
            weight="primary"
            :disabled="!selected"
            @click="props.flow.goTo('interests')"
          >
            Next
          </CdxButton>
        </div>
      </div>
    </div>
  </OnboardingShell>
</template>

<style scoped>
.survey__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.survey__option {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  width: 100%;
  min-height: 2.75rem;
  padding: var(--spacing-50, 8px) var(--spacing-75, 12px);
  border: var(--border-width-base, 1px) solid var(--border-color-interactive, #72777d);
  border-radius: var(--border-radius-pill, 9999px);
  background-color: var(--background-color-base);
  text-align: start;
  cursor: pointer;
}

.survey__option--selected {
  border-color: var(--color-progressive, #36c);
  background-color: var(--background-color-progressive-subtle, #e8eeff);
}

.survey__radio {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  border: var(--border-width-base, 1px) solid var(--border-color-base, #a2a9b1);
  border-radius: var(--border-radius-circle, 50%);
  background-color: var(--background-color-base);
}

.survey__indicator {
  display: inline-flex;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-success, #177860);
}

.survey__indicator :deep(.cdx-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.survey__label {
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-base);
}
</style>
