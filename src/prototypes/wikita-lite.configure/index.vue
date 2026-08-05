<script setup lang="ts">
import { useRouter } from 'vue-router'

import { CdxButton, CdxToggleSwitch } from '@wikimedia/codex'

import WikitaLiteFullscreenHeader from '../wikita-lite/components/WikitaLiteFullscreenHeader.vue'
import WikitaLiteFullscreenShell from '../wikita-lite/components/WikitaLiteFullscreenShell.vue'
import { useWikitaLiteSuggestionPreferencesSingleton } from '../wikita-lite/composables/useWikitaLiteSuggestionPreferences'
import { CONFIGURE_INTERESTS_PAGE } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Configure',
    description: 'Configure personalized suggestion sources for Wikita-lite.',
  },
})

const router = useRouter()
const { preferences } = useWikitaLiteSuggestionPreferencesSingleton()

function closeConfigure() {
  router.back()
}

function openInterests() {
  router.push(CONFIGURE_INTERESTS_PAGE)
}
</script>

<template>
  <WikitaLiteFullscreenShell>
    <WikitaLiteFullscreenHeader title="Configure" @close="closeConfigure" />

    <div class="wikita-lite-configure">
      <div class="wikita-lite-configure__toggles">
        <CdxToggleSwitch v-model="preferences.useSavedPages" align-switch>
          Show suggestions based on my saved pages
        </CdxToggleSwitch>
        <CdxToggleSwitch v-model="preferences.useInterests" align-switch>
          Show suggestions based on my interests
        </CdxToggleSwitch>
      </div>

      <CdxButton class="wikita-lite-configure__edit-interests" @click="openInterests">
        Edit interests
      </CdxButton>

      <div class="wikita-lite-configure__footer">
        <CdxButton
          class="wikita-lite-configure__done"
          size="large"
          @click="closeConfigure"
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

.wikita-lite-configure__toggles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
}

.wikita-lite-configure__toggles :deep(.cdx-toggle-switch) {
  width: 100%;
}

.wikita-lite-configure__edit-interests {
  align-self: flex-start;
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
