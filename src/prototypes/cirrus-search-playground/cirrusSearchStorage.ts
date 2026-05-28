import { DEFAULT_FORM_STATE, type CirrusSearchFormState } from './types'

const STORAGE_KEY = 'protowiki-cirrus-search-playground'

export function loadCirrusSearchFormState(): CirrusSearchFormState {
  if (typeof window === 'undefined') {
    return structuredClone(DEFAULT_FORM_STATE)
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_FORM_STATE)

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return structuredClone(DEFAULT_FORM_STATE)
    }

    return {
      ...structuredClone(DEFAULT_FORM_STATE),
      ...(parsed as Partial<CirrusSearchFormState>),
      cirrusMlt: {
        ...DEFAULT_FORM_STATE.cirrusMlt,
        ...((parsed as Partial<CirrusSearchFormState>).cirrusMlt ?? {}),
      },
    }
  } catch {
    return structuredClone(DEFAULT_FORM_STATE)
  }
}

export function saveCirrusSearchFormState(state: CirrusSearchFormState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
