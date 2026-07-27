<script setup lang="ts">
definePage({
  meta: {
    title: 'ProtoWiki',
    description: 'Prototype index',
  },
})

import { useRouter } from 'vue-router'

import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconAppearance, cdxIconUserAvatar } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'
import AppearanceSettingsPanel from '@/components/settings/AppearanceSettingsPanel.vue'
import SettingsPopover from '@/components/settings/SettingsPopover.vue'
import UserSettingsPanel from '@/components/settings/UserSettingsPanel.vue'
import { usePrototypeGallery } from '@/composables/usePrototypeGallery'

const router = useRouter()
const { primaryEntries, secondaryEntries, showDivider } = usePrototypeGallery()
</script>

<template>
  <PlainWrapper heading="ProtoWiki">
    <template #actions>
      <div class="prototype-index__settings-toolbar">
        <SettingsPopover>
          <template #default="{ toggle, open }">
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Appearance"
              :aria-expanded="open"
              @click="toggle"
            >
              <CdxIcon :icon="cdxIconAppearance" />
            </CdxButton>
          </template>
          <template #panel>
            <AppearanceSettingsPanel />
          </template>
        </SettingsPopover>
        <SettingsPopover>
          <template #default="{ toggle, open }">
            <CdxButton
              weight="quiet"
              :icon-only="true"
              aria-label="Account"
              :aria-expanded="open"
              @click="toggle"
            >
              <CdxIcon :icon="cdxIconUserAvatar" />
            </CdxButton>
          </template>
          <template #panel>
            <UserSettingsPanel />
          </template>
        </SettingsPopover>
      </div>
    </template>
    <div class="prototype-index">
      <div class="prototype-index__list">
        <div v-for="entry in primaryEntries" :key="entry.path" class="prototype-index__card">
          <CdxCard :url="router.resolve({ path: entry.path }).href">
            <template #title>{{ entry.title }}</template>
            <template v-if="entry.description" #description>{{ entry.description }}</template>
          </CdxCard>
        </div>

        <hr v-if="showDivider" class="prototype-index__divider" />

        <div v-for="entry in secondaryEntries" :key="entry.path" class="prototype-index__card">
          <CdxCard :url="router.resolve({ path: entry.path }).href">
            <template #title>{{ entry.title }}</template>
            <template v-if="entry.description" #description>{{ entry.description }}</template>
          </CdxCard>
        </div>
      </div>
    </div>
  </PlainWrapper>
</template>

<style scoped>
.prototype-index__settings-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.prototype-index__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.prototype-index__card {
  min-width: 0;
}

.prototype-index__divider {
  margin: var(--spacing-50) 0;
  border: 0;
  border-top: 1px solid var(--border-color-subtle);
}
</style>
