const STORAGE_KEY = 'musical-group-bookmarks'

function readBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeBookmarks(bookmarks: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks]))
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function isBookmarked(id: string): boolean {
  return readBookmarks().has(id)
}

export function toggleBookmark(id: string): boolean {
  const bookmarks = readBookmarks()
  if (bookmarks.has(id)) {
    bookmarks.delete(id)
    writeBookmarks(bookmarks)
    return false
  }
  bookmarks.add(id)
  writeBookmarks(bookmarks)
  return true
}
