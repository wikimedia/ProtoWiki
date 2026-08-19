<script setup lang="ts">
definePage({
  meta: {
    title: 'ProtoWiki',
    description: 'Prototype index',
  },
})

import { useRouter } from 'vue-router'

import { CdxButton, CdxCard, CdxIcon, CdxInfoChip, CdxTab, CdxTabs } from '@wikimedia/codex'
import { cdxIconAppearance, cdxIconUserAvatar } from '@wikimedia/codex-icons'

import PlainWrapper from '@/components/PlainWrapper.vue'
import AppearanceSettingsPanel from '@/components/settings/AppearanceSettingsPanel.vue'
import SettingsPopover from '@/components/settings/SettingsPopover.vue'
import UserSettingsPanel from '@/components/settings/UserSettingsPanel.vue'
import { useGalleryTab } from '@/composables/useGalleryTab'
import { usePrototypeGallery } from '@/composables/usePrototypeGallery'
import { PROTOWIKI_API_PROJECT_URL, PROTOWIKI_LICENSE_URL } from '@/config'
import { GALLERY_TABS } from '@/prototype-gallery'

const router = useRouter()
const { galleryTab } = useGalleryTab()
const { entries, webTemplateEntries, appTemplateEntries } = usePrototypeGallery(galleryTab)

const docsUrl = `${PROTOWIKI_API_PROJECT_URL}#prototyping-system`
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
      <CdxTabs v-model:active="galleryTab" class="prototype-index__tabs">
        <CdxTab v-for="tab in GALLERY_TABS" :key="tab.value" :name="tab.value" :label="tab.label">
          <div v-if="galleryTab === tab.value" class="prototype-index__list">
            <template v-if="tab.value === 'template'">
              <h3 v-if="webTemplateEntries.length" class="prototype-index__section-heading">
                Web templates
              </h3>
              <div
                v-for="entry in webTemplateEntries"
                :key="entry.path"
                class="prototype-index__card"
              >
                <CdxCard :url="router.resolve({ path: entry.path }).href">
                  <template #title>{{ entry.title }}</template>
                  <template v-if="entry.description" #description>{{ entry.description }}</template>
                  <template #supporting-text>
                    <div class="prototype-index__chips">
                      <CdxInfoChip status="subtle">{{ entry.platformLabel }}</CdxInfoChip>
                      <CdxInfoChip v-if="entry.supportingText" status="subtle">{{
                        entry.supportingText
                      }}</CdxInfoChip>
                    </div>
                  </template>
                </CdxCard>
              </div>

              <h3 v-if="appTemplateEntries.length" class="prototype-index__section-heading">
                App templates
              </h3>
              <div
                v-for="entry in appTemplateEntries"
                :key="entry.path"
                class="prototype-index__card"
              >
                <CdxCard :url="router.resolve({ path: entry.path }).href">
                  <template #title>{{ entry.title }}</template>
                  <template v-if="entry.description" #description>{{ entry.description }}</template>
                  <template #supporting-text>
                    <div class="prototype-index__chips">
                      <CdxInfoChip status="subtle">{{ entry.platformLabel }}</CdxInfoChip>
                      <CdxInfoChip v-if="entry.supportingText" status="subtle">{{
                        entry.supportingText
                      }}</CdxInfoChip>
                    </div>
                  </template>
                </CdxCard>
              </div>
            </template>

            <template v-else>
              <p v-if="tab.value === 'prototype' && !entries.length" class="prototype-index__empty">
                This is where your prototype(s) will appear when you make one. For information on
                how to get started, check out the
                <a :href="docsUrl" target="_blank" rel="noopener noreferrer">docs</a>. Or browse the
                <RouterLink :to="{ query: { category: 'template' } }">templates</RouterLink> to pick
                a good starting point.
              </p>
              <div v-for="entry in entries" :key="entry.path" class="prototype-index__card">
                <CdxCard :url="router.resolve({ path: entry.path }).href">
                  <template #title>{{ entry.title }}</template>
                  <template v-if="entry.description" #description>{{ entry.description }}</template>
                  <template #supporting-text>
                    <div class="prototype-index__chips">
                      <CdxInfoChip status="subtle">{{ entry.platformLabel }}</CdxInfoChip>
                      <CdxInfoChip v-if="entry.supportingText" status="subtle">{{
                        entry.supportingText
                      }}</CdxInfoChip>
                    </div>
                  </template>
                </CdxCard>
              </div>
            </template>
          </div>
        </CdxTab>
      </CdxTabs>

      <footer>
        <p>
          <a :href="PROTOWIKI_API_PROJECT_URL" rel="noopener noreferrer">Source</a>
          <br />
          <a :href="PROTOWIKI_LICENSE_URL" rel="noopener noreferrer">License</a>
        </p>
      </footer>
    </div>
  </PlainWrapper>
</template>

<style scoped>
.prototype-index__settings-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.prototype-index__tabs {
  margin-top: var(--spacing-50);
}

.prototype-index__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
  margin-top: var(--spacing-75);
}

.prototype-index__card {
  min-width: 0;
}

.prototype-index__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-25);
}

.prototype-index__section-heading {
  margin: var(--spacing-100) 0 0;
}

.prototype-index__empty {
  margin: var(--spacing-100) 0 0;
}

footer {
  margin-top: var(--spacing-200);
}
</style>
