import { parsePageList } from '@/lib/config'

const STORAGE_KEY = 'protowiki-morelike-search'

export interface MorelikeSearchStoredInput {
  searchQuery: string
}

export const DEFAULT_MORELIKE_SEARCH_INPUT: MorelikeSearchStoredInput = {
  searchQuery: 'Earth',
}

function migrateFromLegacy(record: Record<string, unknown>): Partial<MorelikeSearchStoredInput> {
  if (typeof record.searchQuery === 'string') {
    return { searchQuery: record.searchQuery }
  }

  if (typeof record.seedLookupInput === 'string' && record.seedLookupInput.trim()) {
    return { searchQuery: record.seedLookupInput }
  }

  if (typeof record.selectedSeedTitle === 'string' && record.selectedSeedTitle.trim()) {
    return { searchQuery: record.selectedSeedTitle }
  }

  if (typeof record.seedPagesInput === 'string') {
    const first = parsePageList(record.seedPagesInput)[0] ?? ''
    if (first) return { searchQuery: first }
  }

  return {}
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
    const legacy = migrateFromLegacy(record)

    return {
      searchQuery:
        typeof record.searchQuery === 'string'
          ? record.searchQuery
          : legacy.searchQuery ?? DEFAULT_MORELIKE_SEARCH_INPUT.searchQuery,
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
