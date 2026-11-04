<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxAccordion, CdxCheckbox, CdxSelect, CdxTable, CdxTextInput } from '@wikimedia/codex'

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

const tableColumns = [
  { id: 'field', label: 'Field', width: '28%' },
  { id: 'type', label: 'Type', width: '28%' },
  { id: 'value', label: 'Value', width: '44%' },
]

const tableData = computed(() =>
  tableProperties.value.map((prop) => ({
    id: `component-${prop.name}`,
    field: `${prop.name}${prop.optional ? '?' : ''}`,
    type: prop.type,
    rowKind: 'options' as const,
    name: prop.name,
    propType: prop.type,
  })),
)

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
        <CdxTable
          class="wikitab-card-type-preview__table"
          caption="WikitabCard fields"
          hide-caption
          :columns="tableColumns"
          :data="tableData"
          :show-vertical-borders="false"
        >
          <template #item-field="{ row }">
            <code :class="playgroundFieldRowClass(row.rowKind)">{{ row.field }}</code>
          </template>

          <template #item-type="{ row }">
            <code class="wikitab-card-type-preview__type-cell">{{ row.type }}</code>
          </template>

          <template #item-value="{ row }">
            <CdxCheckbox
              v-if="componentPlaygroundFieldUsesCheckbox(row.name, row.propType)"
              :model-value="fields[row.name] === 'true'"
              @update:model-value="onCheckbox(row.name, $event)"
            />
            <textarea
              v-else-if="componentPlaygroundFieldUsesTextarea(row.name)"
              class="wikitab-card-type-preview__textarea"
              :value="fields[row.name] ?? ''"
              :rows="playgroundFieldTextareaRows(fields[row.name] ?? '')"
              @input="onFieldInput(row.name, ($event.target as HTMLTextAreaElement).value)"
            />
            <CdxSelect
              v-else-if="componentPlaygroundFieldUsesSelect(row.name, row.propType)"
              :selected="fields[row.name] ?? ''"
              :menu-items="fieldSelectMenuItems({ name: row.name, type: row.propType })"
              @update:selected="onSelect(row.name, $event)"
            />
            <CdxTextInput
              v-else
              :model-value="fields[row.name] ?? ''"
              @update:model-value="onFieldInput(row.name, $event)"
            />
          </template>
        </CdxTable>
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
  position: sticky;
  top: var(--spacing-100);
  align-self: flex-start;
  z-index: 1;
  background-color: var(--background-color-base);
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
  max-width: 100%;
  overflow-x: hidden;
}

.wikitab-card-type-preview__table {
  width: 100%;
  max-width: 100%;
}

.wikitab-card-type-preview__table :deep(th),
.wikitab-card-type-preview__table :deep(td) {
  padding: var(--spacing-50) var(--spacing-75);
  vertical-align: middle;
  word-break: break-word;
}

.wikitab-card-type-preview__table :deep(td:last-child) .cdx-text-input,
.wikitab-card-type-preview__table :deep(td:last-child) .cdx-select {
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

.wikitab-card-type-preview__table :deep(tr:has(.wikitab-card-type-preview__row--options)) td {
  background-color: var(--background-color-base, #fff);
}
</style>
