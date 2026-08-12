export interface CardBordersPreference {
  hideCardBorders: boolean
}

export const DEFAULT_CARD_BORDERS_PREFERENCE: CardBordersPreference = {
  hideCardBorders: false,
}

const STORAGE_KEY = 'wikita-lite-card-borders'

function parsePreference(value: unknown): CardBordersPreference | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.hideCardBorders !== 'boolean') return null
  return {
    hideCardBorders: record.hideCardBorders,
  }
}

export function loadCardBordersPreference(): CardBordersPreference {
  if (typeof window === 'undefined') return { ...DEFAULT_CARD_BORDERS_PREFERENCE }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CARD_BORDERS_PREFERENCE }
    const parsed = JSON.parse(raw) as unknown
    return parsePreference(parsed) ?? { ...DEFAULT_CARD_BORDERS_PREFERENCE }
  } catch {
    return { ...DEFAULT_CARD_BORDERS_PREFERENCE }
  }
}

export function saveCardBordersPreference(prefs: CardBordersPreference): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
