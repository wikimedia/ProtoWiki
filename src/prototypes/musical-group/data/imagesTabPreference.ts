const STORAGE_KEY = 'musical-group-images-tab-opened'

export function loadImagesTabOpenedPreference(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveImagesTabOpenedPreference(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
