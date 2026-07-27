export type WikitaUiSkin = 'wikita' | 'wikipedia'

export const DEFAULT_UI_SKIN: WikitaUiSkin = 'wikita'

export const WIKITA_UI_SKIN_MENU_ITEMS: { value: WikitaUiSkin; label: string }[] = [
  { value: 'wikita', label: 'Wikita' },
  { value: 'wikipedia', label: 'Wikipedia' },
]

const VALID_SKINS = new Set<WikitaUiSkin>(WIKITA_UI_SKIN_MENU_ITEMS.map((item) => item.value))

const STORAGE_KEY = 'musical-group-ui-skin'

export function loadWikitaUiSkinPreference(): WikitaUiSkin {
  if (typeof window === 'undefined') return DEFAULT_UI_SKIN

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored || !VALID_SKINS.has(stored as WikitaUiSkin)) return DEFAULT_UI_SKIN
    return stored as WikitaUiSkin
  } catch {
    return DEFAULT_UI_SKIN
  }
}

export function saveWikitaUiSkinPreference(skin: WikitaUiSkin): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, skin)
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
