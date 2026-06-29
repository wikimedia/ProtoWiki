export type WikitaChromeHeaderVariant =
  | 'black'
  | 'off-black'
  | 'gray'
  | 'red-light'
  | 'red-dark'
  | 'orange-light'
  | 'orange-dark'
  | 'yellow-light'
  | 'yellow-dark'
  | 'lime-light'
  | 'lime-dark'
  | 'green-light'
  | 'green-dark'
  | 'blue-light'
  | 'blue-dark'
  | 'purple-light'
  | 'purple-dark'
  | 'pink-light'
  | 'pink-dark'
  | 'maroon-light'
  | 'maroon-dark'

export const DEFAULT_HEADER_VARIANT: WikitaChromeHeaderVariant = 'orange-light'

export const WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS: {
  value: WikitaChromeHeaderVariant
  label: string
}[] = [
  { value: 'black', label: 'Black' },
  { value: 'off-black', label: 'Off black' },
  { value: 'gray', label: 'Gray' },
  { value: 'red-light', label: 'Red light' },
  { value: 'red-dark', label: 'Red dark' },
  { value: 'orange-light', label: 'Orange light' },
  { value: 'orange-dark', label: 'Orange dark' },
  { value: 'yellow-light', label: 'Yellow light' },
  { value: 'yellow-dark', label: 'Yellow dark' },
  { value: 'lime-light', label: 'Lime light' },
  { value: 'lime-dark', label: 'Lime dark' },
  { value: 'green-light', label: 'Green light' },
  { value: 'green-dark', label: 'Green dark' },
  { value: 'blue-light', label: 'Blue light' },
  { value: 'blue-dark', label: 'Blue dark' },
  { value: 'purple-light', label: 'Purple light' },
  { value: 'purple-dark', label: 'Purple dark' },
  { value: 'pink-light', label: 'Pink light' },
  { value: 'pink-dark', label: 'Pink dark' },
  { value: 'maroon-light', label: 'Maroon light' },
  { value: 'maroon-dark', label: 'Maroon dark' },
]

const VALID_VARIANTS = new Set<WikitaChromeHeaderVariant>(
  WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS.map((item) => item.value),
)

const STORAGE_KEY = 'musical-group-header-variant'

function isHeaderVariant(value: unknown): value is WikitaChromeHeaderVariant {
  return typeof value === 'string' && VALID_VARIANTS.has(value as WikitaChromeHeaderVariant)
}

export function loadHeaderVariantPreference(): WikitaChromeHeaderVariant {
  if (typeof window === 'undefined') return DEFAULT_HEADER_VARIANT

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_HEADER_VARIANT
    return isHeaderVariant(stored) ? stored : DEFAULT_HEADER_VARIANT
  } catch {
    return DEFAULT_HEADER_VARIANT
  }
}

export function saveHeaderVariantPreference(variant: WikitaChromeHeaderVariant): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, variant)
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
