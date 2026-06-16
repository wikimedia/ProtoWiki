<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxSelect, CdxTextInput } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { CONFIG_THEME_MENU_ITEMS, CONFIG_USER_MENU_ITEMS, formatPageList, parsePageList } from '@/config'

const {
  theme,
  user,
  realUsername,
  apiContact,
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
  <div class="prototype-user-settings-panel">
    <label class="prototype-user-settings-panel__field">
      <span class="prototype-user-settings-panel__label">Theme</span>
      <CdxSelect
        v-model:selected="theme"
        :menu-items="CONFIG_THEME_MENU_ITEMS"
        default-label="Light"
      />
    </label>
    <label class="prototype-user-settings-panel__field">
      <span class="prototype-user-settings-panel__label">User</span>
      <CdxSelect
        v-model:selected="user"
        :menu-items="CONFIG_USER_MENU_ITEMS"
        default-label="New editor"
      />
    </label>
    <label class="prototype-user-settings-panel__field">
      <span class="prototype-user-settings-panel__label">Lang</span>
      <CdxTextInput v-model="lang" class="prototype-user-settings-panel__input" />
    </label>
    <label v-if="user === 'real'" class="prototype-user-settings-panel__field">
      <span class="prototype-user-settings-panel__label">Username</span>
      <CdxTextInput v-model="realUsername" class="prototype-user-settings-panel__input" />
    </label>
    <template v-if="user !== 'real'">
      <label class="prototype-user-settings-panel__field">
        <span class="prototype-user-settings-panel__label">Watchlist</span>
        <div class="prototype-user-settings-panel__row">
          <CdxTextInput v-model="watchlistText" class="prototype-user-settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('watchlist')">
            Reset
          </CdxButton>
        </div>
      </label>
      <label class="prototype-user-settings-panel__field">
        <span class="prototype-user-settings-panel__label">Reading list</span>
        <div class="prototype-user-settings-panel__row">
          <CdxTextInput v-model="readingListText" class="prototype-user-settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('readingList')">
            Reset
          </CdxButton>
        </div>
      </label>
      <label class="prototype-user-settings-panel__field">
        <span class="prototype-user-settings-panel__label">Edited pages</span>
        <div class="prototype-user-settings-panel__row">
          <CdxTextInput v-model="editedPagesText" class="prototype-user-settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('editedPages')">
            Reset
          </CdxButton>
        </div>
      </label>
    </template>

    <hr class="prototype-user-settings-panel__divider" />

    <label class="prototype-user-settings-panel__field">
      <span class="prototype-user-settings-panel__label">API contact</span>
      <CdxTextInput
        v-model="apiContact"
        class="prototype-user-settings-panel__input"
        placeholder="Email or URL for Wikimedia API contact"
      />
    </label>
  </div>
</template>

<style scoped>
.prototype-user-settings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 22rem;
}

.prototype-user-settings-panel__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.prototype-user-settings-panel__input {
  flex: 1;
  min-width: 0;
}

.prototype-user-settings-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.prototype-user-settings-panel__label {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-subtle);
}

.prototype-user-settings-panel__divider {
  margin: 0;
  border: 0;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}
</style>
