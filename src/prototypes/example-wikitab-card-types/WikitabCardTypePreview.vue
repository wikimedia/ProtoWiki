<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxAccordion, CdxCheckbox, CdxSelect, CdxTable, CdxTextInput } from '@wikimedia/codex'

import WikitabCard from '../wikitab/WikitabCard.vue'
import WikitabSearchLoadingCard from '../wikitab/WikitabSearchLoadingCard.vue'
import WikitabSearchResultCard from '../wikitab/WikitabSearchResultCard.vue'
import type { WikitabCardCatalogEntry, WikitabCardTypeSchema } from '../wikitab/data/wikitabCardTypeLinks'
import {
  defaultFieldValues,
  defaultPlaygroundBindFieldValues,
  fieldSelectMenuItems,
  fieldUsesCheckbox,
  fieldUsesSelect,
  fieldUsesTextarea,
  orderPlaygroundPayloadProperties,
  playgroundBindFieldUsesSelect,
  playgroundFieldTextareaRows,
  playgroundBindFieldUsesTextarea,
  playgroundFieldRowClass,
  playgroundPayloadFieldKind,
  playgroundPresentationFieldRows,
  playgroundRuntimeBindFieldEditable,
  playgroundRuntimeFieldRows,
  previewModelForEntry,
  runtimeFieldUsesSelect,
  schemaVariantKey,
  type WikitabCardTypeFieldRowKind,
} from '../wikitab/data/wikitabCardTypePlayground'
import '../wikitab/wikitab-surface.css'

const props = defineProps<{
  entry: WikitabCardCatalogEntry
  schema: WikitabCardTypeSchema
  schemaIndex: number
}>()

const variantKey = computed(() => schemaVariantKey(props.entry.id, props.schemaIndex))

const fields = ref(
  defaultFieldValues(props.entry.id, props.schema, props.schemaIndex),
)

const bindFields = ref(defaultPlaygroundBindFieldValues(props.entry))

const tableProperties = computed(() =>
  orderPlaygroundPayloadProperties(props.schema.properties, props.entry),
)

const optionPayloadProperties = computed(() =>
  tableProperties.value.filter(
    (prop) => playgroundPayloadFieldKind(prop.name, props.entry) === 'options',
  ),
)

const customPayloadProperties = computed(() =>
  tableProperties.value.filter(
    (prop) => playgroundPayloadFieldKind(prop.name, props.entry) === 'custom',
  ),
)

const preview = computed(() =>
  previewModelForEntry(props.entry, props.schema, fields.value, bindFields.value),
)

const presentationFieldRows = computed(() => playgroundPresentationFieldRows(props.entry))

const runtimeFieldRows = computed(() =>
  playgroundRuntimeFieldRows(props.entry, props.schema, fields.value, bindFields.value),
)

/** Field names already edited or shown above — omit from runtime rows to avoid duplicates. */
const playgroundCoveredFieldNames = computed(() => {
  const names = new Set<string>()
  for (const prop of optionPayloadProperties.value) names.add(prop.name)
  for (const prop of customPayloadProperties.value) names.add(prop.name)
  for (const row of presentationFieldRows.value) names.add(row.name)
  return names
})

const runtimeOptionRows = computed(() =>
  runtimeFieldRows.value.filter(
    (row) => row.rowKind === 'options' && !playgroundCoveredFieldNames.value.has(row.name),
  ),
)

const runtimeHardcodedRows = computed(() =>
  runtimeFieldRows.value.filter(
    (row) => row.rowKind === 'inferred' && !playgroundCoveredFieldNames.value.has(row.name),
  ),
)

type FieldEditorKind =
  | 'payload'
  | 'runtime-bind'
  | 'runtime-readonly'
  | 'presentation'

interface FieldTableRow {
  id: string
  field: string
  type: string
  rowKind: WikitabCardTypeFieldRowKind
  editor: FieldEditorKind
  name: string
  propType: string
  optional?: boolean
  runtimeValue?: string
}

const tableColumns = [
  { id: 'field', label: 'Field', width: '28%' },
  { id: 'type', label: 'Type', width: '28%' },
  { id: 'value', label: 'Value', width: '44%' },
]

const tableData = computed((): FieldTableRow[] => {
  const rows: FieldTableRow[] = []

  for (const prop of optionPayloadProperties.value) {
    rows.push({
      id: `${variantKey.value}-options-${prop.name}`,
      field: `${prop.name}${prop.optional ? '?' : ''}`,
      type: prop.type,
      rowKind: 'options',
      editor: 'payload',
      name: prop.name,
      propType: prop.type,
      optional: prop.optional,
    })
  }

  for (const row of runtimeOptionRows.value) {
    rows.push({
      id: `${variantKey.value}-options-runtime-${row.name}`,
      field: row.name,
      type: row.type,
      rowKind: 'options',
      editor: playgroundRuntimeBindFieldEditable(
        props.entry,
        props.schema,
        fields.value,
        row.name,
      )
        ? 'runtime-bind'
        : 'runtime-readonly',
      name: row.name,
      propType: row.type,
      runtimeValue: row.value,
    })
  }

  for (const prop of customPayloadProperties.value) {
    rows.push({
      id: `${variantKey.value}-custom-${prop.name}`,
      field: `${prop.name}${prop.optional ? '?' : ''}`,
      type: prop.type,
      rowKind: 'custom',
      editor: 'payload',
      name: prop.name,
      propType: prop.type,
      optional: prop.optional,
    })
  }

  for (const row of presentationFieldRows.value) {
    rows.push({
      id: `${variantKey.value}-presentation-${row.name}`,
      field: `${row.name}${row.optional ? '?' : ''}`,
      type: row.type,
      rowKind: 'hardcoded',
      editor: 'presentation',
      name: row.name,
      propType: row.type,
      optional: row.optional,
      runtimeValue: row.value,
    })
  }

  for (const row of runtimeHardcodedRows.value) {
    rows.push({
      id: `${variantKey.value}-hardcoded-runtime-${row.name}`,
      field: row.name,
      type: row.type,
      rowKind: 'hardcoded',
      editor: playgroundRuntimeBindFieldEditable(
        props.entry,
        props.schema,
        fields.value,
        row.name,
      )
        ? 'runtime-bind'
        : 'runtime-readonly',
      name: row.name,
      propType: row.type,
      runtimeValue: row.value,
    })
  }

  return rows
})

const previewComponent = computed(() => {
  switch (preview.value?.component) {
    case 'WikitabCard':
      return WikitabCard
    case 'WikitabSearchResultCard':
      return WikitabSearchResultCard
    case 'WikitabSearchLoadingCard':
      return WikitabSearchLoadingCard
    default:
      return null
  }
})

const previewBindProps = computed(() => preview.value?.props ?? {})

function onCheckbox(name: string, checked: boolean) {
  fields.value[name] = checked ? 'true' : 'false'
}

function onFieldInput(name: string, value: string) {
  fields.value[name] = value
}

function onSelect(name: string, value: string | number | null) {
  if (value === null || value === undefined) return
  const next = String(value)
  fields.value[name] = next
}

function onBindFieldInput(name: string, value: string) {
  bindFields.value[name] = value
}

function onBindSelect(name: string, value: string | number | null) {
  if (value === null || value === undefined) return
  bindFields.value[name] = String(value)
}

function readonlyValueUsesTextarea(value: string, multiline?: boolean): boolean {
  return !!multiline && value.includes('\n')
}

function payloadProp(row: FieldTableRow) {
  return { name: row.name, type: row.propType, optional: row.optional }
}

function runtimeSelectRow(row: FieldTableRow) {
  return { name: row.name, type: row.propType, value: row.runtimeValue ?? '' }
}
</script>

<template>
  <div class="wikitab-card-type-preview">
    <div
      v-if="preview && previewComponent"
      class="wikitab-card-type-preview__card"
      :class="{ 'wikitab-card-type-preview__card--wide': preview.component === 'WikitabSearchResultCard' }"
    >
      <div class="wikitab wikitab-card-type-preview__wikitab">
        <component :is="previewComponent" v-bind="previewBindProps" />
      </div>
    </div>
    <p v-else class="wikitab-card-type-preview__missing">No preview for this entry.</p>

    <CdxAccordion separation="minimal" class="wikitab-card-type-preview__fields">
      <template #title>Fields</template>
      <div class="wikitab-card-type-preview__table-wrap">
        <CdxTable
          class="wikitab-card-type-preview__table"
          caption="Card type fields"
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
            <template v-if="row.editor === 'payload'">
              <CdxCheckbox
                v-if="fieldUsesCheckbox(payloadProp(row))"
                :model-value="fields[row.name] === 'true'"
                @update:model-value="onCheckbox(row.name, $event)"
              />
              <textarea
                v-else-if="fieldUsesTextarea(payloadProp(row))"
                class="wikitab-card-type-preview__textarea"
                :value="fields[row.name] ?? ''"
                :rows="playgroundFieldTextareaRows(fields[row.name] ?? '')"
                @input="onFieldInput(row.name, ($event.target as HTMLTextAreaElement).value)"
              />
              <CdxSelect
                v-else-if="fieldUsesSelect(payloadProp(row))"
                :selected="fields[row.name] ?? ''"
                :menu-items="fieldSelectMenuItems(payloadProp(row))"
                @update:selected="onSelect(row.name, $event)"
              />
              <CdxTextInput
                v-else
                :model-value="fields[row.name] ?? ''"
                @update:model-value="onFieldInput(row.name, $event)"
              />
            </template>

            <template v-else-if="row.editor === 'runtime-bind'">
              <textarea
                v-if="playgroundBindFieldUsesTextarea(row.name)"
                class="wikitab-card-type-preview__textarea"
                :value="bindFields[row.name] ?? ''"
                :rows="playgroundFieldTextareaRows(bindFields[row.name] ?? '')"
                @input="onBindFieldInput(row.name, ($event.target as HTMLTextAreaElement).value)"
              />
              <CdxSelect
                v-else-if="playgroundBindFieldUsesSelect(row.name)"
                :selected="bindFields[row.name] ?? ''"
                :menu-items="fieldSelectMenuItems(payloadProp(row))"
                @update:selected="onBindSelect(row.name, $event)"
              />
              <CdxTextInput
                v-else
                :model-value="bindFields[row.name] ?? ''"
                @update:model-value="onBindFieldInput(row.name, $event)"
              />
            </template>

            <template v-else-if="row.editor === 'presentation'">
              <CdxTextInput
                class="wikitab-card-type-preview__readonly-value"
                :model-value="row.runtimeValue ?? ''"
                @update:model-value="() => {}"
              />
            </template>

            <template v-else>
              <textarea
                v-if="readonlyValueUsesTextarea(row.runtimeValue ?? '', true)"
                class="wikitab-card-type-preview__textarea wikitab-card-type-preview__textarea--readonly"
                :value="row.runtimeValue ?? ''"
                :rows="playgroundFieldTextareaRows(row.runtimeValue ?? '')"
                readonly
              />
              <CdxSelect
                v-else-if="runtimeFieldUsesSelect(runtimeSelectRow(row))"
                class="wikitab-card-type-preview__readonly-select"
                :selected="row.runtimeValue ?? ''"
                :menu-items="fieldSelectMenuItems(payloadProp(row))"
                disabled
                @update:selected="() => {}"
              />
              <CdxTextInput
                v-else
                class="wikitab-card-type-preview__readonly-value"
                :model-value="row.runtimeValue ?? ''"
                @update:model-value="() => {}"
              />
            </template>
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

/* Match ~one Wikitab feed column so thumbnail size reads like production. */
.wikitab-card-type-preview__wikitab {
  width: 26rem;
  max-width: 100%;
}

.wikitab-card-type-preview__card--wide .wikitab-card-type-preview__wikitab {
  width: 36rem;
}

.wikitab-card-type-preview__missing {
  margin: 0;
  color: var(--color-subtle);
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

.wikitab-card-type-preview__readonly-value :deep(.cdx-text-input__input) {
  pointer-events: none;
  background-color: var(--background-color-neutral-subtle);
  color: var(--color-subtle);
}

.wikitab-card-type-preview__readonly-select {
  max-width: 100%;
}

.wikitab-card-type-preview__readonly-select :deep(.cdx-select-vue__handle) {
  pointer-events: none;
  background-color: var(--background-color-neutral-subtle);
  color: var(--color-subtle);
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

.wikitab-card-type-preview__textarea--readonly {
  background: var(--background-color-neutral-subtle);
  color: var(--color-subtle);
  resize: none;
}

.wikitab-card-type-preview__table :deep(tr:has(.wikitab-card-type-preview__row--options)) td {
  background-color: var(--background-color-base, #fff);
}

.wikitab-card-type-preview__table :deep(tr:has(.wikitab-card-type-preview__row--custom)) td {
  background-color: #dceeff;
}

.wikitab-card-type-preview__table :deep(tr:has(.wikitab-card-type-preview__row--hardcoded)) td {
  background-color: var(--background-color-neutral-subtle);
  color: var(--color-subtle);
}

.wikitab-card-type-preview__table :deep(tr:has(.wikitab-card-type-preview__row--hardcoded)) td code {
  color: inherit;
}
</style>
