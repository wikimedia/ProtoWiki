import { normalizeEnwikiTitle } from './enwikiTitle'

const STORAGE_KEY = 'wikita-lite-interests'
const MAX_INTERESTS = 10

function normalizeInterestTitle(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed.length) return null
  return normalizeEnwikiTitle(trimmed)
}

export function listInterests(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const titles: string[] = []
    for (const item of parsed) {
      if (typeof item !== 'string') continue
      const normalized = normalizeInterestTitle(item)
      if (!normalized) continue
      const key = normalized.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      titles.push(normalized)
    }
    return titles
  } catch {
    return []
  }
}

export function saveInterests(titles: string[]): void {
  if (typeof window === 'undefined') return

  const seen = new Set<string>()
  const normalized: string[] = []
  for (const title of titles) {
    const value = normalizeInterestTitle(title)
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(value)
    if (normalized.length >= MAX_INTERESTS) break
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function interestsKey(): string {
  return listInterests()
    .map((title) => title.toLowerCase())
    .sort()
    .join('|')
}
