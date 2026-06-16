<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CdxButton,
  CdxButtonGroup,
  CdxDialog,
  CdxField,
  CdxSelect,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconAdd, cdxIconSearch } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

definePage({
  meta: {
    title: 'Example: Codex kitchen sink',
    description: 'Quick visual regression surface for border radius and grouped controls.',
  },
})

const searchQuery = ref('')
const chosenProject = ref('wikipedia')
const isDialogOpen = ref(false)
const denseMode = ref(false)

const projectOptions = [
  { label: 'Wikipedia', value: 'wikipedia' },
  { label: 'Wikidata', value: 'wikidata' },
  { label: 'Commons', value: 'commons' },
]

const actionButtons = computed(() => [
  { value: 'edit', label: 'Edit' },
  { value: 'history', label: 'History' },
  { value: 'watch', label: 'Watch', disabled: denseMode.value },
])

const filterButtons = computed(() => [
  { value: 'all', label: 'All' },
  { value: 'newcomers', label: 'Newcomers' },
  { value: 'mobile', label: 'Mobile edits' },
  { value: 'needs-review', label: 'Needs review' },
])

const selectedAction = ref<string | number>('edit')
const selectedFilter = ref<string | number>('all')

const primaryAction = computed(() => ({
  label: 'Apply changes',
  actionType: 'progressive' as const,
}))
</script>

<template>
  <ChromeWrapper>
    <SpecialPageWrapper title="Codex UI regression kitchen sink">
      <section class="kitchen-sink__grid" aria-label="Codex radius checks">
        <article class="kitchen-sink__card">
          <h2 class="kitchen-sink__title">Inputs and compact controls</h2>
          <p class="kitchen-sink__description">
            Use this block to compare rounded corners across input fields and buttons.
          </p>

          <CdxField>
            <template #label>Search article</template>
            <CdxTextInput
              v-model="searchQuery"
              :start-icon="cdxIconSearch"
              placeholder="Try 'Button group'"
            />
          </CdxField>

          <CdxField>
            <template #label>Project</template>
            <CdxSelect v-model:selected="chosenProject" :menu-items="projectOptions" />
          </CdxField>

          <CdxButtonGroup
            class="kitchen-sink__button-group"
            :buttons="actionButtons"
            @click="selectedAction = $event"
          />
          <p class="kitchen-sink__selection">Selected action: {{ selectedAction }}</p>
        </article>

        <article class="kitchen-sink__card">
          <h2 class="kitchen-sink__title">Long one-line button-group labels</h2>
          <p class="kitchen-sink__description">
            This row intentionally stresses first/last button edge rounding.
          </p>

          <CdxButtonGroup
            class="kitchen-sink__button-group"
            :buttons="filterButtons"
            @click="selectedFilter = $event"
          />

          <div class="kitchen-sink__actions">
            <CdxButton weight="quiet" @click="denseMode = !denseMode">
              Toggle disabled third button
            </CdxButton>
            <CdxButton action="progressive" @click="isDialogOpen = true">
              Open Dialog
            </CdxButton>
          </div>
          <p class="kitchen-sink__selection">Selected filter: {{ selectedFilter }}</p>
        </article>
      </section>

      <CdxDialog
        v-model:open="isDialogOpen"
        title="Rounded corners in dialog actions"
        close-button-label="Close"
        :dismissable="true"
        :primary-action="primaryAction"
        @primary="isDialogOpen = false"
      >
        <p class="kitchen-sink__dialog-copy">
          Compare button radius in default, quiet, and progressive states while this dialog is open.
        </p>

        <template #footer-text>
          <CdxButton weight="quiet" @click="isDialogOpen = false">
            Cancel
          </CdxButton>
          <CdxButton action="progressive" :icon="cdxIconAdd" @click="isDialogOpen = false">
            Add item
          </CdxButton>
        </template>
      </CdxDialog>
    </SpecialPageWrapper>
  </ChromeWrapper>
</template>

<style scoped>
.kitchen-sink__grid {
  display: grid;
  gap: var(--spacing-100);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: start;
}

.kitchen-sink__card {
  padding: var(--spacing-100);
  border: var(--border-base);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
}

.kitchen-sink__title {
  margin: 0;
  font-size: var(--font-size-large);
}

.kitchen-sink__description {
  margin: var(--spacing-50) 0 var(--spacing-100);
  color: var(--color-subtle);
}

.kitchen-sink__button-group {
  margin-top: var(--spacing-75);
}

.kitchen-sink__actions {
  margin-top: var(--spacing-100);
  display: flex;
  gap: var(--spacing-50);
  flex-wrap: wrap;
}

.kitchen-sink__selection {
  margin: var(--spacing-75) 0 0;
  color: var(--color-subtle);
}

.kitchen-sink__dialog-copy {
  margin: 0;
}
</style>
