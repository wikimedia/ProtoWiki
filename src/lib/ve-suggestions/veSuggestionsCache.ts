import type { FWVeSuggestionResponse } from 'fakewiki/types'

import { wipeLocalStorage } from '@/lib/wipeLocalStorage'

import type { SuggestionCardData } from './veSuggestionCards'

const CACHE_STORAGE_KEY = 'protowiki-ve-suggestions-cache-v1'
const UI_STORAGE_KEY = 'protowiki-ve-suggestions-ui-v1'

export type CachedMethodResult =
  | { ok: true; response: FWVeSuggestionResponse }
  | { ok: false; error: string }

export interface CachedVeSuggestionsRun {
  fetchedAt: number
  pageTitle: string
  pageSource?: string
  methodResults: Record<string, CachedMethodResult>
  cards?: SuggestionCardData[]
  snippetHtmlByKey?: Record<string, string>
}

export interface VeSuggestionsUiState {
  pageTitle: string
  lastViewedAt?: number
}

type CacheStore = Record<string, CachedVeSuggestionsRun>

function readCacheStore(): CacheStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as CacheStore
  } catch {
    wipeLocalStorage()
    return {}
  }
}

function writeCacheStore(store: CacheStore): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

export function normalizePageTitle(title: string): string {
  return title.trim().replace(/_/g, ' ')
}

export function getCachedRun(title: string): CachedVeSuggestionsRun | null {
  const key = normalizePageTitle(title)
  if (!key.length) return null

  const entry = readCacheStore()[key]
  if (!entry || typeof entry.fetchedAt !== 'number' || typeof entry.pageTitle !== 'string') {
    return null
  }
  if (typeof entry.methodResults !== 'object' || entry.methodResults === null) {
    return null
  }
  return entry
}

export function setCachedRun(title: string, run: CachedVeSuggestionsRun): void {
  const key = normalizePageTitle(title)
  if (!key.length) return

  const store = readCacheStore()
  store[key] = run
  writeCacheStore(store)
}

export function clearCachedRun(title: string): void {
  const key = normalizePageTitle(title)
  if (!key.length) return

  const store = readCacheStore()
  delete store[key]
  writeCacheStore(store)
}

export function loadUiState(): VeSuggestionsUiState {
  if (typeof window === 'undefined') {
    return { pageTitle: 'Wet Leg' }
  }

  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) return { pageTitle: 'Wet Leg' }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { pageTitle: 'Wet Leg' }
    }
    const record = parsed as Partial<VeSuggestionsUiState>
    return {
      pageTitle:
        typeof record.pageTitle === 'string' && record.pageTitle.trim().length > 0
          ? record.pageTitle
          : 'Wet Leg',
      lastViewedAt:
        typeof record.lastViewedAt === 'number' ? record.lastViewedAt : undefined,
    }
  } catch {
    wipeLocalStorage()
    return { pageTitle: 'Wet Leg' }
  }
}

export function saveUiState(state: VeSuggestionsUiState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
