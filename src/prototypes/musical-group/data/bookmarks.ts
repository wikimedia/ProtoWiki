import { normalizeQid } from './wikidataApi'

const STORAGE_KEY = 'musical-group-bookmarks'

export interface BookmarkEntry {
  id: string
  /** Epoch milliseconds the bookmark was saved. Legacy bookmarks read back as `0`. */
  savedAt: number
}

function parseEntry(value: unknown): BookmarkEntry | null {
  // Legacy format: a bare QID string with no timestamp.
  if (typeof value === 'string') {
    const id = normalizeQid(value) ?? value
    return { id, savedAt: 0 }
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    if (typeof record.id !== 'string') return null
    const id = normalizeQid(record.id) ?? record.id
    const savedAt = typeof record.savedAt === 'number' ? record.savedAt : 0
    return { id, savedAt }
  }

  return null
}

function readEntries(): BookmarkEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const entries: BookmarkEntry[] = []
    for (const item of parsed) {
      const entry = parseEntry(item)
      if (!entry || seen.has(entry.id)) continue
      seen.add(entry.id)
      entries.push(entry)
    }
    return entries
  } catch {
    return []
  }
}

function writeEntries(entries: BookmarkEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore quota / private mode failures.
  }
}

/** All bookmarks, newest-saved first. */
export function listBookmarks(): BookmarkEntry[] {
  return readEntries().sort((a, b) => b.savedAt - a.savedAt)
}

export function isBookmarked(id: string): boolean {
  return readEntries().some((entry) => entry.id === id)
}

export function toggleBookmark(id: string): boolean {
  const entries = readEntries()
  const index = entries.findIndex((entry) => entry.id === id)
  if (index >= 0) {
    entries.splice(index, 1)
    writeEntries(entries)
    return false
  }
  entries.push({ id, savedAt: Date.now() })
  writeEntries(entries)
  return true
}
