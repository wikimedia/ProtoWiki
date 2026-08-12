export interface CardRadiusPreference {
  useLargeRadius: boolean
}

export const DEFAULT_CARD_RADIUS_PREFERENCE: CardRadiusPreference = {
  useLargeRadius: false,
}

const STORAGE_KEY = 'wikita-lite-card-radius'

function parsePreference(value: unknown): CardRadiusPreference | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.useLargeRadius !== 'boolean') return null
  return {
    useLargeRadius: record.useLargeRadius,
  }
}

export function loadCardRadiusPreference(): CardRadiusPreference {
  if (typeof window === 'undefined') return { ...DEFAULT_CARD_RADIUS_PREFERENCE }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CARD_RADIUS_PREFERENCE }
    const parsed = JSON.parse(raw) as unknown
    return parsePreference(parsed) ?? { ...DEFAULT_CARD_RADIUS_PREFERENCE }
  } catch {
    return { ...DEFAULT_CARD_RADIUS_PREFERENCE }
  }
}

export function saveCardRadiusPreference(prefs: CardRadiusPreference): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
