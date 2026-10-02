<script setup lang="ts">
import {
  CdxCheckbox,
  CdxField,
  CdxIcon,
  CdxRadio,
  CdxSelect,
  CdxTextArea,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconArticle, cdxIconSpeechBubbles } from '@wikimedia/codex-icons'

import { formatBetaFeatureUserCount } from './betaFeatures'
import type { PrefField } from './types'

const props = defineProps<{
  field: PrefField
  modelValue: unknown
  compact?: boolean
  /** When true, beta feature checkboxes are disabled (auto-enroll is on). */
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

function setValue(value: unknown) {
  emit('update:modelValue', value)
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value)
}

function checkboxGroup(): string[] {
  return Array.isArray(props.modelValue) ? (props.modelValue as string[]) : []
}

function toggleCheckbox(option: string, checked: boolean) {
  const current = new Set(checkboxGroup())
  if (checked) current.add(option)
  else current.delete(option)
  setValue([...current])
}

function matrixValue(row: string, column: string): boolean {
  const matrix = (props.modelValue ?? {}) as Record<string, Record<string, boolean>>
  return Boolean(matrix[row]?.[column])
}

function setMatrixValue(row: string, column: string, checked: boolean) {
  const matrix = {
    ...((props.modelValue ?? {}) as Record<string, Record<string, boolean>>),
  }
  matrix[row] = { ...matrix[row], [column]: checked }
  setValue(matrix)
}

const lockedMatrix = new Set(['edit-user-talk', 'user-rights'])
</script>

<template>
  <hr v-if="field.type === 'separator'" class="pref-field__separator" />

  <div v-else-if="field.type === 'betafeature'" class="mw-ui-feature-field">
    <div class="mw-ui-feature-contain">
      <div class="mw-ui-feature-header">
        <div class="mw-ui-feature-title-contain">
          <div class="mw-ui-feature-checkbox">
            <CdxCheckbox
              :model-value="Boolean(modelValue)"
              :disabled="disabled || field.disabled"
              @update:model-value="setValue"
            >
              <span class="mw-ui-feature-title">{{ field.label }}</span>
            </CdxCheckbox>
          </div>
        </div>
        <div class="mw-ui-feature-info-links filled">
          <a
            v-if="field.infoHref"
            class="mw-ui-feature-info-link"
            :href="field.infoHref"
            rel="noopener noreferrer"
            target="_blank"
          >
            <CdxIcon :icon="cdxIconArticle" size="small" />
            Information
          </a>
          <a
            v-if="field.discussionHref"
            class="mw-ui-feature-discussion-link"
            :href="field.discussionHref"
            rel="noopener noreferrer"
            target="_blank"
          >
            <CdxIcon :icon="cdxIconSpeechBubbles" size="small" />
            Discussion
          </a>
        </div>
      </div>

      <div class="mw-ui-feature-main">
        <div class="mw-ui-feature-meta">
          <p v-if="field.userCount != null" class="mw-ui-feature-user-count">
            {{ formatBetaFeatureUserCount(field.userCount) }}
          </p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-if="field.descriptionHtml"
            class="mw-ui-feature-description"
            v-html="field.descriptionHtml"
          />
          <ul v-if="field.requiresJavascript" class="mw-ui-feature-requirements-list">
            <li class="mw-ui-feature-requirements-javascript">
              This feature requires JavaScript.
            </li>
          </ul>
        </div>
        <div v-if="field.screenshot" class="mw-ui-feature-screenshot-contain">
          <img class="mw-ui-feature-screenshot" :src="field.screenshot" alt="" />
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="compact && (field.type === 'info' || field.type === 'buttons' || field.type === 'text')"
    class="pref-field pref-field--row"
  >
    <div class="pref-field__row-label">{{ field.label }}</div>
    <div class="pref-field__row-value">
      <CdxTextInput
        v-if="field.type === 'text'"
        :model-value="stringValue(modelValue)"
        @update:model-value="setValue"
      />
      <div v-else-if="field.type === 'buttons'" class="pref-field__buttons">
        <a
          v-for="link in field.links"
          :key="link.href + link.label"
          class="cdx-button"
          :href="link.href && link.href !== '#' ? link.href : undefined"
          rel="noopener noreferrer"
          @click="(!link.href || link.href === '#') && $event.preventDefault()"
        >
          {{ link.label }}
        </a>
      </div>
      <div v-else class="pref-field__info">
        <span v-if="field.value">{{ field.value }}</span>
        <span v-if="field.links?.length" class="pref-field__links">
          <a
            v-for="link in field.links"
            :key="link.href + link.label"
            :href="link.href"
            rel="noopener noreferrer"
          >
            {{ link.label }}
          </a>
        </span>
      </div>
    </div>
  </div>

  <div v-else class="pref-field">
    <CdxField v-if="field.type === 'radio'" :is-fieldset="Boolean(field.label)">
      <template v-if="field.label" #label>{{ field.label }}</template>
      <template v-if="field.helpHtml || field.help" #help-text>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-if="field.helpHtml" v-html="field.helpHtml" />
        <template v-else>{{ field.help }}</template>
      </template>
      <CdxRadio
        v-for="option in field.options"
        :key="option.value"
        :model-value="stringValue(modelValue)"
        :input-value="option.value"
        @update:model-value="setValue"
      >
        <span>{{ option.label }}</span>
        <a
          v-if="option.href"
          class="pref-field__option-link"
          :href="option.href"
          rel="noopener noreferrer"
        >
          {{ option.linkLabel ?? 'Preview' }}
        </a>
        <span v-if="option.description" class="pref-field__option-desc">{{ option.description }}</span>
      </CdxRadio>
    </CdxField>

    <CdxField v-else-if="field.type === 'checkboxes'" :is-fieldset="Boolean(field.label)">
      <template v-if="field.label" #label>{{ field.label }}</template>
      <template v-if="field.helpHtml || field.help" #help-text>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-if="field.helpHtml" v-html="field.helpHtml" />
        <template v-else>{{ field.help }}</template>
      </template>
      <CdxCheckbox
        v-for="option in field.options"
        :key="option.value"
        :model-value="checkboxGroup().includes(option.value)"
        @update:model-value="(checked) => toggleCheckbox(option.value, checked)"
      >
        {{ option.label }}
      </CdxCheckbox>
    </CdxField>

    <CdxField v-else-if="field.type === 'matrix'" :is-fieldset="Boolean(field.label)">
      <template v-if="field.label" #label>{{ field.label }}</template>
      <table class="pref-field__matrix">
        <thead>
          <tr>
            <th scope="col" />
            <th v-for="column in field.columns" :key="column.value" scope="col">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in field.rows" :key="row.value">
            <th scope="row">{{ row.label }}</th>
            <td v-for="column in field.columns" :key="column.value">
              <CdxCheckbox
                :model-value="matrixValue(row.value, column.value)"
                :disabled="lockedMatrix.has(row.value) && column.value === 'web'"
                :aria-label="`${row.label}, ${column.label}`"
                @update:model-value="(checked) => setMatrixValue(row.value, column.value, checked)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </CdxField>

    <CdxField v-else>
      <template v-if="field.label && field.type !== 'checkbox'" #label>{{ field.label }}</template>
      <template v-if="field.helpHtml || field.help" #help-text>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-if="field.helpHtml" v-html="field.helpHtml" />
        <template v-else>{{ field.help }}</template>
      </template>

      <CdxTextInput
        v-if="field.type === 'text'"
        :model-value="stringValue(modelValue)"
        @update:model-value="setValue"
      />
      <CdxTextInput
        v-else-if="field.type === 'number'"
        input-type="number"
        :model-value="stringValue(modelValue)"
        @update:model-value="setValue"
      />
      <CdxTextArea
        v-else-if="field.type === 'textarea'"
        :model-value="stringValue(modelValue)"
        :rows="4"
        @update:model-value="setValue"
      />
      <CdxSelect
        v-else-if="field.type === 'select'"
        :selected="stringValue(modelValue)"
        :menu-items="field.options ?? []"
        @update:selected="setValue"
      />
      <CdxCheckbox
        v-else-if="field.type === 'checkbox'"
        :model-value="Boolean(modelValue)"
        @update:model-value="setValue"
      >
        {{ field.label }}
      </CdxCheckbox>
      <div v-else-if="field.type === 'info'" class="pref-field__info">
        <span v-if="field.value">{{ field.value }}</span>
        <span v-if="field.links?.length" class="pref-field__links">
          <a
            v-for="link in field.links"
            :key="link.href + link.label"
            :href="link.href"
            rel="noopener noreferrer"
          >
            {{ link.label }}
          </a>
        </span>
      </div>
      <div v-else-if="field.type === 'buttons'" class="pref-field__buttons">
        <a
          v-for="link in field.links"
          :key="link.href + link.label"
          class="cdx-button"
          :href="link.href && link.href !== '#' ? link.href : undefined"
          rel="noopener noreferrer"
          @click="(!link.href || link.href === '#') && $event.preventDefault()"
        >
          {{ link.label }}
        </a>
      </div>
    </CdxField>
  </div>
</template>

<style scoped>
.pref-field {
  margin-bottom: var(--spacing-100);
  max-width: 50em;
}

.pref-field :deep(.cdx-text-input),
.pref-field :deep(.cdx-text-area),
.pref-field :deep(.cdx-select) {
  width: 100%;
  max-width: 50em;
}

.pref-field__row-label {
  font-weight: var(--font-weight-bold);
  padding-inline-end: var(--spacing-75);
}

@media (min-width: 640px) {
  .pref-field--row {
    display: grid;
    grid-template-columns: 20% 80%;
    align-items: center;
  }
}

.pref-field__option-link {
  margin-inline-start: var(--spacing-50);
}

.pref-field__option-desc {
  display: block;
  color: var(--color-subtle);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.pref-field__info,
.pref-field__links,
.pref-field__buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-75);
}

.pref-field__links a {
  color: var(--color-progressive);
}

.pref-field__matrix {
  width: 100%;
  max-width: 50em;
  border-collapse: collapse;
}

.pref-field__matrix th,
.pref-field__matrix td {
  padding: var(--spacing-50) var(--spacing-75);
  text-align: start;
  vertical-align: middle;
}

.pref-field__matrix thead th {
  font-weight: var(--font-weight-bold);
}

.pref-field__separator {
  margin: var(--spacing-150) 0;
  border: 0;
  border-block-start: 1px solid var(--border-color-subtle, #c8ccd1);
}

/* Production BetaFeatures field layout (ext.betaFeatures.styles). */
.mw-ui-feature-field {
  margin-bottom: 64px;
  position: relative;
}

.mw-ui-feature-contain {
  margin-inline-start: 32px;
}

@media (min-width: 640px) {
  .mw-ui-feature-contain {
    width: calc(100% - 4em);
  }
}

.mw-ui-feature-header {
  width: 100%;
  border-bottom: 1px solid var(--border-color-muted, #eaecf0);
}

.mw-ui-feature-title-contain {
  margin-inline-start: -32px;
  margin-inline-end: 32px;
}

.mw-ui-feature-title {
  font-size: 1.5em;
  line-height: 2em;
  font-weight: var(--font-weight-normal, 400);
}

.mw-ui-feature-info-links {
  margin-top: 4px;
  white-space: nowrap;
}

.mw-ui-feature-info-link,
.mw-ui-feature-discussion-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-height: 1.5em;
  line-height: 2em;
  padding: 4px 8px;
  border-inline-start: 1px solid var(--border-color-muted, #eaecf0);
  color: var(--color-progressive);
  text-decoration: none;
}

.mw-ui-feature-info-link:hover,
.mw-ui-feature-discussion-link:hover {
  text-decoration: underline;
}

.mw-ui-feature-main {
  margin-top: 16px;
}

.mw-ui-feature-meta {
  padding-inline-end: 16px;
}

.mw-ui-feature-user-count {
  color: var(--color-success, #14866d);
  margin: 16px 0 0;
}

.mw-ui-feature-description :deep(p) {
  margin: 0.5em 0 0;
}

.mw-ui-feature-description :deep(a) {
  color: var(--color-progressive);
}

.pref-field :deep(.cdx-field__help-text a),
.pref-field :deep(.cdx-label__description a) {
  color: var(--color-progressive);
}

.mw-ui-feature-requirements-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.mw-ui-feature-requirements-list li {
  color: var(--color-error, #d03333);
}

/* JS is available in this SPA prototype — hide like production .client-js. */
.mw-ui-feature-requirements-javascript {
  display: none;
}

.mw-ui-feature-screenshot {
  max-height: 12em;
  max-width: 100%;
}

@media (min-width: 640px) {
  .mw-ui-feature-meta,
  .mw-ui-feature-screenshot-contain,
  .mw-ui-feature-title-contain,
  .mw-ui-feature-info-links {
    display: inline-block;
    width: 50%;
    box-sizing: border-box;
    vertical-align: top;
  }

  .mw-ui-feature-title-contain,
  .mw-ui-feature-info-links {
    vertical-align: bottom;
  }
}

@media (max-width: 639px) {
  .mw-ui-feature-screenshot-contain {
    margin-top: 16px;
  }
}
</style>
