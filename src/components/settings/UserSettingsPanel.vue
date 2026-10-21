<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import {
  CdxButton,
  CdxField,
  CdxProgressBar,
  CdxSelect,
  CdxTextInput,
  CdxTooltip as vTooltip,
} from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { usePageListFieldUiState } from '@/composables/usePageListFieldUiState'
import { useResolveUserPageList } from '@/composables/useResolveUserPageList'
import {
  CONFIG_MOCK_EDITOR_EDIT_COUNT_SELECT_ITEMS,
  CONFIG_USER_MENU_ITEMS,
  formatPageList,
  normalizeLang,
  normalizeWikiUsername,
  parsePageList,
  PAGE_LIST_FIELD_KEYS,
  type PageListKey,
} from '@/config'
import { useRealUserEditedPages } from '@/composables/useRealUserEditedPages'
import { REAL_USER_EDITED_PAGES_FIELD_DESCRIPTION } from '@/prototypes/template-homepage/impact/data/fetchUserImpact'
import { wikiPageNotFoundMessage } from '@/utils/wikiPageTitles'

import './settingsPanel.css'

const realUserEditedPagesDescription = REAL_USER_EDITED_PAGES_FIELD_DESCRIPTION

/** Avoid browser autofill on comma-separated page lists (Codex passes attrs to `<input>`). */
const pageListInputAttrs = {
  autocomplete: 'off',
  autocapitalize: 'off',
  spellcheck: 'false',
  'data-1p-ignore': '',
  'data-lpignore': 'true',
  'data-form-type': 'other',
} as const

const props = defineProps<{
  /** From {@link SettingsPopover} — used to commit page-list normalization on dismiss. */
  settingsOpen?: boolean
}>()

const {
  user,
  realUsername,
  lang,
  currentUserPageLists,
  isCurrentUserPageListsModified,
  resetCurrentUserPageLists,
  mockEditorEditCount,
} = useConfig()

const { commitPageListField, commitTrustedPageListField } = useResolveUserPageList()
const realEditedPages = useRealUserEditedPages(realUsername, lang)
const {
  clearPageListUiState,
  markPageListDirty,
  pageListFieldStatus,
  pageListNotFoundTitles,
  setPageListNotFound,
  isNormalizingPageList,
  setPageListDraft,
  getPageListDraft,
  isPageListDirty,
  markPageListClean,
  withPageListNormalization,
} = usePageListFieldUiState()

function pageListDisplayText(field: PageListKey): string {
  const draft = getPageListDraft(field)
  if (draft !== undefined) return draft
  return formatPageList(currentUserPageLists.value[field])
}

function pageListNotFoundMessages(field: PageListKey): string[] {
  return pageListNotFoundTitles(field).map((title) => wikiPageNotFoundMessage(title))
}

function shouldNormalizePageListField(field: PageListKey): boolean {
  if (user.value === 'logged-out') return false
  if (field === 'editedPages' && user.value === 'real') return false
  return true
}

async function runNormalizePageListField(field: PageListKey): Promise<void> {
  if (!shouldNormalizePageListField(field)) return
  if (!isPageListDirty(field)) return
  if (isNormalizingPageList(field)) return

  const draftBeforeCommit = pageListDisplayText(field)
  await withPageListNormalization(field, async () => {
    try {
      const titles = parsePageList(draftBeforeCommit)
      const { notFound, committed } = await commitPageListField(field, titles)
      if (notFound.length) {
        setPageListNotFound(field, notFound)
        setPageListDraft(field, draftBeforeCommit)
      } else {
        setPageListNotFound(field, [])
        if (committed) setPageListDraft(field, undefined)
      }
      markPageListClean(field)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  })
}

function commitDirtyPageListField(field: PageListKey): void {
  void runNormalizePageListField(field)
}

async function onPageListFieldBlur(field: PageListKey): Promise<void> {
  await runNormalizePageListField(field)
}

function onPageListFieldEnter(field: PageListKey, event: KeyboardEvent): void {
  event.preventDefault()
  if (!isPageListDirty(field)) return
  commitDirtyPageListField(field)
  if (event.target instanceof HTMLElement) {
    event.target.blur()
  }
}

async function flushDirtyPageLists(): Promise<void> {
  if (user.value === 'logged-out') return
  for (const field of PAGE_LIST_FIELD_KEYS) {
    if (!isPageListDirty(field)) continue
    await runNormalizePageListField(field)
  }
}

const committedRealUsername = ref('')
const committedRealLang = ref('')

function syncRealUserIdentityBaseline(): void {
  committedRealUsername.value = normalizeWikiUsername(realUsername.value)
  committedRealLang.value = normalizeLang(lang.value)
}

function isRealUserIdentityDirty(): boolean {
  if (user.value !== 'real') return false
  return (
    normalizeWikiUsername(realUsername.value) !== committedRealUsername.value ||
    normalizeLang(lang.value) !== committedRealLang.value
  )
}

async function commitRealUserIdentityIfDirty(): Promise<void> {
  if (!isRealUserIdentityDirty()) return
  if (!normalizeWikiUsername(realUsername.value).length) return
  await realEditedPages.refresh()
  syncRealUserIdentityBaseline()
}

async function flushRealUserIdentityIfDirty(): Promise<void> {
  await commitRealUserIdentityIfDirty()
}

watch(
  () => props.settingsOpen,
  (open, wasOpen) => {
    if (wasOpen === true && open === false) {
      void flushDirtyPageLists()
      void flushRealUserIdentityIfDirty()
    }
  },
)

watch(
  () => user.value,
  (preset, previousPreset) => {
    clearPageListUiState()
    if (preset !== 'real') return
    syncRealUserIdentityBaseline()
    if (previousPreset != null && previousPreset !== 'real') {
      void realEditedPages.refresh()
    }
  },
  { immediate: true },
)

watch(
  () => realEditedPages.editedPageTitles.value,
  (titles) => {
    if (user.value !== 'real') return
    if (!titles.length) return
    commitTrustedPageListField('editedPages', titles)
  },
)

function onRealUserIdentityBlur(): void {
  void commitRealUserIdentityIfDirty()
}

function onWikiFieldBlur(): void {
  void commitRealUserIdentityIfDirty()
}

function onRealUserIdentityEnter(event: KeyboardEvent): void {
  event.preventDefault()
  if (!isRealUserIdentityDirty()) return
  void commitRealUserIdentityIfDirty().then(() => {
    if (event.target instanceof HTMLElement) event.target.blur()
  })
}

onBeforeUnmount(() => {
  void flushDirtyPageLists()
  void flushRealUserIdentityIfDirty()
})

const userMenuItems = computed(() =>
  CONFIG_USER_MENU_ITEMS.map((item) =>
    item.value === user.value && isCurrentUserPageListsModified.value
      ? { ...item, label: `${item.label} (modified)` }
      : item,
  ),
)

const realUserEditedPageTitles = computed(() => {
  if (realEditedPages.editedPageTitles.value.length) return realEditedPages.editedPageTitles.value
  return currentUserPageLists.value.editedPages
})

const watchlistText = computed({
  get: () => pageListDisplayText('watchlist'),
  set: (value: string) => {
    setPageListDraft('watchlist', value)
    markPageListDirty('watchlist')
  },
})

const readingListText = computed({
  get: () => pageListDisplayText('readingList'),
  set: (value: string) => {
    setPageListDraft('readingList', value)
    markPageListDirty('readingList')
  },
})

const editedPagesText = computed({
  get: () =>
    user.value === 'real'
      ? formatPageList(realUserEditedPageTitles.value)
      : pageListDisplayText('editedPages'),
  set: (value: string) => {
    if (user.value === 'real') return
    setPageListDraft('editedPages', value)
    markPageListDirty('editedPages')
  },
})

const realEditedPagesLoading = computed(() => user.value === 'real' && realEditedPages.loading.value)

async function onRefreshRealEditedPages(): Promise<void> {
  await commitRealUserIdentityIfDirty()
  await realEditedPages.refresh()
}
</script>

<template>
  <div class="settings-panel user-settings-panel">
    <div class="settings-panel__intro">
      <h2 class="settings-panel__title">Mock user settings</h2>
      <p class="settings-panel__description">
        Preview supported prototypes from the perspective of different users.
      </p>
    </div>
    <form class="user-settings-panel__fields" autocomplete="off" @submit.prevent>
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
            @click="
              () => {
                resetCurrentUserPageLists()
                clearPageListUiState()
                if (user === 'real') {
                  syncRealUserIdentityBaseline()
                  void realEditedPages.refresh()
                }
              }
            "
          >
            Reset
          </CdxButton>
        </div>
      </CdxField>
      <CdxField class="user-settings-panel__wiki-field">
        <template #label>Wiki</template>
        <CdxTextInput
          v-model="lang"
          class="settings-panel__input"
          @blur="onWikiFieldBlur"
          @keydown="(event) => event.key === 'Enter' && onRealUserIdentityEnter(event)"
        />
      </CdxField>
      <CdxField v-if="user !== 'logged-out' && user !== 'real'">
        <template #label>Edits</template>
        <CdxSelect
          v-model:selected="mockEditorEditCount"
          class="settings-panel__input"
          :menu-items="CONFIG_MOCK_EDITOR_EDIT_COUNT_SELECT_ITEMS"
        />
      </CdxField>
      <CdxField v-if="user === 'real'">
        <template #label>Username</template>
        <CdxTextInput
          v-model="realUsername"
          class="settings-panel__input"
          @blur="onRealUserIdentityBlur"
          @keydown="(event) => event.key === 'Enter' && onRealUserIdentityEnter(event)"
        />
      </CdxField>
      <template v-if="user !== 'logged-out'">
        <CdxField :status="pageListFieldStatus('editedPages')">
          <template #label>Edited articles</template>
          <template v-if="user === 'real'" #description>
            {{ realUserEditedPagesDescription }}
          </template>
          <div v-if="user === 'real'" class="settings-panel__row">
            <CdxTextInput
              v-model="editedPagesText"
              v-bind="pageListInputAttrs"
              class="settings-panel__input"
              disabled
              readonly
            />
            <CdxButton
              weight="quiet"
              :disabled="realEditedPagesLoading"
              @click="() => void onRefreshRealEditedPages()"
            >
              Refresh
            </CdxButton>
          </div>
          <CdxTextInput
            v-else
            v-model="editedPagesText"
            v-bind="pageListInputAttrs"
            class="settings-panel__input"
            :disabled="isNormalizingPageList('editedPages')"
            @blur="onPageListFieldBlur('editedPages')"
            @keydown="(event) => event.key === 'Enter' && onPageListFieldEnter('editedPages', event)"
          />
          <template v-if="realEditedPagesLoading" #help-text>
            <CdxProgressBar inline aria-label="Loading edited articles from Wikipedia" />
          </template>
          <template v-else-if="isNormalizingPageList('editedPages')" #help-text>
            <CdxProgressBar inline aria-label="Resolving page titles" />
          </template>
          <template v-else-if="pageListNotFoundMessages('editedPages').length" #help-text>
            <ul class="user-settings-panel__page-list-errors" role="alert">
              <li v-for="message in pageListNotFoundMessages('editedPages')" :key="message">
                {{ message }}
              </li>
            </ul>
          </template>
        </CdxField>
        <CdxField :status="pageListFieldStatus('readingList')">
          <template #label>Saved</template>
          <CdxTextInput
            v-model="readingListText"
            v-bind="pageListInputAttrs"
            class="settings-panel__input"
            :disabled="isNormalizingPageList('readingList')"
            @blur="onPageListFieldBlur('readingList')"
            @keydown="(event) => event.key === 'Enter' && onPageListFieldEnter('readingList', event)"
          />
          <template v-if="isNormalizingPageList('readingList')" #help-text>
            <CdxProgressBar inline aria-label="Resolving page titles" />
          </template>
          <template v-else-if="pageListNotFoundMessages('readingList').length" #help-text>
            <ul class="user-settings-panel__page-list-errors" role="alert">
              <li v-for="message in pageListNotFoundMessages('readingList')" :key="message">
                {{ message }}
              </li>
            </ul>
          </template>
        </CdxField>
        <CdxField :status="pageListFieldStatus('watchlist')">
          <template #label>Watchlist</template>
          <CdxTextInput
            v-model="watchlistText"
            v-bind="pageListInputAttrs"
            class="settings-panel__input"
            :disabled="isNormalizingPageList('watchlist')"
            @blur="onPageListFieldBlur('watchlist')"
            @keydown="(event) => event.key === 'Enter' && onPageListFieldEnter('watchlist', event)"
          />
          <template v-if="isNormalizingPageList('watchlist')" #help-text>
            <CdxProgressBar inline aria-label="Resolving page titles" />
          </template>
          <template v-else-if="pageListNotFoundMessages('watchlist').length" #help-text>
            <ul class="user-settings-panel__page-list-errors" role="alert">
              <li v-for="message in pageListNotFoundMessages('watchlist')" :key="message">
                {{ message }}
              </li>
            </ul>
          </template>
        </CdxField>
      </template>
    </form>
  </div>
</template>

<style scoped>
.user-settings-panel {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  max-width: var(--size-2400);
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

.user-settings-panel__page-list-errors {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--color-error, #bf311a);
}
</style>
