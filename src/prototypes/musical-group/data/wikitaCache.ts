export interface VersionedStore<TEntry> {
  version: number
  entries: Record<string, TEntry>
}

export function readVersionedStore<TEntry>(
  storageKey: string,
  version: number,
  isValidEntry: (entry: unknown) => entry is TEntry,
): Record<string, TEntry> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as VersionedStore<unknown>
    if (parsed.version !== version || typeof parsed.entries !== 'object' || parsed.entries === null) {
      return {}
    }

    const entries: Record<string, TEntry> = {}
    for (const [key, entry] of Object.entries(parsed.entries)) {
      if (isValidEntry(entry)) entries[key] = entry
    }
    return entries
  } catch {
    return {}
  }
}

export function writeVersionedStore<TEntry>(
  storageKey: string,
  version: number,
  entries: Record<string, TEntry>,
): void {
  if (typeof window === 'undefined') return

  try {
    if (Object.keys(entries).length === 0) {
      window.localStorage.removeItem(storageKey)
      return
    }
    const payload: VersionedStore<TEntry> = { version, entries }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function getVersionedEntry<TEntry>(
  storageKey: string,
  version: number,
  key: string,
  isValidEntry: (entry: unknown) => entry is TEntry,
): TEntry | null {
  return readVersionedStore(storageKey, version, isValidEntry)[key] ?? null
}

export function setVersionedEntry<TEntry>(
  storageKey: string,
  version: number,
  key: string,
  entry: TEntry,
  isValidEntry: (entry: unknown) => entry is TEntry,
): void {
  const entries = readVersionedStore(storageKey, version, isValidEntry)
  entries[key] = entry
  writeVersionedStore(storageKey, version, entries)
}

export function removeVersionedEntry(
  storageKey: string,
  version: number,
  key: string,
  isValidEntry: (entry: unknown) => boolean,
): void {
  const entries = readVersionedStore(storageKey, version, isValidEntry)
  delete entries[key]
  writeVersionedStore(storageKey, version, entries)
}
