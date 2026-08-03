<script setup lang="ts">
import { computed, inject } from 'vue'

import { CdxButton, CdxSelect, CdxTextInput } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { CONFIG_THEME_MENU_ITEMS, CONFIG_USER_MENU_ITEMS, formatPageList, parsePageList } from '@/config'
import {
  WIKITA_UI_SKIN_KEY,
  type WikitaUiSkin,
} from '@/prototypes/musical-group/composables/useWikitaUiSkin'
import { WIKITA_UI_SKIN_MENU_ITEMS } from '@/prototypes/musical-group/data/wikitaUiSkinPreference'

const {
  theme,
  user,
  realUsername,
  apiContact,
  knownLanguagesText,
  lang,
  currentUserPageLists,
  setCurrentUserPageList,
  resetCurrentUserPageListField,
} = useConfig()

const wikitaUiSkin = inject(WIKITA_UI_SKIN_KEY, null)

const wikitaUiSkinModel = computed({
  get: () => wikitaUiSkin?.value ?? 'wikita',
  set: (value: WikitaUiSkin) => {
    if (wikitaUiSkin) wikitaUiSkin.value = value
  },
})

const isWikipediaUiSkin = computed(() => wikitaUiSkin?.value === 'wikipedia')

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
  <div class="user-settings-panel">
    <label v-if="wikitaUiSkin" class="user-settings-panel__field">
      <span class="user-settings-panel__label">Interface</span>
      <CdxSelect
        v-model:selected="wikitaUiSkinModel"
        :menu-items="WIKITA_UI_SKIN_MENU_ITEMS"
        default-label="Wikita"
      />
    </label>
    <label class="user-settings-panel__field">
      <span class="user-settings-panel__label">Theme</span>
      <CdxSelect
        v-model:selected="theme"
        :menu-items="CONFIG_THEME_MENU_ITEMS"
        default-label="Light"
      />
    </label>
    <label v-if="!isWikipediaUiSkin" class="user-settings-panel__field">
      <span class="user-settings-panel__label">User</span>
      <CdxSelect
        v-model:selected="user"
        :menu-items="CONFIG_USER_MENU_ITEMS"
        default-label="New editor"
      />
    </label>
    <label v-if="!isWikipediaUiSkin" class="user-settings-panel__field">
      <span class="user-settings-panel__label">Known languages</span>
      <CdxTextInput
        v-model="knownLanguagesText"
        class="user-settings-panel__input"
        placeholder="fr, de, es"
      />
    </label>
    <label v-if="!isWikipediaUiSkin" class="user-settings-panel__field">
      <span class="user-settings-panel__label">Lang</span>
      <CdxTextInput v-model="lang" class="user-settings-panel__input" />
    </label>
    <label v-if="user === 'real' && !isWikipediaUiSkin" class="user-settings-panel__field">
      <span class="user-settings-panel__label">Username</span>
      <CdxTextInput v-model="realUsername" class="user-settings-panel__input" />
    </label>
    <template v-if="user !== 'real' && !isWikipediaUiSkin">
      <label class="user-settings-panel__field">
        <span class="user-settings-panel__label">Watchlist</span>
        <div class="user-settings-panel__row">
          <CdxTextInput v-model="watchlistText" class="user-settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('watchlist')">
            Reset
          </CdxButton>
        </div>
      </label>
      <label class="user-settings-panel__field">
        <span class="user-settings-panel__label">Reading list</span>
        <div class="user-settings-panel__row">
          <CdxTextInput v-model="readingListText" class="user-settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('readingList')">
            Reset
          </CdxButton>
        </div>
      </label>
      <label class="user-settings-panel__field">
        <span class="user-settings-panel__label">Edited pages</span>
        <div class="user-settings-panel__row">
          <CdxTextInput v-model="editedPagesText" class="user-settings-panel__input" />
          <CdxButton weight="quiet" @click="resetCurrentUserPageListField('editedPages')">
            Reset
          </CdxButton>
        </div>
      </label>
    </template>

    <hr v-if="!isWikipediaUiSkin" class="user-settings-panel__divider" />

    <label v-if="!isWikipediaUiSkin" class="user-settings-panel__field">
      <span class="user-settings-panel__label">API contact</span>
      <CdxTextInput
        v-model="apiContact"
        class="user-settings-panel__input"
        placeholder="Email or URL for Wikimedia API contact"
      />
    </label>
  </div>
</template>

<style scoped>
.user-settings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 22rem;
}

.user-settings-panel__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.user-settings-panel__input {
  flex: 1;
  min-width: 0;
}

.user-settings-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.user-settings-panel__label {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-subtle);
}

.user-settings-panel__divider {
  margin: 0;
  border: 0;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}
</style>
