import type {
  HomeActiveDiscussion,
  HomeFeaturedTab,
  HomeHelpWanted,
  HomeMention,
  HomeRecentChange,
  HomeRelated,
  HomeSavedItem,
  HomeTranslationSuggestion,
  HomeTrending,
} from './types'
import { readVersionedStore, setVersionedEntry, writeVersionedStore } from './wikitaCache'

const STORAGE_KEY = 'musical-group-home-cache'
const CACHE_VERSION = 1

/** Daily home feeds (trending, etc.) stay valid for ~24h from fetch time. */
export const HOME_TAB_FEED_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type RelatedFeedTabId = 'home' | 'saved'

export interface RelatedFeedSeedCursor {
  searchTitle: string
  displayTitle: string
  offset: number
}

export interface RelatedFeedPoolTitle {
  title: string
  relatedToTitle: string
}

export interface CachedRelatedFeedState {
  dependencyKey: string
  items: HomeRelated[]
  seen: string[]
  seedTitles: string[]
  seeds: RelatedFeedSeedCursor[]
  titlePool: RelatedFeedPoolTitle[]
  nextSeedIndex: number
  hasMore: boolean
  fetchedAt: number
}

export interface CachedActivityFeedState {
  dependencyKey: string
  changes: HomeRecentChange[]
  seenRevids: number[]
  pageStates: {
    itemId: string
    itemTitle: string
    enwikiTitle: string
    thumbnailUrl?: string
    savedAt: number
    oldestRevid?: number
    exhausted: boolean
  }[]
  latestRevidByTitle: [string, number][]
  queue: {
    itemId: string
    itemTitle: string
    enwikiTitle: string
    thumbnailUrl?: string
    savedAt: number
    revision: {
      revid: number
      parentid: number
      user: string
      userid: number
      comment: string
      parsedComment: string
      anon: boolean
      timestamp: string
      reverted: boolean
    }
  }[]
  hasMore: boolean
  fetchedAt: number
}

export interface CachedContributeFeedState {
  dependencyKey: string
  savedSuggestions: HomeHelpWanted[]
  relatedSuggestions: HomeHelpWanted[]
  seenTitles: string[]
  excludedIds: string[]
  seedTitles: string[]
  seeds: RelatedFeedSeedCursor[]
  titlePool: RelatedFeedPoolTitle[]
  nextSeedIndex: number
  relatedHasMore: boolean
  fetchedAt: number
}

interface CachedFeaturedEntry {
  dependencyKey: string
  data: HomeFeaturedTab
  fetchedAt: number
}

interface CachedTrendingEntry {
  dependencyKey: string
  data: HomeTrending[]
  fetchedAt: number
}

interface CachedActiveDiscussionsEntry {
  dependencyKey: string
  data: HomeActiveDiscussion[]
  fetchedAt: number
}

interface CachedTranslationSuggestionsEntry {
  dependencyKey: string
  data: HomeTranslationSuggestion[]
  fetchedAt: number
}

interface CachedSavedSummariesEntry {
  dependencyKey: string
  data: HomeSavedItem[]
  fetchedAt: number
}

interface CachedHelpWantedEntry {
  dependencyKey: string
  data: HomeHelpWanted[]
  fetchedAt: number
}

interface CachedRecentChangesEntry {
  dependencyKey: string
  data: HomeRecentChange[]
  fetchedAt: number
}

interface CachedHomeMentionsEntry {
  dependencyKey: string
  data: HomeMention[]
  fetchedAt: number
}

type HomeCacheEntry =
  | CachedFeaturedEntry
  | CachedTrendingEntry
  | CachedActiveDiscussionsEntry
  | CachedTranslationSuggestionsEntry
  | CachedSavedSummariesEntry
  | CachedHelpWantedEntry
  | CachedRecentChangesEntry
  | CachedHomeMentionsEntry
  | CachedRelatedFeedState
  | CachedActivityFeedState
  | CachedContributeFeedState

function isHomeCacheEntry(entry: unknown): entry is HomeCacheEntry {
  return typeof entry === 'object' && entry !== null && typeof (entry as HomeCacheEntry).fetchedAt === 'number'
}

function readEntries(): Record<string, HomeCacheEntry> {
  return readVersionedStore(STORAGE_KEY, CACHE_VERSION, isHomeCacheEntry)
}

function writeEntries(entries: Record<string, HomeCacheEntry>): void {
  writeVersionedStore(STORAGE_KEY, CACHE_VERSION, entries)
}

function getEntry<T extends HomeCacheEntry>(key: string, dependencyKey: string): T | null {
  const entry = readEntries()[key]
  if (!entry || entry.dependencyKey !== dependencyKey) return null
  return entry as T
}

function setEntry(key: string, entry: HomeCacheEntry): void {
  setVersionedEntry(STORAGE_KEY, CACHE_VERSION, key, entry, isHomeCacheEntry)
}

export function getCachedFeaturedTab(dependencyKey: string): HomeFeaturedTab | null {
  return getEntry<CachedFeaturedEntry>('featured', dependencyKey)?.data ?? null
}

export function setCachedFeaturedTab(dependencyKey: string, data: HomeFeaturedTab): void {
  setEntry('featured', { dependencyKey, data, fetchedAt: Date.now() })
}

export function clearCachedFeaturedTab(dependencyKey: string): void {
  const entries = readEntries()
  if (entries.featured?.dependencyKey !== dependencyKey) return
  delete entries.featured
  writeEntries(entries)
}

export function getCachedTrendingFeed(_dependencyKey?: string): HomeTrending[] | null {
  const entry = readEntries().trending as CachedTrendingEntry | undefined
  if (!entry?.data?.length) return null
  if (Date.now() - entry.fetchedAt > HOME_TAB_FEED_CACHE_TTL_MS) return null
  return entry.data
}

export function setCachedTrendingFeed(dependencyKey: string, data: HomeTrending[]): void {
  setEntry('trending', { dependencyKey, data, fetchedAt: Date.now() })
}

export function clearCachedTrendingFeed(_dependencyKey?: string): void {
  const entries = readEntries()
  if (!entries.trending) return
  delete entries.trending
  writeEntries(entries)
}

export function getCachedActiveDiscussions(dependencyKey: string): HomeActiveDiscussion[] | null {
  const entry = readEntries().activeDiscussions as CachedActiveDiscussionsEntry | undefined
  if (!entry?.data?.length || entry.dependencyKey !== dependencyKey) return null
  if (Date.now() - entry.fetchedAt > HOME_TAB_FEED_CACHE_TTL_MS) return null
  return entry.data
}

export function setCachedActiveDiscussions(
  dependencyKey: string,
  data: HomeActiveDiscussion[],
): void {
  setEntry('activeDiscussions', { dependencyKey, data, fetchedAt: Date.now() })
}

export function clearCachedActiveDiscussions(_dependencyKey?: string): void {
  const entries = readEntries()
  if (!entries.activeDiscussions) return
  delete entries.activeDiscussions
  writeEntries(entries)
}

export function getCachedTranslationSuggestions(
  dependencyKey: string,
): HomeTranslationSuggestion[] | null {
  const entry = readEntries().translationSuggestions as
    | CachedTranslationSuggestionsEntry
    | undefined
  if (!entry?.data?.length || entry.dependencyKey !== dependencyKey) return null
  if (Date.now() - entry.fetchedAt > HOME_TAB_FEED_CACHE_TTL_MS) return null
  return entry.data
}

export function setCachedTranslationSuggestions(
  dependencyKey: string,
  data: HomeTranslationSuggestion[],
): void {
  setEntry('translationSuggestions', { dependencyKey, data, fetchedAt: Date.now() })
}

export function clearCachedTranslationSuggestions(_dependencyKey?: string): void {
  const entries = readEntries()
  if (!entries.translationSuggestions) return
  delete entries.translationSuggestions
  writeEntries(entries)
}

export function getCachedSavedSummaries(dependencyKey: string): HomeSavedItem[] | null {
  return getEntry<CachedSavedSummariesEntry>('savedSummaries', dependencyKey)?.data ?? null
}

export function setCachedSavedSummaries(dependencyKey: string, data: HomeSavedItem[]): void {
  setEntry('savedSummaries', { dependencyKey, data, fetchedAt: Date.now() })
}

export function getCachedHelpWanted(dependencyKey: string): HomeHelpWanted[] | null {
  const data = getEntry<CachedHelpWantedEntry>('helpWanted', dependencyKey)?.data
  if (!data?.length) return null
  return data
}

export function setCachedHelpWanted(dependencyKey: string, data: HomeHelpWanted[]): void {
  setEntry('helpWanted', { dependencyKey, data, fetchedAt: Date.now() })
}

export function getCachedRecentChangesPreview(dependencyKey: string): HomeRecentChange[] | null {
  const data = getEntry<CachedRecentChangesEntry>('recentChanges', dependencyKey)?.data
  if (!data?.length) return null
  return data
}

export function setCachedRecentChangesPreview(dependencyKey: string, data: HomeRecentChange[]): void {
  setEntry('recentChanges', { dependencyKey, data, fetchedAt: Date.now() })
}

export function getCachedHomeMentions(dependencyKey: string): HomeMention[] | null {
  const data = getEntry<CachedHomeMentionsEntry>('homeMentions', dependencyKey)?.data
  if (!data?.length) return null
  return data
}

export function setCachedHomeMentions(dependencyKey: string, data: HomeMention[]): void {
  setEntry('homeMentions', { dependencyKey, data, fetchedAt: Date.now() })
}

export function relatedFeedCacheKey(tab: RelatedFeedTabId, dependencyKey: string): string {
  return `related:${tab}:${dependencyKey}`
}

export function getCachedRelatedFeed(
  tab: RelatedFeedTabId,
  dependencyKey: string,
): CachedRelatedFeedState | null {
  return getEntry<CachedRelatedFeedState>(relatedFeedCacheKey(tab, dependencyKey), dependencyKey)
}

export function setCachedRelatedFeed(tab: RelatedFeedTabId, state: CachedRelatedFeedState): void {
  setEntry(relatedFeedCacheKey(tab, state.dependencyKey), state)
}

export function activityFeedCacheKey(savedKey: string): string {
  return `activity:${savedKey}`
}

export function contributeFeedCacheKey(savedKey: string): string {
  return `contribute:${savedKey}`
}

export function getCachedActivityFeed(savedKey: string): CachedActivityFeedState | null {
  return getEntry<CachedActivityFeedState>(activityFeedCacheKey(savedKey), savedKey)
}

export function setCachedActivityFeed(state: CachedActivityFeedState): void {
  setEntry(activityFeedCacheKey(state.dependencyKey), state)
}

export function getCachedContributeFeed(savedKey: string): CachedContributeFeedState | null {
  return getEntry<CachedContributeFeedState>(contributeFeedCacheKey(savedKey), savedKey)
}

export function setCachedContributeFeed(state: CachedContributeFeedState): void {
  setEntry(contributeFeedCacheKey(state.dependencyKey), state)
}

/** Drop personalized suggestion caches when prefs or interests change. */
export function clearCachedSuggestionFeeds(): void {
  const entries = readEntries()
  let changed = false

  for (const key of Object.keys(entries)) {
    if (
      key === 'helpWanted' ||
      key.startsWith('related:') ||
      key.startsWith('contribute:') ||
      key === 'homeMentions'
    ) {
      delete entries[key]
      changed = true
    }
  }

  if (changed) writeEntries(entries)
}

export function clearHomeTabCache(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
