import { reactive, watch } from 'vue'

import { protowikiConfig } from '@/appearance'
import { isConfigMockEditorEditCount } from '@/config'

import { SUGGESTION_TYPES, type SuggestionTypeId } from './engine/checks'

/**
 * Suggestion mode settings, edited from the gallery toolbar or VE main menu.
 * Persisted
 * per browser (a convenience only — the prototype works without storage).
 */
export interface SuggestionSettings {
  /** Master switch: suggestion detection, Edit Check, and the toolbar lightbulb in the VE prototype. */
  enabled: boolean
  /** `null` = every detected suggestion, as production does (99+ cap in the badge only). */
  limit: number | null
  types: Record<SuggestionTypeId, boolean>
  /**
   * First time in Suggestion Mode (`firstTime` true): production starts the desktop
   * toggle off until the editor turns it on once. Exposed as “First time using
   * Suggestion Mode” in Suggestion mode settings. Mobile always starts with suggestions visible.
   */
  firstTime: boolean
  /** Desktop toggle state remembered from the last session (production user option). */
  rememberedToggle: boolean
}

const STORAGE_KEY = 'protowiki:template-visual-editor:settings:v1'

function defaults(): SuggestionSettings {
  return {
    enabled: true,
    limit: null,
    types: Object.fromEntries(SUGGESTION_TYPES.map((t) => [t.id, true])) as Record<
      SuggestionTypeId,
      boolean
    >,
    firstTime: false,
    rememberedToggle: true,
  }
}

function load(): SuggestionSettings {
  const base = defaults()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    if (isConfigMockEditorEditCount(saved?.editCount)) {
      protowikiConfig.value = {
        ...protowikiConfig.value,
        mockEditorEditCountByUser: {
          ...protowikiConfig.value.mockEditorEditCountByUser,
          new: saved.editCount === 'experienced' ? 'none' : saved.editCount,
          experienced: saved.editCount,
        },
      }
    }
    const { editCount: _removed, ...rest } = saved ?? {}
    return {
      ...base,
      ...rest,
      types: { ...base.types, ...(rest?.types ?? {}) },
    }
  } catch {
    return base
  }
}

export const suggestionSettings = reactive<SuggestionSettings>(load())

watch(
  suggestionSettings,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* storage unavailable */
    }
  },
  { deep: true },
)

export function resetSuggestionSettings() {
  Object.assign(suggestionSettings, defaults())
}

export const MIN_LIMIT = 0
export const MAX_LIMIT = 99

/**
 * Applies the type filter and the custom count. A custom count keeps the
 * suggestions spread through the article (evenly sampled, document order kept).
 */
export function applySuggestionSettings<T extends { type: string }>(items: T[]): T[] {
  if (!suggestionSettings.enabled) return []
  const enabled = items.filter(
    (item) => suggestionSettings.types[item.type as SuggestionTypeId] !== false,
  )
  const limit = suggestionSettings.limit
  if (limit === null) return enabled
  if (limit === 0) return []
  if (enabled.length <= limit) return enabled
  const picked: T[] = []
  for (let i = 0; i < limit; i++) picked.push(enabled[Math.floor((i * enabled.length) / limit)])
  return picked
}
