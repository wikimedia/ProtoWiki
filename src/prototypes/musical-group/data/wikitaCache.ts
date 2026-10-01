import { langScopedStorageKey } from '@/lib/contentLang'

export interface VersionedStore<TEntry> {
  version: number
  entries: Record<string, TEntry>
}

interface ParsedStore {
  raw: string
  version: number
  entries: Record<string, unknown>
}

/**
 * Stores are scoped to the content language (`?lang=`), so a French session
 * never reads English cache entries.
 *
 * Last parsed copy of each store, keyed by storage key. Reads compare the raw
 * string first (cheap next to `JSON.parse` + validation of the whole store),
 * so outside writes — another tab, `localStorage.clear()` — are still seen.
 */
const parsedStores = new Map<string, ParsedStore>()

export function readVersionedStore<TEntry>(
  baseStorageKey: string,
  version: number,
  isValidEntry: (entry: unknown) => entry is TEntry,
): Record<string, TEntry> {
  if (typeof window === 'undefined') return {}
  const storageKey = langScopedStorageKey(baseStorageKey)

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      parsedStores.delete(storageKey)
      return {}
    }

    const memo = parsedStores.get(storageKey)
    if (memo && memo.version === version && memo.raw === raw) {
      return { ...memo.entries } as Record<string, TEntry>
    }

    const parsed = JSON.parse(raw) as VersionedStore<unknown>
    if (parsed.version !== version || typeof parsed.entries !== 'object' || parsed.entries === null) {
      return {}
    }

    const entries: Record<string, TEntry> = {}
    for (const [key, entry] of Object.entries(parsed.entries)) {
      if (isValidEntry(entry)) entries[key] = entry
    }
    parsedStores.set(storageKey, { raw, version, entries })
    return { ...entries }
  } catch {
    return {}
  }
}

export function writeVersionedStore<TEntry>(
  baseStorageKey: string,
  version: number,
  entries: Record<string, TEntry>,
): void {
  if (typeof window === 'undefined') return
  const storageKey = langScopedStorageKey(baseStorageKey)

  try {
    if (Object.keys(entries).length === 0) {
      parsedStores.delete(storageKey)
      window.localStorage.removeItem(storageKey)
      return
    }
    const payload: VersionedStore<TEntry> = { version, entries }
    const raw = JSON.stringify(payload)
    window.localStorage.setItem(storageKey, raw)
    parsedStores.set(storageKey, { raw, version, entries: { ...entries } })
  } catch {
    // Quota or private-mode failures — ignore.
    parsedStores.delete(storageKey)
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
