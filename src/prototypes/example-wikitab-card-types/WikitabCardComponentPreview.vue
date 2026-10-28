<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxAccordion, CdxCheckbox, CdxSelect, CdxTextInput } from '@wikimedia/codex'

import WikitabCard from '../wikitab/WikitabCard.vue'
import {
  componentPlaygroundFieldUsesCheckbox,
  componentPlaygroundFieldUsesSelect,
  componentPlaygroundFieldUsesTextarea,
  defaultWikitabCardComponentFieldValues,
  fieldSelectMenuItems,
  playgroundFieldRowClass,
  playgroundFieldTextareaRows,
  previewModelForWikitabCardComponent,
  wikitabCardComponentPlaygroundProperties,
} from '../wikitab/data/wikitabCardTypePlayground'
import '../wikitab/wikitab-surface.css'

const props = withDefaults(
  defineProps<{
    initialFields?: Record<string, string>
    defaultOpen?: boolean
  }>(),
  { initialFields: () => ({}), defaultOpen: true },
)

const fieldsOpen = ref(props.defaultOpen)

const fields = ref({ ...defaultWikitabCardComponentFieldValues(), ...props.initialFields })

const tableProperties = computed(() => wikitabCardComponentPlaygroundProperties())

const preview = computed(() => previewModelForWikitabCardComponent(fields.value))

function onCheckbox(name: string, checked: boolean) {
  fields.value[name] = checked ? 'true' : 'false'
}

function onFieldInput(name: string, value: string) {
  fields.value[name] = value
}

function onSelect(name: string, value: string | number | null) {
  if (value === null || value === undefined) return
  fields.value[name] = String(value)
}
</script>

<template>
  <div class="wikitab-card-type-preview">
    <div class="wikitab-card-type-preview__card">
      <div class="wikitab wikitab-card-type-preview__wikitab">
        <WikitabCard v-bind="preview.props" />
      </div>
    </div>

    <CdxAccordion
      v-model="fieldsOpen"
      separation="minimal"
      class="wikitab-card-type-preview__fields"
    >
      <template #title>Fields</template>
      <div class="wikitab-card-type-preview__table-wrap">
        <table class="wikitab-card-type-preview__table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Type</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="prop in tableProperties"
              :key="`component-${prop.name}`"
              :class="playgroundFieldRowClass('options')"
            >
              <td>
                <code>{{ prop.name }}{{ prop.optional ? '?' : '' }}</code>
              </td>
              <td>
                <code class="wikitab-card-type-preview__type-cell">{{ prop.type }}</code>
              </td>
              <td>
                <CdxCheckbox
                  v-if="componentPlaygroundFieldUsesCheckbox(prop.name, prop.type)"
                  :model-value="fields[prop.name] === 'true'"
                  @update:model-value="onCheckbox(prop.name, $event)"
                />
                <textarea
                  v-else-if="componentPlaygroundFieldUsesTextarea(prop.name)"
                  class="wikitab-card-type-preview__textarea"
                  :value="fields[prop.name] ?? ''"
                  :rows="playgroundFieldTextareaRows(fields[prop.name] ?? '')"
                  @input="onFieldInput(prop.name, ($event.target as HTMLTextAreaElement).value)"
                />
                <CdxSelect
                  v-else-if="componentPlaygroundFieldUsesSelect(prop.name, prop.type)"
                  :selected="fields[prop.name] ?? ''"
                  :menu-items="fieldSelectMenuItems(prop)"
                  @update:selected="onSelect(prop.name, $event)"
                />
                <CdxTextInput
                  v-else
                  :model-value="fields[prop.name] ?? ''"
                  @update:model-value="onFieldInput(prop.name, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CdxAccordion>
  </div>
</template>

<style scoped>
.wikitab-card-type-preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 0;
  max-width: 100%;
}

.wikitab-card-type-preview__card {
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
}

.wikitab-card-type-preview__wikitab {
  width: 26rem;
  max-width: 100%;
}

.wikitab-card-type-preview__fields {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.wikitab-card-type-preview__fields :deep(.cdx-accordion__content) {
  min-width: 0;
  max-width: 100%;
  padding-top: var(--spacing-75);
}

.wikitab-card-type-preview__table-wrap {
  overflow-x: auto;
  max-width: 100%;
}

.wikitab-card-type-preview__table {
  width: 100%;
  min-width: 32rem;
  border-collapse: collapse;
  table-layout: fixed;
}

.wikitab-card-type-preview__table th,
.wikitab-card-type-preview__table td {
  padding: var(--spacing-50) var(--spacing-75);
  border: var(--border-width-base) solid var(--border-color-subtle);
  text-align: start;
  vertical-align: middle;
}

.wikitab-card-type-preview__table th {
  background: var(--background-color-neutral-subtle);
}

.wikitab-card-type-preview__table th:nth-child(1),
.wikitab-card-type-preview__table td:nth-child(1) {
  width: 28%;
  word-break: break-word;
}

.wikitab-card-type-preview__table th:nth-child(2),
.wikitab-card-type-preview__table td:nth-child(2) {
  width: 28%;
  word-break: break-word;
}

.wikitab-card-type-preview__table th:nth-child(3),
.wikitab-card-type-preview__table td:nth-child(3) {
  width: 44%;
  min-width: 0;
}

.wikitab-card-type-preview__table td:last-child :deep(.cdx-text-input),
.wikitab-card-type-preview__table td:last-child :deep(.cdx-select) {
  max-width: 100%;
}

.wikitab-card-type-preview__textarea {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 3.25rem;
  padding: var(--spacing-50);
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  font-family: var(--font-family-monospace);
  font-size: 0.875rem;
  line-height: 1.4;
  resize: vertical;
}

.wikitab-card-type-preview__row--options td {
  background-color: var(--background-color-base, #fff);
}
</style>
