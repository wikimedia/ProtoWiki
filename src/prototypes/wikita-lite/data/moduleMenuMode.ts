export interface ModuleMenuModePreference {
  useModuleMenuMode: boolean
}

export const DEFAULT_MODULE_MENU_MODE_PREFERENCE: ModuleMenuModePreference = {
  useModuleMenuMode: true,
}

const STORAGE_KEY = 'wikita-lite-module-menu-mode'

function parsePreference(value: unknown): ModuleMenuModePreference | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.useModuleMenuMode !== 'boolean') return null
  return {
    useModuleMenuMode: record.useModuleMenuMode,
  }
}

export function loadModuleMenuModePreference(): ModuleMenuModePreference {
  if (typeof window === 'undefined') return { ...DEFAULT_MODULE_MENU_MODE_PREFERENCE }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_MODULE_MENU_MODE_PREFERENCE }
    const parsed = JSON.parse(raw) as unknown
    return parsePreference(parsed) ?? { ...DEFAULT_MODULE_MENU_MODE_PREFERENCE }
  } catch {
    return { ...DEFAULT_MODULE_MENU_MODE_PREFERENCE }
  }
}

export function saveModuleMenuModePreference(prefs: ModuleMenuModePreference): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
