<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CdxButton, CdxIcon, CdxLookup, CdxToggleSwitch, type MenuItemData } from '@wikimedia/codex'
import { cdxIconClose, cdxIconSearch } from '@wikimedia/codex-icons'

import { useConfig } from '@/composables/useConfig'
import InterestsToggleChip from './InterestsToggleChip.vue'
import { buildInterestsSuggestions } from './suggested-edits/data/interestsSearch'
import {
  addInterestsPage,
  applyInterestsSuggestion,
  useInterestsSettings,
} from './suggested-edits/data/useInterestsSettings'

const emit = defineEmits<{
  close: []
}>()

const { user } = useConfig()
const settings = useInterestsSettings()
const isRealUser = computed(() => user.value === 'real')

const watchlistEnabled = computed({
  get: () => (isRealUser.value ? false : settings.value.personalization.watchlist),
  set: (value: boolean) => {
    if (!isRealUser.value) {
      settings.value.personalization.watchlist = value
    }
  },
})

const readingListEnabled = computed({
  get: () => (isRealUser.value ? false : settings.value.personalization.readingList),
  set: (value: boolean) => {
    if (!isRealUser.value) {
      settings.value.personalization.readingList = value
    }
  },
})

const searchInput = ref('')
const searchSelected = ref<string | null>(null)
const menuItems = ref<MenuItemData[]>([])

let abortController: AbortController | null = null
let lastQuery = ''

function onClose(): void {
  emit('close')
}

function clearSearchInput(): void {
  searchInput.value = ''
  searchSelected.value = null
  menuItems.value = []
  lastQuery = ''
}

function onAddFromInput(): void {
  const query = searchInput.value.trim()
  if (!query.length) return

  addInterestsPage(settings.value, query)
  clearSearchInput()
}

async function onSearchInput(value: string): Promise<void> {
  const trimmed = (value ?? '').trim()
  lastQuery = trimmed

  if (!trimmed.length) {
    menuItems.value = []
    return
  }

  abortController?.abort()
  abortController = new AbortController()

  try {
    const suggestions = await buildInterestsSuggestions(trimmed, {
      signal: abortController.signal,
    })
    if (lastQuery !== trimmed) return
    menuItems.value = suggestions
  } catch {
    if (lastQuery === trimmed) {
      menuItems.value = []
    }
  }
}

function onSuggestionSelected(value: string | number | null): void {
  if (value === null) return

  applyInterestsSuggestion(settings.value, value)
  clearSearchInput()
}

watch(searchSelected, (value) => {
  if (value !== null) {
    onSuggestionSelected(value)
  }
})
</script>

<template>
  <div
    class="interests-settings-page"
    role="dialog"
    aria-modal="true"
    aria-labelledby="interests-settings-title"
  >
    <header class="interests-settings-page__header">
      <CdxButton
        weight="quiet"
        :icon-only="true"
        aria-label="Close"
        class="interests-settings-page__header-action"
        @click="onClose"
      >
        <CdxIcon :icon="cdxIconClose" />
      </CdxButton>

      <h1 id="interests-settings-title" class="interests-settings-page__title">Interests</h1>

      <CdxButton
        action="progressive"
        weight="primary"
        class="interests-settings-page__done"
        @click="onClose"
      >
        Done
      </CdxButton>
    </header>

    <div class="interests-settings-page__body">
      <div class="interests-settings-page__content">
        <div class="interests-settings-page__search" @keydown.enter="onAddFromInput">
          <CdxLookup
            v-model:selected="searchSelected"
            v-model:input-value="searchInput"
            :menu-items="menuItems"
            input-type="search"
            :start-icon="cdxIconSearch"
            placeholder="Add an interest"
            class="interests-settings-page__lookup"
            @input="onSearchInput"
          >
            <template #menu-item="{ menuItem }">
              <span class="cdx-menu-item__content">
                <span class="cdx-menu-item__text">
                  <span class="cdx-menu-item__text__label"
                    >{{ menuItem.label }}&nbsp;<span
                      v-if="menuItem.supportingText"
                      class="interests-settings-page__type-badge"
                      >{{ menuItem.supportingText }}</span
                    ></span
                  >
                  <span v-if="menuItem.description" class="cdx-menu-item__text__description">{{
                    menuItem.description
                  }}</span>
                </span>
              </span>
            </template>
          </CdxLookup>
        </div>

        <div class="interests-settings-page__chip-group" role="group" aria-label="Interests">
          <InterestsToggleChip
            v-for="chip in settings.chips"
            :key="`${chip.kind}-${chip.id}`"
            v-model="chip.selected"
            :label="chip.label"
          />
        </div>

        <div class="interests-settings-page__switch-list">
          <div class="interests-settings-page__switch-row">
            <CdxToggleSwitch v-model="settings.personalization.editingHistory" align-switch>
              Show suggestions based on my editing history
            </CdxToggleSwitch>
          </div>
          <div class="interests-settings-page__switch-row">
            <CdxToggleSwitch
              v-model="watchlistEnabled"
              align-switch
              :disabled="isRealUser"
            >
              Show suggestions based on my watchlist
            </CdxToggleSwitch>
          </div>
          <div class="interests-settings-page__switch-row">
            <CdxToggleSwitch
              v-model="readingListEnabled"
              align-switch
              :disabled="isRealUser"
            >
              Show suggestions based on my reading list
            </CdxToggleSwitch>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.interests-settings-page {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.interests-settings-page__header {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--spacing-50, 8px));
  padding-bottom: var(--spacing-50, 8px);
  padding-left: var(--spacing-50, 8px);
  padding-right: 0;
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.interests-settings-page__header-action {
  flex-shrink: 0;
  width: auto;
  margin-inline-start: calc(-1 * var(--spacing-25, 4px));
}

.interests-settings-page__title {
  position: absolute;
  left: 50%;
  flex: none;
  min-width: 0;
  max-width: calc(100% - 8rem);
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: var(--font-family-system-sans, system-ui, sans-serif);
  font-size: var(--font-size-medium, 1rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-medium, 1.375);
  color: var(--color-base, #202122);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  transform: translateX(-50%);
}

.interests-settings-page__done {
  flex-shrink: 0;
  align-self: stretch;
  margin-inline-start: auto;
  margin-top: calc(-1 * var(--spacing-50, 8px));
  margin-bottom: calc(-1 * var(--spacing-50, 8px));
}

.interests-settings-page__done:deep(.cdx-button) {
  height: 100%;
  border-radius: 0;
}

.interests-settings-page__body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.interests-settings-page__content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding: var(--spacing-100, 16px);
}

.interests-settings-page__search {
  width: 100%;
}

.interests-settings-page__lookup {
  width: 100%;
}

.interests-settings-page__lookup :deep(.cdx-text-input__input) {
  min-height: 2.5rem;
}

.interests-settings-page__type-badge {
  display: inline;
  padding: 2px 5px;
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: 99999px;
  font-size: var(--font-size-x-small, 0.75rem);
  color: var(--color-subtle, #54595d);
  vertical-align: 2px;
  white-space: nowrap;
  margin-left: 2px;
}

.interests-settings-page__chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
  padding-bottom: var(--spacing-150, 24px);
}

.interests-settings-page__switch-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-top: var(--spacing-150, 24px);
  border-top: 1px solid var(--border-color-base, #a2a9b1);
}

.interests-settings-page__switch-row {
  display: flex;
  width: 100%;
}

.interests-settings-page__switch-row :deep(.cdx-toggle-switch) {
  flex: 1;
  margin-bottom: 0;
}
</style>
