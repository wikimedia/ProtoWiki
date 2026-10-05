<script setup lang="ts">
import { computed } from 'vue'

import {
  CdxButton,
  CdxField,
  CdxSelect,
  CdxTextInput,
  CdxTooltip as vTooltip,
} from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { CONFIG_USER_MENU_ITEMS, formatPageList, parsePageList } from '@/config'

import './settingsPanel.css'

const {
  user,
  realUsername,
  lang,
  currentUserPageLists,
  isCurrentUserPageListsModified,
  setCurrentUserPageList,
  resetCurrentUserPageLists,
} = useConfig()

const userMenuItems = computed(() =>
  CONFIG_USER_MENU_ITEMS.map((item) =>
    item.value === user.value && isCurrentUserPageListsModified.value
      ? { ...item, label: `${item.label} (modified)` }
      : item,
  ),
)

const watchlistText = computed({
  get: () => formatPageList(currentUserPageLists.value.watchlist),
  set: (value: string) => setCurrentUserPageList('watchlist', parsePageList(value)),
})

const readingListText = computed({
  get: () => formatPageList(currentUserPageLists.value.readingList),
  set: (value: string) => setCurrentUserPageList('readingList', parsePageList(value)),
})

const editedPagesText = computed({
  get: () => formatPageList(currentUserPageLists.value.editedPages),
  set: (value: string) => setCurrentUserPageList('editedPages', parsePageList(value)),
})
</script>

<template>
  <div class="settings-panel user-settings-panel">
    <div class="settings-panel__intro">
      <h2 class="settings-panel__title">Mock user settings</h2>
      <p class="settings-panel__description">
        Preview supported prototypes from the perspective of different users.
      </p>
    </div>
    <div class="user-settings-panel__fields">
      <CdxField>
        <template #label>Preset</template>
        <div class="settings-panel__row">
          <CdxSelect
            v-model:selected="user"
            class="settings-panel__input"
            :menu-items="userMenuItems"
            default-label="New user"
          />
          <CdxButton
            v-tooltip="!isCurrentUserPageListsModified ? 'Already set to default' : undefined"
            weight="quiet"
            :disabled="!isCurrentUserPageListsModified"
            @click="resetCurrentUserPageLists"
          >
            Reset
          </CdxButton>
        </div>
      </CdxField>
      <CdxField class="user-settings-panel__wiki-field">
        <template #label>Wiki</template>
        <CdxTextInput v-model="lang" class="settings-panel__input" />
      </CdxField>
      <CdxField v-if="user === 'real'">
        <template #label>Username</template>
        <CdxTextInput v-model="realUsername" class="settings-panel__input" />
      </CdxField>
      <template v-if="user !== 'real' && user !== 'logged-out'">
        <CdxField>
          <template #label>Watchlist</template>
          <CdxTextInput v-model="watchlistText" class="settings-panel__input" />
        </CdxField>
        <CdxField>
          <template #label>Saved pages</template>
          <CdxTextInput v-model="readingListText" class="settings-panel__input" />
        </CdxField>
        <CdxField>
          <template #label>Edited pages</template>
          <CdxTextInput v-model="editedPagesText" class="settings-panel__input" />
        </CdxField>
      </template>
    </div>
  </div>
</template>

<style scoped>
.user-settings-panel {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  max-width: var(--size-2800);
}

.user-settings-panel__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.user-settings-panel__wiki-field {
  width: var(--size-800);
}

.user-settings-panel .settings-panel__row {
  width: 100%;
}

.user-settings-panel :deep(.cdx-select),
.user-settings-panel :deep(.cdx-text-input) {
  width: 100%;
}
</style>
