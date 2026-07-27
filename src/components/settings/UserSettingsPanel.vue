<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxSelect, CdxTextInput } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { CONFIG_USER_MENU_ITEMS, formatPageList, parsePageList } from '@/config'

import './settingsPanel.css'

const {
  user,
  realUsername,
  lang,
  currentUserPageLists,
  setCurrentUserPageList,
  resetCurrentUserPageListField,
} = useConfig()

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
    <label class="settings-panel__field">
      <span class="settings-panel__label">Account</span>
      <CdxSelect
        v-model:selected="user"
        :menu-items="CONFIG_USER_MENU_ITEMS"
        default-label="New editor"
      />
    </label>
    <label class="settings-panel__field">
      <span class="settings-panel__label">Wiki</span>
      <CdxTextInput v-model="lang" class="settings-panel__input" />
    </label>
    <label v-if="user === 'real'" class="settings-panel__field">
      <span class="settings-panel__label">Username</span>
      <CdxTextInput v-model="realUsername" class="settings-panel__input" />
    </label>
    <template v-if="user !== 'real'">
      <label class="settings-panel__field">
        <span class="settings-panel__label">Watchlist</span>
        <div class="settings-panel__row">
          <CdxTextInput v-model="watchlistText" class="settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('watchlist')">
            Reset
          </CdxButton>
        </div>
      </label>
      <label class="settings-panel__field">
        <span class="settings-panel__label">Reading list</span>
        <div class="settings-panel__row">
          <CdxTextInput v-model="readingListText" class="settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('readingList')">
            Reset
          </CdxButton>
        </div>
      </label>
      <label class="settings-panel__field">
        <span class="settings-panel__label">Edited pages</span>
        <div class="settings-panel__row">
          <CdxTextInput v-model="editedPagesText" class="settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('editedPages')">
            Reset
          </CdxButton>
        </div>
      </label>
    </template>
  </div>
</template>

<style scoped>
.user-settings-panel {
  display: inline-flex;
  align-items: stretch;
  width: auto;
  min-width: var(--size-2400);
}

.user-settings-panel .settings-panel__row {
  width: 100%;
}

.user-settings-panel :deep(.cdx-select),
.user-settings-panel :deep(.cdx-text-input) {
  width: 100%;
}
</style>
