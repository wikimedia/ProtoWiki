export type WikitaChromeHeaderVariant =
  | 'black'
  | 'off-black'
  | 'gray'
  | 'gray-bold'
  | 'red-light'
  | 'red-dark'
  | 'orange-light'
  | 'orange-dark'
  | 'brown-light'
  | 'orange-bold'
  | 'yellow-light'
  | 'yellow-bold'
  | 'lime-light'
  | 'lime-bold'
  | 'green-light'
  | 'green-dark'
  | 'blue-light'
  | 'blue-bold'
  | 'purple-light'
  | 'purple-bold'
  | 'pink-light'
  | 'pink-bold'
  | 'maroon-light'
  | 'maroon-bold'

export const DEFAULT_HEADER_VARIANT: WikitaChromeHeaderVariant = 'gray'

export const WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS: {
  value: WikitaChromeHeaderVariant
  label: string
}[] = [
  { value: 'black', label: 'Black' },
  { value: 'off-black', label: 'Off black' },
  { value: 'gray', label: 'Gray' },
  { value: 'gray-bold', label: 'Gray bold' },
  { value: 'red-light', label: 'Red light' },
  { value: 'red-dark', label: 'Red' },
  { value: 'orange-light', label: 'Orange light' },
  { value: 'orange-dark', label: 'Brown' },
  { value: 'brown-light', label: 'Brown light' },
  { value: 'orange-bold', label: 'Orange bold' },
  { value: 'yellow-light', label: 'Yellow light' },
  { value: 'yellow-bold', label: 'Yellow bold' },
  { value: 'lime-light', label: 'Lime light' },
  { value: 'lime-bold', label: 'Lime bold' },
  { value: 'green-light', label: 'Green light' },
  { value: 'green-dark', label: 'Green dark' },
  { value: 'blue-light', label: 'Blue light' },
  { value: 'blue-bold', label: 'Blue bold' },
  { value: 'purple-light', label: 'Purple light' },
  { value: 'purple-bold', label: 'Purple bold' },
  { value: 'pink-light', label: 'Pink light' },
  { value: 'pink-bold', label: 'Pink bold' },
  { value: 'maroon-light', label: 'Maroon light' },
  { value: 'maroon-bold', label: 'Maroon bold' },
]

const LEGACY_VARIANT_ALIASES: Record<string, WikitaChromeHeaderVariant> = {
  'yellow-dark': 'yellow-bold',
  'lime-dark': 'lime-bold',
  'blue-dark': 'blue-bold',
  'purple-dark': 'purple-bold',
  'pink-dark': 'pink-bold',
  'maroon-dark': 'maroon-bold',
}

const VALID_VARIANTS = new Set<WikitaChromeHeaderVariant>(
  WIKITA_CHROME_HEADER_VARIANT_MENU_ITEMS.map((item) => item.value),
)

const STORAGE_KEY = 'musical-group-header-variant'

function resolveHeaderVariant(value: string): WikitaChromeHeaderVariant | null {
  if (VALID_VARIANTS.has(value as WikitaChromeHeaderVariant)) {
    return value as WikitaChromeHeaderVariant
  }
  return LEGACY_VARIANT_ALIASES[value] ?? null
}

export function loadHeaderVariantPreference(): WikitaChromeHeaderVariant {
  if (typeof window === 'undefined') return DEFAULT_HEADER_VARIANT

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_HEADER_VARIANT
    return resolveHeaderVariant(stored) ?? DEFAULT_HEADER_VARIANT
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
