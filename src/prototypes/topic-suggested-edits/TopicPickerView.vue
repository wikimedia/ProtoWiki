<script setup lang="ts">
import { ref } from 'vue'
import {
  CdxButton,
  CdxIcon,
  CdxMessage,
  CdxProgressIndicator,
  CdxTextInput,
  CdxToggleButton,
} from '@wikimedia/codex'
import { cdxIconArrowNext } from '@wikimedia/codex-icons'

import { useConfig } from '@/composables/useConfig'
import { useTopicSuggestedEdits } from './useTopicSuggestedEdits'

const { displayName } = useConfig()
const {
  topicPills,
  selectedTopics,
  addTopicError,
  canContinue,
  toggleTopic,
  resolveAndAddTopic,
  goToFeed,
} = useTopicSuggestedEdits()

const topicInput = ref('')
const isAdding = ref(false)

async function onAddTopic(): Promise<void> {
  const input = topicInput.value
  if (!input.trim() || isAdding.value) return

  isAdding.value = true
  try {
    const added = await resolveAndAddTopic(input)
    if (added) {
      topicInput.value = ''
    }
  } finally {
    isAdding.value = false
  }
}

function onAddKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    void onAddTopic()
  }
}
</script>

<template>
  <div class="topic-picker">
    <div class="topic-picker__content">
      <div class="topic-picker__welcome" role="heading" aria-level="1">
        Hello again, {{ displayName }}
      </div>
      <p class="topic-picker__subtitle">What do you want to help with today?</p>

      <div class="topic-picker__add-row">
        <CdxTextInput
          v-model="topicInput"
          class="topic-picker__add-input"
          :disabled="isAdding"
          @keydown="onAddKeydown"
        />
        <CdxButton
          class="topic-picker__add-button"
          :disabled="!topicInput.trim() || isAdding"
          @click="onAddTopic"
        >
          <template v-if="isAdding">
            <CdxProgressIndicator />
          </template>
          <template v-else>Add</template>
        </CdxButton>
      </div>

      <div v-if="topicPills.length" class="topic-picker__chips">
        <CdxToggleButton
          v-for="topic in topicPills"
          :key="topic"
          :model-value="selectedTopics.includes(topic)"
          @update:model-value="(selected) => toggleTopic(topic, selected)"
        >
          {{ topic }}
        </CdxToggleButton>
      </div>

      <CdxMessage v-if="addTopicError" type="error">
        {{ addTopicError }}
      </CdxMessage>
    </div>

    <div class="topic-picker__footer">
      <CdxButton
        class="topic-picker__continue"
        weight="primary"
        action="progressive"
        size="large"
        :icon-only="true"
        aria-label="Continue to suggestions"
        :disabled="!canContinue"
        @click="goToFeed"
      >
        <CdxIcon :icon="cdxIconArrowNext" size="large" />
      </CdxButton>
    </div>
  </div>
</template>

<style scoped>
.topic-picker {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
  padding: var(--spacing-100, 16px);
  overflow: hidden;
}

.topic-picker__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.topic-picker__welcome {
  margin: 0;
  padding: 0;
  padding-top: var(--spacing-100);
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-small, 1.375);
  border: none;
}

.topic-picker__subtitle {
  margin: 0;
  font-size: var(--font-size-medium, 1rem);
}

.topic-picker__add-row {
  display: flex;
  gap: var(--spacing-50, 8px);
  align-items: center;
}

.topic-picker__add-input {
  flex: 1;
  min-width: 0;
}

.topic-picker__add-button {
  flex-shrink: 0;
}

.topic-picker__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
}

.topic-picker__footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: var(--spacing-150, 24px);
  padding-bottom: calc(var(--spacing-100, 16px) + env(safe-area-inset-bottom, 0px));
}

.topic-picker__continue {
  min-width: 3.5rem;
  min-height: 3.5rem;
}
</style>
