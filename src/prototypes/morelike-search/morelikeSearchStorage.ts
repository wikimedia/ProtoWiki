export type MorelikeInputMode = 'manual' | 'userEdits'

const STORAGE_KEY = 'protowiki-morelike-search'

export interface MorelikeSearchStoredInput {
  inputMode: MorelikeInputMode
  seedPagesInput: string
  username: string
}

export const DEFAULT_MORELIKE_SEARCH_INPUT: MorelikeSearchStoredInput = {
  inputMode: 'manual',
  seedPagesInput: 'Earth, Mars',
  username: '',
}

function isInputMode(value: unknown): value is MorelikeInputMode {
  return value === 'manual' || value === 'userEdits'
}

export function loadMorelikeSearchInput(): MorelikeSearchStoredInput {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MORELIKE_SEARCH_INPUT }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_MORELIKE_SEARCH_INPUT }

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_MORELIKE_SEARCH_INPUT }
    }

    const record = parsed as Record<string, unknown>
    return {
      inputMode: isInputMode(record.inputMode)
        ? record.inputMode
        : DEFAULT_MORELIKE_SEARCH_INPUT.inputMode,
      seedPagesInput:
        typeof record.seedPagesInput === 'string'
          ? record.seedPagesInput
          : DEFAULT_MORELIKE_SEARCH_INPUT.seedPagesInput,
      username:
        typeof record.username === 'string'
          ? record.username
          : DEFAULT_MORELIKE_SEARCH_INPUT.username,
    }
  } catch {
    return { ...DEFAULT_MORELIKE_SEARCH_INPUT }
  }
}

export function saveMorelikeSearchInput(input: MorelikeSearchStoredInput): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
