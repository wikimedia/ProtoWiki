import { ref, watch, type Ref } from 'vue'

import {
  DEFAULT_INTERESTS_SETTINGS,
  MAX_INTEREST_CHIPS,
  chipKey,
  getCatalogTopicById,
  getCatalogTopicsForCategory,
  slugifyInterestsLabel,
  type InterestsChipEntry,
  type InterestsChipKind,
  type InterestsPersonalization,
  type InterestsSettings,
} from './interestsFixtures'

const STORAGE_KEY_V2 = 'protowiki-template-homepage-interests-v2'
const STORAGE_KEY_V1 = 'protowiki-template-homepage-interests-v1'

export type InterestsSuggestionKind = 'page' | 'topic' | 'category'

export interface ParsedInterestsSuggestion {
  kind: InterestsSuggestionKind
  pageTitle?: string
  topicId?: string
  categoryId?: string
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isChipEntry(value: unknown): value is InterestsChipEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as InterestsChipEntry).id === 'string' &&
    typeof (value as InterestsChipEntry).label === 'string' &&
    isBoolean((value as InterestsChipEntry).selected) &&
    ((value as InterestsChipEntry).kind === 'page' || (value as InterestsChipEntry).kind === 'topic')
  )
}

function mergePersonalization(stored: unknown): InterestsPersonalization {
  const defaults = DEFAULT_INTERESTS_SETTINGS.personalization
  if (typeof stored !== 'object' || stored === null) {
    return { ...defaults }
  }

  const record = stored as Record<string, unknown>
  return {
    editingHistory: isBoolean(record.editingHistory)
      ? record.editingHistory
      : defaults.editingHistory,
    watchlist: isBoolean(record.watchlist) ? record.watchlist : defaults.watchlist,
    readingList: isBoolean(record.readingList) ? record.readingList : defaults.readingList,
  }
}

function labelsMatch(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
}

function withoutLegacyAccountPageChip(chips: InterestsChipEntry[]): InterestsChipEntry[] {
  return chips.filter((chip) => !(chip.kind === 'page' && chip.id === 'wikipedia'))
}

export function pruneInterestChips(chips: InterestsChipEntry[]): InterestsChipEntry[] {
  let pruned = withoutLegacyAccountPageChip(chips)

  while (pruned.length > MAX_INTEREST_CHIPS) {
    let removed = false
    for (let index = pruned.length - 1; index >= 0; index -= 1) {
      const chip = pruned[index]
      if (chip.kind !== 'topic') continue
      if (chip.selected) continue
      pruned.splice(index, 1)
      removed = true
      break
    }
    if (!removed) break
  }

  return pruned
}

function moveChipToTop(chips: InterestsChipEntry[], key: string): InterestsChipEntry[] {
  const index = chips.findIndex((chip) => chipKey(chip.kind, chip.id) === key)
  if (index < 0) return chips

  const [chip] = chips.splice(index, 1)
  chips.splice(0, 0, chip)
  return chips
}

function mergeChipWithDefaults(storedChip: InterestsChipEntry): InterestsChipEntry {
  const defaultChip = DEFAULT_INTERESTS_SETTINGS.chips.find(
    (entry) => entry.kind === storedChip.kind && entry.id === storedChip.id,
  )
  if (!defaultChip) return { ...storedChip }

  return {
    ...defaultChip,
    ...storedChip,
    kind: defaultChip.kind,
  }
}

/** Preserve stored chip order (most-recent-first); only append missing fixture defaults at the end. */
function mergeChips(stored: unknown): InterestsChipEntry[] {
  if (!Array.isArray(stored)) return [...DEFAULT_INTERESTS_SETTINGS.chips]

  // Empty array is intentional (user cleared all interests).
  if (stored.length === 0) return []

  const validStored = stored.filter(isChipEntry)
  if (validStored.length === 0) return [...DEFAULT_INTERESTS_SETTINGS.chips]

  const storedKeys = new Set(validStored.map((chip) => chipKey(chip.kind, chip.id)))
  const ordered = validStored.map(mergeChipWithDefaults)

  for (const defaultChip of DEFAULT_INTERESTS_SETTINGS.chips) {
    const key = chipKey(defaultChip.kind, defaultChip.id)
    if (!storedKeys.has(key)) {
      ordered.push({ ...defaultChip })
    }
  }

  return pruneInterestChips(ordered)
}

function chipsFromLegacyV2(raw: Record<string, unknown>): InterestsChipEntry[] {
  const chips: InterestsChipEntry[] = []

  const pages = raw.pages
  if (Array.isArray(pages)) {
    for (const page of pages) {
      if (typeof page !== 'object' || page === null) continue
      const id = (page as { id?: string }).id
      const label = (page as { label?: string }).label
      const selected = (page as { selected?: boolean }).selected
      const pinned = (page as { pinned?: boolean }).pinned
      if (!id || !label || !isBoolean(selected)) continue
      chips.push({ id, label, selected, kind: 'page', pinned })
    }
  }

  const topicChips = raw.topicChips
  if (Array.isArray(topicChips)) {
    for (const topic of topicChips) {
      if (typeof topic !== 'object' || topic === null) continue
      const id = (topic as { id?: string }).id
      const label = (topic as { label?: string }).label
      const selected = (topic as { selected?: boolean }).selected
      const categoryId = (topic as { categoryId?: string }).categoryId
      if (!id || !label || !isBoolean(selected) || !categoryId) continue
      chips.push({ id, label, selected, kind: 'topic', categoryId })
    }
  }

  return chips.length ? mergeChips(chips) : [...DEFAULT_INTERESTS_SETTINGS.chips]
}

export function normalizeInterestsSettings(raw: unknown): InterestsSettings {
  const defaults = DEFAULT_INTERESTS_SETTINGS

  if (typeof raw !== 'object' || raw === null) {
    return structuredClone(defaults)
  }

  const candidate = raw as Record<string, unknown> & Partial<InterestsSettings>

  const chips = Array.isArray(candidate.chips)
    ? mergeChips(candidate.chips)
    : chipsFromLegacyV2(candidate)

  return {
    personalization: mergePersonalization(candidate.personalization),
    chips,
  }
}

function clearStoredKey(key: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

function migrateV1ToV2(): InterestsSettings | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_V1)
    if (!stored) return null

    const parsed = JSON.parse(stored) as Record<string, unknown>
    const chips = [...DEFAULT_INTERESTS_SETTINGS.chips]
    const chipsByKey = new Map(chips.map((chip) => [chipKey(chip.kind, chip.id), chip]))

    const pages = parsed.pages
    if (Array.isArray(pages)) {
      for (const page of pages) {
        if (typeof page !== 'object' || page === null) continue
        const id = (page as { id?: string }).id
        const label = (page as { label?: string }).label
        const selected = (page as { selected?: boolean }).selected
        const pinned = (page as { pinned?: boolean }).pinned
        if (!id || !label || !isBoolean(selected)) continue

        const key = chipKey('page', id)
        const existing = chipsByKey.get(key)
        if (existing) {
          existing.selected = selected
          continue
        }

        const chip: InterestsChipEntry = { id, label, selected, kind: 'page', pinned }
        chips.push(chip)
        chipsByKey.set(key, chip)
      }
    }

    const topicCategories = parsed.topicCategories
    if (Array.isArray(topicCategories)) {
      for (const category of topicCategories) {
        if (typeof category !== 'object' || category === null) continue
        const categoryId = (category as { id?: string }).id
        const topics = (category as { topics?: unknown[] }).topics
        if (!categoryId || !Array.isArray(topics)) continue

        for (const topic of topics) {
          if (typeof topic !== 'object' || topic === null) continue
          const topicId = (topic as { id?: string }).id
          const label = (topic as { label?: string }).label
          const selected = (topic as { selected?: boolean }).selected
          if (!topicId || !label || !selected) continue

          const fullId = `${categoryId}:${topicId}`
          const key = chipKey('topic', fullId)
          const existing = chipsByKey.get(key)
          if (existing) {
            existing.selected = true
            continue
          }

          const catalogEntry = getCatalogTopicById(fullId)
          const chip: InterestsChipEntry = {
            id: fullId,
            label: catalogEntry?.label ?? label,
            selected: true,
            kind: 'topic',
            categoryId,
          }
          chips.push(chip)
          chipsByKey.set(key, chip)
        }
      }
    }

    clearStoredKey(STORAGE_KEY_V1)
    return normalizeInterestsSettings({
      personalization: parsed.personalization,
      chips,
    })
  } catch {
    clearStoredKey(STORAGE_KEY_V1)
    return null
  }
}

export function loadInterestsSettings(): InterestsSettings {
  if (typeof window === 'undefined') {
    return structuredClone(DEFAULT_INTERESTS_SETTINGS)
  }

  try {
    const migrated = migrateV1ToV2()
    if (migrated) {
      saveInterestsSettings(migrated)
      return migrated
    }

    const stored = window.localStorage.getItem(STORAGE_KEY_V2)
    if (!stored) return structuredClone(DEFAULT_INTERESTS_SETTINGS)

    const parsed = JSON.parse(stored)
    const normalized = normalizeInterestsSettings(parsed)

    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      saveInterestsSettings(normalized)
    }

    return normalized
  } catch {
    clearStoredKey(STORAGE_KEY_V2)
    return structuredClone(DEFAULT_INTERESTS_SETTINGS)
  }
}

export function saveInterestsSettings(settings: InterestsSettings): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeInterestsSettings({
    ...settings,
    chips: pruneInterestChips(settings.chips),
  })

  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(normalized))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function encodeInterestsSuggestion(
  kind: InterestsSuggestionKind,
  payload: { pageTitle?: string; topicId?: string; categoryId?: string },
): string {
  if (kind === 'page' && payload.pageTitle) {
    return `page:${encodeURIComponent(payload.pageTitle)}`
  }
  if (kind === 'topic' && payload.topicId) {
    return `topic:${payload.topicId}`
  }
  if (kind === 'category' && payload.categoryId) {
    return `category:${payload.categoryId}`
  }
  return ''
}

export function parseInterestsSuggestion(value: string | number | null): ParsedInterestsSuggestion | null {
  if (value === null || value === undefined) return null
  const raw = String(value)

  if (raw.startsWith('page:')) {
    const pageTitle = decodeURIComponent(raw.slice('page:'.length))
    return pageTitle.length ? { kind: 'page', pageTitle } : null
  }

  if (raw.startsWith('topic:')) {
    const topicId = raw.slice('topic:'.length)
    return topicId.length ? { kind: 'topic', topicId } : null
  }

  if (raw.startsWith('category:')) {
    const categoryId = raw.slice('category:'.length)
    return categoryId.length ? { kind: 'category', categoryId } : null
  }

  return null
}

function upsertChip(
  settings: InterestsSettings,
  chip: InterestsChipEntry,
  selected = true,
): void {
  const key = chipKey(chip.kind, chip.id)
  const existing = settings.chips.find((entry) => chipKey(entry.kind, entry.id) === key)

  if (existing) {
    existing.selected = selected
    settings.chips = pruneInterestChips(moveChipToTop(settings.chips, key))
    return
  }

  settings.chips.splice(0, 0, { ...chip, selected })
  settings.chips = pruneInterestChips(settings.chips)
}

export function addInterestsPage(settings: InterestsSettings, label: string): void {
  const trimmed = label.trim()
  if (!trimmed.length) return

  const existing = settings.chips.find(
    (chip) => chip.kind === 'page' && labelsMatch(chip.label, trimmed),
  )
  if (existing) {
    upsertChip(settings, existing, true)
    return
  }

  const id = slugifyInterestsLabel(trimmed)
  if (!id.length) return

  upsertChip(settings, { id, label: trimmed, selected: true, kind: 'page' }, true)
}

export function addInterestsTopic(settings: InterestsSettings, topicId: string, selected = true): void {
  const catalogEntry = getCatalogTopicById(topicId)
  if (!catalogEntry) return

  upsertChip(
    settings,
    {
      id: catalogEntry.id,
      label: catalogEntry.label,
      selected,
      kind: 'topic',
      categoryId: catalogEntry.categoryId,
    },
    selected,
  )
}

export function addInterestsCategory(settings: InterestsSettings, categoryId: string): void {
  const topics = getCatalogTopicsForCategory(categoryId)
  for (let index = topics.length - 1; index >= 0; index -= 1) {
    const catalogEntry = topics[index]
    upsertChip(
      settings,
      {
        id: catalogEntry.id,
        label: catalogEntry.label,
        selected: true,
        kind: 'topic',
        categoryId: catalogEntry.categoryId,
      },
      true,
    )
  }
}

export function applyInterestsSuggestion(
  settings: InterestsSettings,
  value: string | number | null,
): void {
  const parsed = parseInterestsSuggestion(value)
  if (!parsed) return

  if (parsed.kind === 'page' && parsed.pageTitle) {
    addInterestsPage(settings, parsed.pageTitle)
    return
  }

  if (parsed.kind === 'topic' && parsed.topicId) {
    addInterestsTopic(settings, parsed.topicId, true)
    return
  }

  if (parsed.kind === 'category' && parsed.categoryId) {
    addInterestsCategory(settings, parsed.categoryId)
  }
}

/** Remove all interest chips; personalization toggles are unchanged. */
export function clearAllInterests(settings: InterestsSettings): void {
  settings.chips = []
}

/** Module-level singleton so homepage, drill-down, and overlay share interests state. */
let sharedInterestsSettings: Ref<InterestsSettings> | null = null

export function useInterestsSettings(): Ref<InterestsSettings> {
  if (!sharedInterestsSettings) {
    sharedInterestsSettings = ref(loadInterestsSettings())

    watch(
      sharedInterestsSettings,
      (value) => {
        saveInterestsSettings(value)
      },
      { deep: true },
    )
  }

  return sharedInterestsSettings
}
