import { loadConfig } from '@/config'

import { normalizeEnwikiTitle } from '../../musical-group/data/enwikiTitle'

/** Stable id for a reading-list entry (title-based, not Wikidata QID). */
export function readingListSavedPageId(title: string): string {
  return `reading:${normalizeEnwikiTitle(title).toLowerCase()}`
}

export function readingListKey(): string {
  const config = loadConfig()
  return (config.userPageLists[config.user]?.readingList ?? [])
    .map((title) => normalizeEnwikiTitle(title).toLowerCase())
    .join('|')
}

export function listReadingListTitles(): string[] {
  const config = loadConfig()
  return [...(config.userPageLists[config.user]?.readingList ?? [])]
}

export function isTitleInReadingList(title: string): boolean {
  const key = normalizeEnwikiTitle(title).toLowerCase()
  if (!key) return false
  return listReadingListTitles().some(
    (entry) => normalizeEnwikiTitle(entry).toLowerCase() === key,
  )
}
