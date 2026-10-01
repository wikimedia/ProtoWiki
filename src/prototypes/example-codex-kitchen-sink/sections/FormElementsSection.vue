<script setup lang="ts">
import { ref } from 'vue'
import {
  CdxCheckbox,
  CdxChipInput,
  CdxCombobox,
  CdxField,
  CdxLabel,
  CdxLookup,
  CdxMultiselectLookup,
  CdxRadio,
  CdxSelect,
  CdxTextArea,
  CdxTextInput,
  CdxToggleSwitch,
} from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'
import type { ValidationStatusType } from '@wikimedia/codex'

import { formElementsSubTabs } from '../lib/component-tabs'
import { chipItems, lookupResults, selectOptions } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundList from '../playground/PlaygroundList.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const textValue = ref('Sample text')
const textAreaValue = ref('Multiline\nsample text')
const selectValue = ref('a')
const comboboxValue = ref('a')
const lookupSelected = ref<string | null>(null)
const lookupInput = ref('Albert')
const multiSelected = ref<string[]>([])
const multiChips = ref([...chipItems])
const chips = ref([...chipItems])
const chipInputValue = ref('')
const checkboxSingle = ref(false)
const checkboxGroup = ref<string[]>(['b'])
const radioValue = ref('draft')
const toggleSwitch = ref(true)
const toggleSwitchDisabled = ref(true)

const fieldStatuses: ValidationStatusType[] = ['default', 'warning', 'error', 'success']
const inputTypes = [
  'text',
  'search',
  'number',
  'email',
  'password',
  'tel',
  'url',
  'date',
  'time',
  'color',
] as const

function rejectInvalidChip(value: string | number) {
  return String(value).length >= 2
}
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-form-elements"
    :items="formElementsSubTabs"
    default-active="checkbox"
    ariaLabel="Form elements"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'checkbox'">
        <PlaygroundList>
          <PlaygroundCell label="unchecked" row>
            <CdxCheckbox v-model="checkboxSingle">Label</CdxCheckbox>
          </PlaygroundCell>
          <PlaygroundCell label="checked" row>
            <CdxCheckbox :model-value="true">Label</CdxCheckbox>
          </PlaygroundCell>
          <PlaygroundCell label="disabled" row>
            <CdxCheckbox :model-value="true" disabled>Label</CdxCheckbox>
          </PlaygroundCell>
          <PlaygroundCell label="group" row>
            <CdxCheckbox v-model="checkboxGroup" input-value="a">A</CdxCheckbox>
            <CdxCheckbox v-model="checkboxGroup" input-value="b">B</CdxCheckbox>
            <CdxCheckbox v-model="checkboxGroup" input-value="c">C</CdxCheckbox>
          </PlaygroundCell>
        </PlaygroundList>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'chip-input'">
        <PlaygroundList>
          <PlaygroundCell label="default" row>
            <CdxChipInput v-model:input-chips="chips" v-model:input-value="chipInputValue" />
          </PlaygroundCell>
          <PlaygroundCell label="separate-input" row>
            <CdxChipInput v-model:input-chips="chips" separate-input />
          </PlaygroundCell>
          <PlaygroundCell label="validator" row>
            <CdxChipInput v-model:input-chips="chips" :chip-validator="rejectInvalidChip" />
          </PlaygroundCell>
          <PlaygroundCell label="disabled" row>
            <CdxChipInput :input-chips="chipItems" disabled />
          </PlaygroundCell>
        </PlaygroundList>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'combobox'">
        <PlaygroundList>
          <PlaygroundCell label="default" row>
            <CdxCombobox v-model:selected="comboboxValue" :menu-items="selectOptions" />
          </PlaygroundCell>
          <PlaygroundCell label="disabled" row>
            <CdxCombobox selected="a" :menu-items="selectOptions" disabled />
          </PlaygroundCell>
        </PlaygroundList>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'field'">
        <PlaygroundList>
          <PlaygroundCell v-for="status in fieldStatuses" :key="status" :label="status" row>
            <CdxField :status="status" :messages="{ [status]: 'Message' }">
              <template #label>Label</template>
              <template #description>Description</template>
              <CdxTextInput v-model="textValue" />
              <template #help-text>Help text</template>
            </CdxField>
          </PlaygroundCell>
        </PlaygroundList>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'label'">
        <PlaygroundList>
          <PlaygroundCell label="default" row>
            <CdxLabel>Label</CdxLabel>
          </PlaygroundCell>
          <PlaygroundCell label="optional" row>
            <CdxLabel optional>Label</CdxLabel>
          </PlaygroundCell>
        </PlaygroundList>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'lookup'">
        <PlaygroundList>
          <PlaygroundCell label="default" row>
            <CdxLookup
              v-model:selected="lookupSelected"
              v-model:input-value="lookupInput"
              :menu-items="lookupResults"
            />
          </PlaygroundCell>
          <PlaygroundCell label="disabled" row>
            <CdxLookup
              selected="Albert Einstein"
              input-value="Albert Einstein"
              :menu-items="lookupResults"
              disabled
            />
          </PlaygroundCell>
        </PlaygroundList>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'multiselect-lookup'">
        <PlaygroundGrid min="280px">
          <PlaygroundCell label="default">
            <CdxMultiselectLookup
              v-model:selected="multiSelected"
              v-model:input-chips="multiChips"
              :menu-items="lookupResults"
            />
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxMultiselectLookup
              :selected="['Albert Einstein']"
              :input-chips="[{ value: 'Albert Einstein' }]"
              :menu-items="lookupResults"
              disabled
            />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'radio'">
        <PlaygroundGrid min="180px">
          <PlaygroundCell label="group">
            <CdxRadio v-model="radioValue" input-value="published">Published</CdxRadio>
            <CdxRadio v-model="radioValue" input-value="draft">Draft</CdxRadio>
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxRadio model-value="draft" input-value="draft" disabled>Draft</CdxRadio>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'select'">
        <PlaygroundGrid min="220px">
          <PlaygroundCell label="default">
            <CdxSelect v-model:selected="selectValue" :menu-items="selectOptions" default-label="Choose" />
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxSelect
              selected="a"
              :menu-items="selectOptions"
              default-label="Choose"
              disabled
            />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'text-area'">
        <PlaygroundGrid min="240px">
          <PlaygroundCell label="default">
            <CdxTextArea v-model="textAreaValue" :rows="3" />
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxTextArea model-value="Disabled" :rows="3" disabled />
          </PlaygroundCell>
          <PlaygroundCell label="readonly">
            <CdxTextArea model-value="Readonly" :rows="3" readonly />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'text-input'">
        <PlaygroundGrid min="220px">
          <PlaygroundCell label="default">
            <CdxTextInput v-model="textValue" placeholder="Placeholder" />
          </PlaygroundCell>
          <PlaygroundCell label="start-icon">
            <CdxTextInput v-model="textValue" :start-icon="cdxIconSearch" />
          </PlaygroundCell>
          <PlaygroundCell label="clearable">
            <CdxTextInput v-model="textValue" clearable />
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxTextInput model-value="Disabled" disabled />
          </PlaygroundCell>
          <PlaygroundCell label="readonly">
            <CdxTextInput model-value="Readonly" readonly />
          </PlaygroundCell>
          <PlaygroundCell v-for="inputType in inputTypes" :key="inputType" :label="inputType">
            <CdxTextInput :input-type="inputType" :model-value="inputType === 'number' ? 42 : 'Sample'" />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'toggle-switch'">
        <PlaygroundGrid min="180px">
          <PlaygroundCell label="off">
            <CdxToggleSwitch v-model="toggleSwitchDisabled">Off</CdxToggleSwitch>
          </PlaygroundCell>
          <PlaygroundCell label="on">
            <CdxToggleSwitch v-model="toggleSwitch">On</CdxToggleSwitch>
          </PlaygroundCell>
          <PlaygroundCell label="disabled">
            <CdxToggleSwitch :model-value="true" disabled>Disabled</CdxToggleSwitch>
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped>
:deep(.playground-cell__content > * + *) {
  margin-top: var(--spacing-35);
}
</style>
