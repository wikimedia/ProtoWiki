export interface SuggestionPreferences {
  useSavedPages: boolean
  useEditingHistory: boolean
  useInterests: boolean
}

export const DEFAULT_SUGGESTION_PREFERENCES: SuggestionPreferences = {
  useSavedPages: true,
  useEditingHistory: true,
  useInterests: true,
}

const STORAGE_KEY = 'wikita-lite-suggestion-prefs'

function parsePreferences(value: unknown): SuggestionPreferences | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.useSavedPages !== 'boolean' || typeof record.useInterests !== 'boolean') {
    return null
  }
  return {
    useSavedPages: record.useSavedPages,
    useEditingHistory:
      typeof record.useEditingHistory === 'boolean'
        ? record.useEditingHistory
        : DEFAULT_SUGGESTION_PREFERENCES.useEditingHistory,
    useInterests: record.useInterests,
  }
}

export function loadSuggestionPreferences(): SuggestionPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_SUGGESTION_PREFERENCES }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SUGGESTION_PREFERENCES }
    const parsed = JSON.parse(raw) as unknown
    return parsePreferences(parsed) ?? { ...DEFAULT_SUGGESTION_PREFERENCES }
  } catch {
    return { ...DEFAULT_SUGGESTION_PREFERENCES }
  }
}

export function saveSuggestionPreferences(prefs: SuggestionPreferences): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
