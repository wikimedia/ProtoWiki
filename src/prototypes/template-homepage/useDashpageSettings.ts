import { ref, watch, type Ref } from 'vue'

import { wipeLocalStorage } from '@/lib/wipeLocalStorage'

export type EditSuggestionSource = 'structured-tasks' | 'suggestion-mode' | 'suggestion-feed'

export const EDIT_SUGGESTION_SOURCE_MENU_ITEMS: {
  value: EditSuggestionSource
  label: string
}[] = [
  { value: 'structured-tasks', label: 'Structured tasks' },
  { value: 'suggestion-mode', label: 'Suggestion mode' },
  { value: 'suggestion-feed', label: 'Suggestion feed' },
]

const STORAGE_KEY = 'protowiki-dashpage-edit-suggestion-source'
const DEFAULT_EDIT_SUGGESTION_SOURCE: EditSuggestionSource = 'suggestion-mode'
const VALID_SOURCES: EditSuggestionSource[] = [
  'structured-tasks',
  'suggestion-mode',
  'suggestion-feed',
]

function isEditSuggestionSource(value: unknown): value is EditSuggestionSource {
  return typeof value === 'string' && VALID_SOURCES.includes(value as EditSuggestionSource)
}

function loadEditSuggestionSource(): EditSuggestionSource {
  if (typeof window === 'undefined') return DEFAULT_EDIT_SUGGESTION_SOURCE

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isEditSuggestionSource(stored) ? stored : DEFAULT_EDIT_SUGGESTION_SOURCE
  } catch {
    wipeLocalStorage()
    return DEFAULT_EDIT_SUGGESTION_SOURCE
  }
}

function saveEditSuggestionSource(source: EditSuggestionSource): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, source)
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

const editSuggestionSource = ref<EditSuggestionSource>(loadEditSuggestionSource())

watch(editSuggestionSource, (value) => {
  saveEditSuggestionSource(value)
})

export function useDashpageSettings(): {
  editSuggestionSource: Ref<EditSuggestionSource>
} {
  return { editSuggestionSource }
}
