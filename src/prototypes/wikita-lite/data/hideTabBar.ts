export interface HideTabBarPreference {
  hideTabBar: boolean
}

export const DEFAULT_HIDE_TAB_BAR_PREFERENCE: HideTabBarPreference = {
  hideTabBar: true,
}

const STORAGE_KEY = 'wikita-lite-hide-tab-bar'

function parsePreference(value: unknown): HideTabBarPreference | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.hideTabBar !== 'boolean') return null
  return {
    hideTabBar: record.hideTabBar,
  }
}

export function loadHideTabBarPreference(): HideTabBarPreference {
  if (typeof window === 'undefined') return { ...DEFAULT_HIDE_TAB_BAR_PREFERENCE }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_HIDE_TAB_BAR_PREFERENCE }
    const parsed = JSON.parse(raw) as unknown
    return parsePreference(parsed) ?? { ...DEFAULT_HIDE_TAB_BAR_PREFERENCE }
  } catch {
    return { ...DEFAULT_HIDE_TAB_BAR_PREFERENCE }
  }
}

export function saveHideTabBarPreference(prefs: HideTabBarPreference): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
