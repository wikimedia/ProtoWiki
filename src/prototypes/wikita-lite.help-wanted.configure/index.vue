<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { CdxButton, CdxToggleSwitch } from '@wikimedia/codex'

import WikitaLiteFullscreenHeader from '../wikita-lite/components/WikitaLiteFullscreenHeader.vue'
import WikitaLiteFullscreenShell from '../wikita-lite/components/WikitaLiteFullscreenShell.vue'
import WikitaLiteSuggestionConfigureToggles from '../wikita-lite/components/WikitaLiteSuggestionConfigureToggles.vue'
import { useWikitaLiteModuleSuggestionPreferencesSingleton } from '../wikita-lite/composables/useWikitaLiteModuleSuggestionPreferences'
import { useWikitaLiteSuggestionPreferencesSingleton } from '../wikita-lite/composables/useWikitaLiteSuggestionPreferences'
import {
  HELP_WANTED_CONFIGURE_INTERESTS_PAGE,
  HELP_WANTED_PAGE,
} from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Configure Suggested edits',
    description: 'Configure suggestion sources for the Suggested edits module.',
  },
})

const MODULE_ID = 'suggestedEdits' as const

const router = useRouter()
const { preferences: globalPreferences, listInterests, interestsVersion } =
  useWikitaLiteSuggestionPreferencesSingleton()
const {
  getModuleConfig,
  setModuleConfig,
  seedModuleOverridesFromGlobal,
  listModuleInterests,
  commitModuleInterests,
  modulePreferencesVersion,
} = useWikitaLiteModuleSuggestionPreferencesSingleton()

const moduleConfig = computed(() => getModuleConfig(MODULE_ID))

const useDefaultSettings = computed({
  get: () => moduleConfig.value.useDefaultSettings,
  set(value: boolean) {
    if (!value && moduleConfig.value.useDefaultSettings) {
      seedModuleOverridesFromGlobal(MODULE_ID)
      return
    }
    setModuleConfig(MODULE_ID, {
      ...getModuleConfig(MODULE_ID),
      useDefaultSettings: value,
    })
  },
})

const displayPreferences = computed(() =>
  useDefaultSettings.value ? globalPreferences.value : moduleConfig.value.preferences,
)

const savedInterests = computed(() => {
  if (useDefaultSettings.value) {
    interestsVersion.value
    return listInterests()
  }
  modulePreferencesVersion.value
  return listModuleInterests(MODULE_ID)
})

function updatePreference(key: 'useSavedPages' | 'useEditingHistory' | 'useInterests', value: boolean) {
  if (useDefaultSettings.value) return
  setModuleConfig(MODULE_ID, {
    ...getModuleConfig(MODULE_ID),
    preferences: {
      ...getModuleConfig(MODULE_ID).preferences,
      [key]: value,
    },
  })
}

function closeConfigure() {
  router.back()
}

function finishConfigure() {
  router.replace(HELP_WANTED_PAGE)
}

function openInterests() {
  router.push(HELP_WANTED_CONFIGURE_INTERESTS_PAGE)
}

function removeInterest(title: string) {
  if (useDefaultSettings.value) return
  const key = title.toLowerCase()
  commitModuleInterests(
    MODULE_ID,
    listModuleInterests(MODULE_ID).filter((entry) => entry.toLowerCase() !== key),
  )
}
</script>

<template>
  <WikitaLiteFullscreenShell>
    <WikitaLiteFullscreenHeader title="Configure" @close="closeConfigure" />

    <div class="wikita-lite-configure">
      <div class="wikita-lite-configure__master-toggle">
        <CdxToggleSwitch v-model="useDefaultSettings" align-switch>
          Use my default settings
        </CdxToggleSwitch>
      </div>

      <WikitaLiteSuggestionConfigureToggles
        :use-saved-pages="displayPreferences.useSavedPages"
        :use-editing-history="displayPreferences.useEditingHistory"
        :use-interests="displayPreferences.useInterests"
        :interests="savedInterests"
        :disabled="useDefaultSettings"
        @update:use-saved-pages="updatePreference('useSavedPages', $event)"
        @update:use-editing-history="updatePreference('useEditingHistory', $event)"
        @update:use-interests="updatePreference('useInterests', $event)"
        @add-interest="openInterests"
        @remove-interest="removeInterest"
      />

      <div class="wikita-lite-configure__footer">
        <CdxButton
          class="wikita-lite-configure__done"
          size="large"
          @click="finishConfigure"
        >
          Done
        </CdxButton>
      </div>
    </div>
  </WikitaLiteFullscreenShell>
</template>

<style scoped>
.wikita-lite-configure {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  min-height: 0;
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px) var(--spacing-200, 32px);
}

.wikita-lite-configure__master-toggle :deep(.cdx-toggle-switch) {
  width: 100%;
}

.wikita-lite-configure__footer {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  margin-top: auto;
  padding-top: var(--spacing-100, 16px);
}

.wikita-lite-configure__done {
  width: 100%;
  max-width: none;
}
</style>
