const STORAGE_KEY = 'musical-group-edit-thanks'

function readRevids(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()

    const revids = new Set<number>()
    for (const item of parsed) {
      if (typeof item === 'number' && Number.isFinite(item) && item > 0) {
        revids.add(item)
      }
    }
    return revids
  } catch {
    return new Set()
  }
}

function writeRevids(revids: Set<number>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...revids]))
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function isEditThanked(revid: number): boolean {
  return readRevids().has(revid)
}

/** Toggle thank for this revision; returns the new thanked state. */
export function toggleEditThank(revid: number): boolean {
  const revids = readRevids()
  if (revids.has(revid)) {
    revids.delete(revid)
    writeRevids(revids)
    return false
  }
  revids.add(revid)
  writeRevids(revids)
  return true
}
