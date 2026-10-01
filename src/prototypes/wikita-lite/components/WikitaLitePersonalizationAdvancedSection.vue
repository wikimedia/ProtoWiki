<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import { CdxAccordion, CdxButton, CdxField, CdxTextInput } from '@wikimedia/codex'
import type { ValidationStatusType } from '@wikimedia/codex'

import { useConfig } from '@/composables/useConfig'
import { t } from '@/i18n'
import {
  backfillReadingListSavedAt,
  formatPageList,
  normalizeWikiUsername,
  parsePageList,
} from '@/config'

import {
  FetchUserEditedPagesError,
  fetchUserEditedPages,
} from '../data/fetchUserEditedPages'
import { useWikitaLiteUrlState } from '../composables/useWikitaLiteUrlState'

interface Props {
  /** Accordion label. */
  title?: string
  /** Sits under the label, so it reads while the accordion is collapsed. */
  description?: string
}

withDefaults(defineProps<Props>(), {
  title: () => t('components.advancedTitle'),
  description: () => t('components.advancedDescription'),
})

const {
  currentUserPageLists,
  setCurrentUserPageList,
  setReadingListWithTimestamps,
} = useConfig()
const { patchState } = useWikitaLiteUrlState()

const fetchUsername = ref('')
const fetchingEditedPages = ref(false)
const fetchEditedPagesStatus = ref<ValidationStatusType>('default')
const fetchEditedPagesMessage = ref('')

let fetchAbortController: AbortController | null = null

async function onFetchEditedPages(): Promise<void> {
  fetchAbortController?.abort()
  fetchAbortController = new AbortController()
  const { signal } = fetchAbortController

  fetchingEditedPages.value = true
  fetchEditedPagesStatus.value = 'default'
  fetchEditedPagesMessage.value = ''

  try {
    const titles = await fetchUserEditedPages(fetchUsername.value, signal)
    setCurrentUserPageList('editedPages', titles)
    // Patch both together: the URL re-hydrates config, so `edited` must land with
    // `editedFrom`. `editedFrom` lets the impact module show this account's real impact.
    void patchState({ edited: titles, editedFrom: normalizeWikiUsername(fetchUsername.value) })
    fetchEditedPagesStatus.value = 'success'
    fetchEditedPagesMessage.value = t('components.addedEditedPages', titles.length)
  } catch (error) {
    if ((error as Error).name === 'AbortError') return
    if (error instanceof FetchUserEditedPagesError && error.code === 'aborted') return
    fetchEditedPagesStatus.value = 'error'
    fetchEditedPagesMessage.value =
      error instanceof FetchUserEditedPagesError
        ? error.message
        : t('components.fetchHistoryError')
  } finally {
    fetchingEditedPages.value = false
  }
}

onBeforeUnmount(() => {
  fetchAbortController?.abort()
})

const watchlistText = computed({
  get: () => formatPageList(currentUserPageLists.value.watchlist),
  set: (value: string) => setCurrentUserPageList('watchlist', parsePageList(value)),
})

const editedPagesText = computed({
  get: () => formatPageList(currentUserPageLists.value.editedPages),
  set: (value: string) => setCurrentUserPageList('editedPages', parsePageList(value)),
})

const readingListText = computed({
  get: () => formatPageList(currentUserPageLists.value.readingList),
  set: (value: string) => {
    const titles = parsePageList(value)
    const savedAt = backfillReadingListSavedAt(
      titles,
      currentUserPageLists.value.readingListSavedAt,
    )
    setReadingListWithTimestamps(titles, savedAt)
  },
})
</script>

<template>
  <CdxAccordion class="wikita-lite-personalization-advanced" separation="minimal">
    <template #title>{{ title }}</template>
    <template #description>{{ description }}</template>

    <div class="wikita-lite-personalization-advanced__fields">
      <CdxField>
        <template #label>{{ t('components.watchlist') }}</template>
        <template #description>{{ t('components.commaSeparatedTitles') }}</template>
        <CdxTextInput v-model="watchlistText" />
      </CdxField>

      <CdxField
        :status="fetchEditedPagesStatus"
        :messages="{ [fetchEditedPagesStatus]: fetchEditedPagesMessage }"
      >
        <template #label>{{ t('components.fetchHistoryLabel') }}</template>
        <div class="wikita-lite-personalization-advanced__fetch-row">
          <CdxTextInput
            v-model="fetchUsername"
            class="wikita-lite-personalization-advanced__fetch-input"
            :placeholder="t('components.usernamePlaceholder')"
            :aria-label="t('components.usernameLabel')"
            :disabled="fetchingEditedPages"
            @keydown.enter.prevent="onFetchEditedPages"
          />
          <CdxButton
            action="progressive"
            :disabled="fetchingEditedPages || !fetchUsername.trim()"
            @click="onFetchEditedPages"
          >
            {{ t('components.fetch') }}
          </CdxButton>
        </div>
      </CdxField>

      <CdxField>
        <template #label>{{ t('components.editedPages') }}</template>
        <template #description>{{ t('components.commaSeparatedTitles') }}</template>
        <CdxTextInput v-model="editedPagesText" />
      </CdxField>

      <CdxField>
        <template #label>{{ t('components.overrideSavedPages') }}</template>
        <template #description>{{ t('components.commaSeparatedTitles') }}</template>
        <CdxTextInput v-model="readingListText" />
      </CdxField>
    </div>
  </CdxAccordion>
</template>

<style scoped>
/*.wikita-lite-personalization-advanced__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100, 16px);
  padding-top: var(--spacing-75, 12px);
}*/

.wikita-lite-personalization-advanced :deep(.cdx-text-input) {
  width: 100%;
}

.wikita-lite-personalization-advanced__fetch-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}

.wikita-lite-personalization-advanced__fetch-input {
  flex: 1;
  min-width: 0;
}
</style>
