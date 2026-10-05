import { ref } from 'vue'

const STORAGE_KEY = 'protowiki-template-search-recent'
const MAX_RECENT = 8

function readStored(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function writeStored(items: string[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

/** Persisted "Recent searches" list, most recent first, deduped, capped at 8. */
export function useRecentSearches() {
  const recentSearches = ref<string[]>(readStored())

  function addRecentSearch(query: string): void {
    const trimmed = query.trim()
    if (!trimmed.length) return

    const next = [trimmed, ...recentSearches.value.filter((item) => item !== trimmed)].slice(
      0,
      MAX_RECENT,
    )
    recentSearches.value = next
    writeStored(next)
  }

  function clearRecentSearches(): void {
    recentSearches.value = []
    writeStored([])
  }

  return { recentSearches, addRecentSearch, clearRecentSearches }
}
