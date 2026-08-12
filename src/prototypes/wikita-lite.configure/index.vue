<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { CdxButton, CdxIcon, CdxToggleSwitch } from '@wikimedia/codex'
import { cdxIconAdd } from '@wikimedia/codex-icons'

import WikitaLiteFullscreenHeader from '../wikita-lite/components/WikitaLiteFullscreenHeader.vue'
import WikitaLiteFullscreenShell from '../wikita-lite/components/WikitaLiteFullscreenShell.vue'
import WikitaLiteInterestChips from '../wikita-lite/components/WikitaLiteInterestChips.vue'
import { useWikitaLiteDismissedModulesSingleton } from '../wikita-lite/composables/useWikitaLiteDismissedModules'
import { useWikitaLiteSuggestionPreferencesSingleton } from '../wikita-lite/composables/useWikitaLiteSuggestionPreferences'
import { CONFIGURE_INTERESTS_PAGE } from '../wikita-lite/routes'

definePage({
  meta: {
    title: 'Wikita-lite — Configure',
    description: 'Configure personalized suggestion sources for Wikita-lite.',
  },
})

const router = useRouter()
const { preferences, listInterests, commitInterests, interestsVersion } =
  useWikitaLiteSuggestionPreferencesSingleton()
const { dismissedEntries, restore } = useWikitaLiteDismissedModulesSingleton()

const savedInterests = computed(() => {
  interestsVersion.value
  return listInterests()
})

function closeConfigure() {
  router.back()
}

function openInterests() {
  router.push(CONFIGURE_INTERESTS_PAGE)
}

function removeInterest(title: string) {
  const key = title.toLowerCase()
  commitInterests(savedInterests.value.filter((entry) => entry.toLowerCase() !== key))
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
        <CdxToggleSwitch v-model="preferences.useEditingHistory" align-switch>
          Show suggestions based on my editing history
        </CdxToggleSwitch>
        <div class="wikita-lite-configure__interests-group">
          <CdxToggleSwitch v-model="preferences.useInterests" align-switch>
            Show suggestions based on my interests
          </CdxToggleSwitch>
          <div class="wikita-lite-configure__interests-actions">
            <WikitaLiteInterestChips
              v-if="savedInterests.length"
              :interests="savedInterests"
              @remove="removeInterest"
            />
            <CdxButton class="wikita-lite-configure__add-interest" @click="openInterests">
              <CdxIcon :icon="cdxIconAdd" />
              Add interest
            </CdxButton>
          </div>
        </div>
      </div>

      <section v-if="dismissedEntries.length" class="wikita-lite-configure__dismissed">
        <h3 class="wikita-lite-configure__dismissed-label">Dismissed modules</h3>
        <ul class="wikita-lite-configure__dismissed-list">
          <li
            v-for="entry in dismissedEntries"
            :key="entry.moduleId"
            class="wikita-lite-configure__dismissed-item"
          >
            <span class="wikita-lite-configure__dismissed-title">{{ entry.title }}</span>
            <CdxButton weight="quiet" @click="restore(entry.moduleId)">
              Restore
            </CdxButton>
          </li>
        </ul>
      </section>

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

.wikita-lite-configure__interests-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
}

.wikita-lite-configure__interests-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  align-items: flex-start;
}

.wikita-lite-configure__add-interest {
  align-self: flex-start;
}

.wikita-lite-configure__dismissed {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
}

.wikita-lite-configure__dismissed-label {
  margin: 0;
  color: var(--color-base, #202122);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.375rem);
}

.wikita-lite-configure__dismissed-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.wikita-lite-configure__dismissed-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
}

.wikita-lite-configure__dismissed-title {
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.375rem);
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
