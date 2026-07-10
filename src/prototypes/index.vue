<script setup lang="ts">
definePage({
  meta: {
    title: 'ProtoWiki',
    description: 'Prototype index',
  },
})

import { useRouter } from 'vue-router'

import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconConfigure } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'
import UserSettingsPopover from '@/components/settings/UserSettingsPopover.vue'
import { usePrototypeGallery } from '@/composables/usePrototypeGallery'

const router = useRouter()
const { primaryEntries, secondaryEntries, showDivider } = usePrototypeGallery()
</script>

<template>
  <PlainWrapper heading="ProtoWiki">
    <template #actions>
      <UserSettingsPopover v-slot="{ toggle, open }">
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Settings"
          :aria-expanded="open"
          @click="toggle"
        >
          <CdxIcon :icon="cdxIconConfigure" />
        </CdxButton>
      </UserSettingsPopover>
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
