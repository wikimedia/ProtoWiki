<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconHelpNotice } from '@wikimedia/codex-icons'

import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import ExperimentationChrome from '../ExperimentationChrome.vue'
import PreferencesForm from '../PreferencesForm.vue'
</script>

<template>
  <ExperimentationChrome :last-edited-notice="false">
    <SpecialPageWrapper title="Preferences">
      <template #help>
        <a
          class="preferences-help"
          href="https://en.wikipedia.org/wiki/Help:Preferences"
          rel="noopener noreferrer"
        >
          <CdxIcon size="small" :icon="cdxIconHelpNotice" />
          <span>Help</span>
        </a>
      </template>
      <PreferencesForm />
    </SpecialPageWrapper>
  </ExperimentationChrome>
</template>

<style scoped>
.preferences-help {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50);
  padding: var(--spacing-25) var(--spacing-50);
  color: var(--color-progressive);
  text-decoration: none;
}

.preferences-help:hover {
  text-decoration: underline;
}
</style>
