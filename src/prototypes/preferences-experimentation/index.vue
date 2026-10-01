<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconHelpNotice } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'

import PreferencesForm from './PreferencesForm.vue'

definePage({
  meta: {
    title: 'Experimentation preferences',
    description:
      'Prototyping a new preferences section to inform users and allow them to opt-out from experimentation.',
    category: 'prototype',
    platform: 'web',
  },
})
</script>

<template>
  <ChromeWrapper username="ExampleUser" :last-edited-notice="false">
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
  </ChromeWrapper>
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
