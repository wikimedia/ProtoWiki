import { normalizeQid } from './wikidataApi'
import { getCachedItemThumbnail, setCachedItemThumbnail } from './itemThumbnailCache'

const STORAGE_KEY = 'musical-group-lists'

export interface UserList {
  id: string
  name: string
  /** QIDs, newest last. */
  itemIds: string[]
  /** Thumbnail from the first item added to the list. */
  thumbnailUrl?: string
  createdAt: number
}

function parseList(value: unknown): UserList | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null

  const itemIds: string[] = []
  if (Array.isArray(record.itemIds)) {
    for (const item of record.itemIds) {
      if (typeof item !== 'string') continue
      const id = normalizeQid(item) ?? item
      if (!itemIds.includes(id)) itemIds.push(id)
    }
  }

  let thumbnailUrl =
    typeof record.thumbnailUrl === 'string' && record.thumbnailUrl.length
      ? record.thumbnailUrl
      : undefined

  // Migrate older lists that stored per-item thumbnails.
  if (
    !thumbnailUrl &&
    itemIds.length &&
    typeof record.itemThumbnails === 'object' &&
    record.itemThumbnails !== null
  ) {
    const legacy = (record.itemThumbnails as Record<string, unknown>)[itemIds[0]]
    if (typeof legacy === 'string' && legacy.length) thumbnailUrl = legacy
  }

  const createdAt = typeof record.createdAt === 'number' ? record.createdAt : 0
  return { id: record.id, name: record.name, itemIds, thumbnailUrl, createdAt }
}

function readLists(): UserList[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const lists: UserList[] = []
    for (const item of parsed) {
      const list = parseList(item)
      if (!list || seen.has(list.id)) continue
      seen.add(list.id)
      lists.push(list)
    }
    return lists
  } catch {
    return []
  }
}

function writeLists(lists: UserList[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
  } catch {
    // Ignore quota / private mode failures.
  }
}

/** All user lists, newest-created first. */
export function listUserLists(): UserList[] {
  backfillListThumbnails()
  return readLists().sort((a, b) => b.createdAt - a.createdAt)
}

/** Copy cached first-item thumbnails onto lists that are missing one. */
export function backfillListThumbnails(): void {
  const lists = readLists()
  let changed = false
  for (const list of lists) {
    if (list.thumbnailUrl || !list.itemIds[0]) continue
    const url = getCachedItemThumbnail(list.itemIds[0])
    if (!url) continue
    list.thumbnailUrl = url
    changed = true
  }
  if (changed) writeLists(lists)
}

/** Set thumbnailUrl on lists whose first item matches (newest-first item only). */
export function setListThumbnailUrlForFirstItem(itemId: string, thumbnailUrl: string): void {
  const id = normalizeQid(itemId) ?? itemId
  const lists = readLists()
  let changed = false
  for (const list of lists) {
    if (list.itemIds[0] !== id || list.thumbnailUrl) continue
    list.thumbnailUrl = thumbnailUrl
    changed = true
  }
  if (changed) writeLists(lists)
}

export function createList(name: string): UserList {
  const lists = readLists()
  const list: UserList = {
    id: crypto.randomUUID(),
    name,
    itemIds: [],
    createdAt: Date.now(),
  }
  lists.push(list)
  writeLists(lists)
  return list
}

export function addPageToList(
  listId: string,
  pageId: string,
  thumbnailUrl?: string,
): void {
  const id = normalizeQid(pageId) ?? pageId
  const lists = readLists()
  const list = lists.find((entry) => entry.id === listId)
  if (!list) return
  if (list.itemIds.includes(id)) return
  if (thumbnailUrl) {
    setCachedItemThumbnail(id, thumbnailUrl)
    if (!list.itemIds.length) {
      list.thumbnailUrl = thumbnailUrl
    }
  }
  list.itemIds.push(id)
  writeLists(lists)
}

function syncListThumbnail(list: UserList): void {
  const firstId = list.itemIds[0]
  if (!firstId) {
    list.thumbnailUrl = undefined
    return
  }
  list.thumbnailUrl = getCachedItemThumbnail(firstId)
}

export function removePageFromList(listId: string, pageId: string): void {
  const id = normalizeQid(pageId) ?? pageId
  const lists = readLists()
  const list = lists.find((entry) => entry.id === listId)
  if (!list || !list.itemIds.includes(id)) return
  const wasFirst = list.itemIds[0] === id
  list.itemIds = list.itemIds.filter((itemId) => itemId !== id)
  if (wasFirst) syncListThumbnail(list)
  writeLists(lists)
}

/** Remove a page from every list that contains it. */
export function removePageFromAllLists(pageId: string): boolean {
  const id = normalizeQid(pageId) ?? pageId
  const lists = readLists()
  let changed = false
  for (const list of lists) {
    if (!list.itemIds.includes(id)) continue
    const wasFirst = list.itemIds[0] === id
    list.itemIds = list.itemIds.filter((itemId) => itemId !== id)
    if (wasFirst) syncListThumbnail(list)
    changed = true
  }
  if (changed) writeLists(lists)
  return changed
}

export function getListItemCount(listId: string): number {
  const list = readLists().find((entry) => entry.id === listId)
  return list?.itemIds.length ?? 0
}

export function isPageInList(listId: string, pageId: string): boolean {
  const id = normalizeQid(pageId) ?? pageId
  const list = readLists().find((entry) => entry.id === listId)
  return list?.itemIds.includes(id) ?? false
}

export function isPageInAnyList(pageId: string): boolean {
  const id = normalizeQid(pageId) ?? pageId
  return readLists().some((list) => list.itemIds.includes(id))
}

export function formatListItemCount(count: number): string {
  return count === 1 ? '1 item' : `${count} items`
}
