<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CdxButton, CdxMessage, CdxSearchInput, CdxTab, CdxTabs } from '@wikimedia/codex'

import PreferenceField from './PreferenceField.vue'
import { PREFERENCE_TABS } from './preferencesData'
import type { PrefField, PrefSection, PrefTab } from './types'

const route = useRoute()
const activeTab = ref(PREFERENCE_TABS[0].id)

function applyHash() {
  if (route.hash.includes('experimentation')) activeTab.value = 'experimentation'
  else if (route.hash.includes('beta')) activeTab.value = 'betafeatures'
}
const searchQuery = ref('')
const savedNotice = ref(false)

function collectDefaults(): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const tab of PREFERENCE_TABS) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        if (field.type === 'separator') continue
        if (field.defaultValue !== undefined) values[field.id] = structuredClone(field.defaultValue)
      }
    }
  }
  return values
}

const values = reactive<Record<string, unknown>>(collectDefaults())
const savedValues = ref<Record<string, unknown>>(collectDefaults())

const isDirty = computed(
  () => JSON.stringify(values) !== JSON.stringify(savedValues.value),
)

const autoEnrollBeta = computed(() => Boolean(values['betafeatures-auto-enroll']))

function fieldValue(field: PrefField): unknown {
  if (field.type === 'separator') return undefined
  if (values[field.id] !== undefined) return values[field.id]
  return field.defaultValue
}

function setFieldValue(field: PrefField, value: unknown) {
  if (field.type === 'separator') return
  values[field.id] = value
  savedNotice.value = false
}

function fieldMatches(field: PrefField, query: string): boolean {
  if (field.type === 'separator') return false
  const descriptionText = field.descriptionHtml?.replace(/<[^>]+>/g, ' ')
  const helpText = field.helpHtml?.replace(/<[^>]+>/g, ' ')
  const haystack = [
    field.label,
    field.help,
    helpText,
    field.value,
    field.description,
    descriptionText,
    ...(field.options ?? []).flatMap((option) => [option.label, option.description]),
    ...(field.rows ?? []).map((row) => row.label),
    ...(field.links ?? []).map((link) => link.label),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function filterSection(section: PrefSection, query: string): PrefSection | null {
  if (!query) return section
  if (section.title.toLowerCase().includes(query)) return section
  const fields = section.fields.filter((field) => fieldMatches(field, query))
  if (!fields.length) return null
  return { ...section, fields }
}

const visibleTabs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return PREFERENCE_TABS
  return PREFERENCE_TABS.map((tab) => {
    if (tab.label.toLowerCase().includes(query)) return tab
    const sections = tab.sections
      .map((section) => filterSection(section, query))
      .filter((section): section is PrefSection => section !== null)
    if (!sections.length) return null
    return { ...tab, sections }
  }).filter((tab): tab is PrefTab => tab !== null)
})

function isCompact(tab: PrefTab, section: PrefSection): boolean {
  return tab.id === 'personal' && (section.id === 'info' || section.id === 'accountsecurity')
}

function snapshotValues(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(values))
}

function save() {
  if (!isDirty.value) return
  savedValues.value = snapshotValues()
  savedNotice.value = true
}

onMounted(applyHash)
watch(() => route.hash, applyHash)
</script>

<template>
  <form id="preferences" class="mw-prefs" @submit.prevent="save">
    <div class="mw-prefs__search">
      <CdxSearchInput v-model="searchQuery" placeholder="Search preferences" />
    </div>

    <div class="mw-prefs-tabs-wrapper">
      <CdxTabs v-model:active="activeTab" framed class="mw-prefs__tabs">
        <CdxTab
          v-for="tab in visibleTabs"
          :key="tab.id"
          :name="tab.id"
          :label="tab.label"
        >
          <div :id="`mw-prefsection-${tab.id}`" class="mw-prefs__panel">
            <fieldset
              v-for="section in tab.sections"
              :key="section.id"
              class="mw-prefs__fieldset"
            >
              <legend class="mw-prefs__legend">{{ section.title }}</legend>
              <p v-if="section.description" class="mw-prefs__section-desc">{{ section.description }}</p>
              <PreferenceField
                v-for="field in section.fields"
                :key="field.id"
                :field="field"
                :compact="isCompact(tab, section)"
                :model-value="fieldValue(field)"
                :disabled="field.type === 'betafeature' && autoEnrollBeta"
                @update:model-value="setFieldValue(field, $event)"
              />
            </fieldset>
          </div>
        </CdxTab>
      </CdxTabs>
    </div>

    <p v-if="visibleTabs.length === 0" class="mw-prefs__noresults">
      No preferences match your search.
    </p>

    <div class="mw-prefs__submit">
      <CdxMessage v-if="savedNotice" type="success">Your preferences have been saved.</CdxMessage>
      <div class="mw-prefs__actions">
        <CdxButton action="progressive" weight="primary" type="submit" :disabled="!isDirty">
          Save
        </CdxButton>
      </div>
    </div>
  </form>
</template>

<style scoped>
.mw-prefs {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.mw-prefs__search {
  width: 20em;
  max-width: 100%;
  margin-left: auto;
  margin-bottom: var(--spacing-50);
}

.mw-prefs-tabs-wrapper {
  border: 1px solid var(--border-color-base);
  background-color: var(--background-color-base);
}

.mw-prefs__tabs {
  width: 100%;
}

.mw-prefs__tabs :deep(.cdx-tabs__header) {
  background-color: var(--background-color-neutral);
  border-bottom: 1px solid var(--border-color-base);
}

.mw-prefs__tabs :deep(.cdx-tabs__list) {
  flex-wrap: wrap;
  height: auto;
}

.mw-prefs__panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
  padding: var(--spacing-100) var(--spacing-150) var(--spacing-150);
}

.mw-prefs__fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.mw-prefs__legend {
  padding: 0;
  margin: 0 0 var(--spacing-75);
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
}

.mw-prefs__section-desc {
  margin: 0 0 var(--spacing-100);
  max-width: 50em;
}

.mw-prefs__noresults {
  margin: var(--spacing-150);
  font-style: italic;
  color: var(--color-subtle);
}

.mw-prefs__submit {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  margin-inline: calc(var(--spacing-50) * -1);
  padding: var(--spacing-100);
  background-color: var(--background-color-base);
  border-top: 1px solid var(--border-color-subtle);
  box-shadow: 0 -4px 4px -4px rgba(0, 0, 0, 0.25);
}

.mw-prefs__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-75);
}
</style>
