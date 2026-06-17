<script setup lang="ts">
import { ref } from 'vue'
import {
  CdxAccordion,
  CdxCheckbox,
  CdxChipInput,
  CdxCombobox,
  CdxField,
  CdxLabel,
  CdxLookup,
  CdxMultiselectLookup,
  CdxRadio,
  CdxSearchInput,
  CdxSelect,
  CdxTextArea,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'
import type { ValidationStatusType } from '@wikimedia/codex'

import { chipItems, lookupResults, selectOptions } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'

const textValue = ref('Sample text')
const textAreaValue = ref('Multiline\nsample text')
const searchValue = ref('')
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
const accordionOpen = ref(true)

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

const accordionSeparations = ['none', 'minimal', 'divider', 'outline'] as const

function rejectInvalidChip(value: string | number) {
  return String(value).length >= 2
}
</script>

<template>
    <PlaygroundSection title="CdxField">
      <PlaygroundGrid min="240px">
        <PlaygroundCell v-for="status in fieldStatuses" :key="status" :label="status">
          <CdxField :status="status" :messages="{ [status]: 'Message' }">
            <template #label>Label</template>
            <template #description>Description</template>
            <CdxTextInput v-model="textValue" />
            <template #help-text>Help text</template>
          </CdxField>
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxLabel">
      <PlaygroundGrid min="180px">
        <PlaygroundCell label="default">
          <CdxLabel>Label text</CdxLabel>
        </PlaygroundCell>
        <PlaygroundCell label="optional">
          <CdxLabel optional>Optional label</CdxLabel>
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxTextInput">
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

    <PlaygroundSection title="CdxTextArea">
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

    <PlaygroundSection title="CdxSearchInput">
      <PlaygroundGrid min="240px">
        <PlaygroundCell label="default">
          <CdxSearchInput v-model="searchValue" placeholder="Search" />
        </PlaygroundCell>
        <PlaygroundCell label="disabled">
          <CdxSearchInput model-value="Disabled" disabled />
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxCheckbox">
      <PlaygroundGrid min="180px">
        <PlaygroundCell label="unchecked">
          <CdxCheckbox v-model="checkboxSingle">Checkbox</CdxCheckbox>
        </PlaygroundCell>
        <PlaygroundCell label="checked">
          <CdxCheckbox :model-value="true">Checked</CdxCheckbox>
        </PlaygroundCell>
        <PlaygroundCell label="disabled">
          <CdxCheckbox :model-value="true" disabled>Disabled</CdxCheckbox>
        </PlaygroundCell>
        <PlaygroundCell label="group">
          <CdxCheckbox v-model="checkboxGroup" input-value="a">A</CdxCheckbox>
          <CdxCheckbox v-model="checkboxGroup" input-value="b">B</CdxCheckbox>
          <CdxCheckbox v-model="checkboxGroup" input-value="c">C</CdxCheckbox>
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxRadio">
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

    <PlaygroundSection title="CdxSelect">
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

    <PlaygroundSection title="CdxCombobox">
      <PlaygroundGrid min="220px">
        <PlaygroundCell label="default">
          <CdxCombobox v-model:selected="comboboxValue" :menu-items="selectOptions" />
        </PlaygroundCell>
        <PlaygroundCell label="disabled">
          <CdxCombobox selected="a" :menu-items="selectOptions" disabled />
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxLookup">
      <PlaygroundGrid min="240px">
        <PlaygroundCell label="default">
          <CdxLookup
            v-model:selected="lookupSelected"
            v-model:input-value="lookupInput"
            :menu-items="lookupResults"
          />
        </PlaygroundCell>
        <PlaygroundCell label="disabled">
          <CdxLookup
            selected="Albert Einstein"
            input-value="Albert Einstein"
            :menu-items="lookupResults"
            disabled
          />
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxMultiselectLookup">
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

    <PlaygroundSection title="CdxChipInput">
      <PlaygroundGrid min="280px">
        <PlaygroundCell label="default">
          <CdxChipInput v-model:input-chips="chips" v-model:input-value="chipInputValue" />
        </PlaygroundCell>
        <PlaygroundCell label="separate-input">
          <CdxChipInput
            v-model:input-chips="chips"
            separate-input
          />
        </PlaygroundCell>
        <PlaygroundCell label="validator">
          <CdxChipInput
            v-model:input-chips="chips"
            :chip-validator="rejectInvalidChip"
          />
        </PlaygroundCell>
        <PlaygroundCell label="disabled">
          <CdxChipInput
            :input-chips="chipItems"
            disabled
          />
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>

    <PlaygroundSection title="CdxAccordion">
      <PlaygroundGrid min="280px">
        <PlaygroundCell v-for="separation in accordionSeparations" :key="separation" :label="separation">
          <CdxAccordion v-model="accordionOpen" :separation="separation">
            <template #title>Title</template>
            <template #description>Description</template>
            <p>Body content</p>
          </CdxAccordion>
        </PlaygroundCell>
        <PlaygroundCell label="open">
          <CdxAccordion open separation="outline">
            <template #title>Title</template>
            <p>Body content</p>
          </CdxAccordion>
        </PlaygroundCell>
      </PlaygroundGrid>
    </PlaygroundSection>
</template>

<style scoped>
:deep(.playground-cell__content > * + *) {
  margin-top: var(--spacing-35);
}
</style>
