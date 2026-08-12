import {
  DEFAULT_SUGGESTION_PREFERENCES,
  type SuggestionPreferences,
} from '../../musical-group/data/suggestionPreferences'
import type { WikitaLiteModuleId } from './homeModuleIds'

export interface ModuleSuggestionConfig {
  useDefaultSettings: boolean
  preferences: SuggestionPreferences
  interests: string[]
}

export type ModuleSuggestionPreferencesMap = Partial<
  Record<WikitaLiteModuleId, ModuleSuggestionConfig>
>

const STORAGE_KEY = 'wikita-lite-module-suggestion-prefs'

export const DEFAULT_MODULE_SUGGESTION_CONFIG: ModuleSuggestionConfig = {
  useDefaultSettings: true,
  preferences: { ...DEFAULT_SUGGESTION_PREFERENCES },
  interests: [],
}

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

function parseInterests(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const titles: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim().length) {
      titles.push(item.trim())
    }
  }
  return titles
}

function parseModuleConfig(value: unknown): ModuleSuggestionConfig | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.useDefaultSettings !== 'boolean') return null
  const preferences = parsePreferences(record.preferences)
  if (!preferences) return null
  const interests = parseInterests(record.interests) ?? []
  return {
    useDefaultSettings: record.useDefaultSettings,
    preferences,
    interests,
  }
}

function parseStoredMap(value: unknown): ModuleSuggestionPreferencesMap | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const map: ModuleSuggestionPreferencesMap = {}

  for (const [moduleId, entry] of Object.entries(record)) {
    const config = parseModuleConfig(entry)
    if (config) {
      map[moduleId as WikitaLiteModuleId] = config
    }
  }

  return map
}

export function loadModuleSuggestionPreferences(): ModuleSuggestionPreferencesMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parseStoredMap(parsed) ?? {}
  } catch {
    return {}
  }
}

export function saveModuleSuggestionPreferences(map: ModuleSuggestionPreferencesMap): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function loadModuleSuggestionConfig(moduleId: WikitaLiteModuleId): ModuleSuggestionConfig {
  const stored = loadModuleSuggestionPreferences()[moduleId]
  if (!stored) {
    return {
      ...DEFAULT_MODULE_SUGGESTION_CONFIG,
      preferences: { ...DEFAULT_SUGGESTION_PREFERENCES },
      interests: [],
    }
  }
  return {
    useDefaultSettings: stored.useDefaultSettings,
    preferences: { ...stored.preferences },
    interests: [...stored.interests],
  }
}
