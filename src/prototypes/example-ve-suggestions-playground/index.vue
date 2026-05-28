<script setup lang="ts">
import {
  CdxButton,
  CdxField,
  CdxMessage,
  CdxProgressIndicator,
  CdxTextInput,
} from '@wikimedia/codex'

import PlainWrapper from '@/components/PlainWrapper.vue'

import SuggestionCard from './SuggestionCard.vue'
import { useVeSuggestionsPlayground } from './useVeSuggestionsPlayground'

definePage({
  meta: {
    title: 'Edit suggestions',
    description: 'Get edit suggestions for any page',
  },
})

const {
  pageTitle,
  cards,
  methodErrors,
  progress,
  loading,
  error,
  hasRun,
  primaryButtonLabel,
  onPrimaryAction,
} = useVeSuggestionsPlayground()
</script>

<template>
  <PlainWrapper heading="Edit suggestions">
    <div class="edit-suggestions">
      <form class="edit-suggestions__controls" @submit.prevent="onPrimaryAction">
        <CdxField label="Page title">
          <CdxTextInput
            v-model="pageTitle"
            placeholder="Enter a page title"
            autocomplete="off"
            :disabled="loading"
          />
        </CdxField>
        <div class="edit-suggestions__actions">
          <CdxButton type="submit" :disabled="loading">
            {{ primaryButtonLabel }}
          </CdxButton>
          <CdxProgressIndicator v-if="loading" aria-label="Loading suggestions" />
          <span v-if="loading" class="edit-suggestions__progress">
            Method {{ progress.completed }} / {{ progress.total }}
          </span>
        </div>
      </form>

      <CdxMessage v-if="error" type="error">
        {{ error }}
      </CdxMessage>

      <section v-if="methodErrors.length > 0" class="edit-suggestions__method-errors">
        <h2 class="edit-suggestions__section-heading">Method errors</h2>
        <ul>
          <li v-for="item in methodErrors" :key="item.methodName">
            <strong>{{ item.methodName }}:</strong> {{ item.message }}
          </li>
        </ul>
      </section>

      <section v-if="cards.length > 0" class="edit-suggestions__cards">
        <SuggestionCard v-for="card in cards" :key="card.cardId" :card="card" />
      </section>

      <p v-else-if="hasRun && !loading" class="edit-suggestions__empty">
        No suggestions found for this page.
      </p>

      <p v-else-if="!hasRun && !loading" class="edit-suggestions__empty">
        Enter a page title and press Load.
      </p>
    </div>
  </PlainWrapper>
</template>

<style scoped>
.edit-suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
}

.edit-suggestions__controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
}

.edit-suggestions__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75, 12px);
}

.edit-suggestions__progress {
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.edit-suggestions__empty {
  margin: 0;
}

.edit-suggestions__section-heading {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-medium);
}

.edit-suggestions__method-errors ul {
  margin: 0;
  padding-inline-start: var(--spacing-150, 24px);
}

.edit-suggestions__cards {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}
</style>
