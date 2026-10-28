<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxAccordion, CdxCheckbox, CdxSelect, CdxTextInput } from '@wikimedia/codex'

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
  type WikitabCardTypePreviewModel,
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

function runtimeBindFieldEditable(row: { name: string }) {
  return playgroundRuntimeBindFieldEditable(
    props.entry,
    props.schema,
    fields.value,
    row.name,
  )
}

function readonlyValueUsesTextarea(value: string, multiline?: boolean): boolean {
  return !!multiline && value.includes('\n')
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
            v-for="prop in optionPayloadProperties"
            :key="`${variantKey}-options-${prop.name}`"
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
                v-if="fieldUsesCheckbox(prop)"
                :model-value="fields[prop.name] === 'true'"
                @update:model-value="onCheckbox(prop.name, $event)"
              />
              <textarea
                v-else-if="fieldUsesTextarea(prop)"
                class="wikitab-card-type-preview__textarea"
                :value="fields[prop.name] ?? ''"
                :rows="playgroundFieldTextareaRows(fields[prop.name] ?? '')"
                @input="onFieldInput(prop.name, ($event.target as HTMLTextAreaElement).value)"
              />
              <CdxSelect
                v-else-if="fieldUsesSelect(prop)"
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
          <tr
            v-for="row in runtimeOptionRows"
            :key="`${variantKey}-options-runtime-${row.name}`"
            :class="playgroundFieldRowClass('options')"
          >
            <td>
              <code>{{ row.name }}</code>
            </td>
            <td>
              <code class="wikitab-card-type-preview__type-cell">{{ row.type }}</code>
            </td>
            <td>
              <template v-if="runtimeBindFieldEditable(row)">
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
                  :menu-items="fieldSelectMenuItems(row)"
                  @update:selected="onBindSelect(row.name, $event)"
                />
                <CdxTextInput
                  v-else
                  :model-value="bindFields[row.name] ?? ''"
                  @update:model-value="onBindFieldInput(row.name, $event)"
                />
              </template>
              <template v-else>
                <textarea
                  v-if="readonlyValueUsesTextarea(row.value, true)"
                  class="wikitab-card-type-preview__textarea wikitab-card-type-preview__textarea--readonly"
                  :value="row.value"
                  :rows="playgroundFieldTextareaRows(row.value)"
                  readonly
                />
                <CdxSelect
                  v-else-if="runtimeFieldUsesSelect(row)"
                  class="wikitab-card-type-preview__readonly-select"
                  :selected="row.value"
                  :menu-items="fieldSelectMenuItems(row)"
                  disabled
                  @update:selected="() => {}"
                />
                <CdxTextInput
                  v-else
                  class="wikitab-card-type-preview__readonly-value"
                  :model-value="row.value"
                  @update:model-value="() => {}"
                />
              </template>
            </td>
          </tr>
          <tr
            v-for="prop in customPayloadProperties"
            :key="`${variantKey}-custom-${prop.name}`"
            :class="playgroundFieldRowClass('custom')"
          >
            <td>
              <code>{{ prop.name }}{{ prop.optional ? '?' : '' }}</code>
            </td>
            <td>
              <code class="wikitab-card-type-preview__type-cell">{{ prop.type }}</code>
            </td>
            <td>
              <CdxCheckbox
                v-if="fieldUsesCheckbox(prop)"
                :model-value="fields[prop.name] === 'true'"
                @update:model-value="onCheckbox(prop.name, $event)"
              />
              <textarea
                v-else-if="fieldUsesTextarea(prop)"
                class="wikitab-card-type-preview__textarea"
                :value="fields[prop.name] ?? ''"
                :rows="playgroundFieldTextareaRows(fields[prop.name] ?? '')"
                @input="onFieldInput(prop.name, ($event.target as HTMLTextAreaElement).value)"
              />
              <CdxSelect
                v-else-if="fieldUsesSelect(prop)"
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
          <tr
            v-for="row in presentationFieldRows"
            :key="`${variantKey}-presentation-${row.name}`"
            :class="playgroundFieldRowClass('hardcoded')"
          >
            <td>
              <code>{{ row.name }}{{ row.optional ? '?' : '' }}</code>
            </td>
            <td>
              <code class="wikitab-card-type-preview__type-cell">{{ row.type }}</code>
            </td>
            <td>
              <CdxTextInput
                class="wikitab-card-type-preview__readonly-value"
                :model-value="row.value"
                @update:model-value="() => {}"
              />
            </td>
          </tr>
          <tr
            v-for="row in runtimeHardcodedRows"
            :key="`${variantKey}-hardcoded-runtime-${row.name}`"
            :class="playgroundFieldRowClass('hardcoded')"
          >
            <td>
              <code>{{ row.name }}</code>
            </td>
            <td>
              <code class="wikitab-card-type-preview__type-cell">{{ row.type }}</code>
            </td>
            <td>
              <template v-if="runtimeBindFieldEditable(row)">
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
                  :menu-items="fieldSelectMenuItems(row)"
                  @update:selected="onBindSelect(row.name, $event)"
                />
                <CdxTextInput
                  v-else
                  :model-value="bindFields[row.name] ?? ''"
                  @update:model-value="onBindFieldInput(row.name, $event)"
                />
              </template>
              <template v-else>
                <textarea
                  v-if="readonlyValueUsesTextarea(row.value, true)"
                  class="wikitab-card-type-preview__textarea wikitab-card-type-preview__textarea--readonly"
                  :value="row.value"
                  :rows="playgroundFieldTextareaRows(row.value)"
                  readonly
                />
                <CdxSelect
                  v-else-if="runtimeFieldUsesSelect(row)"
                  class="wikitab-card-type-preview__readonly-select"
                  :selected="row.value"
                  :menu-items="fieldSelectMenuItems(row)"
                  disabled
                  @update:selected="() => {}"
                />
                <CdxTextInput
                  v-else
                  class="wikitab-card-type-preview__readonly-value"
                  :model-value="row.value"
                  @update:model-value="() => {}"
                />
              </template>
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

.wikitab-card-type-preview__row--options td {
  background-color: var(--background-color-base, #fff);
}

.wikitab-card-type-preview__row--custom td {
  background-color: #dceeff;
}

.wikitab-card-type-preview__row--hardcoded td {
  background-color: var(--background-color-neutral-subtle);
  color: var(--color-subtle);
}

.wikitab-card-type-preview__row--hardcoded td code {
  color: inherit;
}

</style>
