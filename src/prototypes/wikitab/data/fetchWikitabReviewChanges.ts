import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import { RecentChangesHighRiskFeed } from './fetchWikitabRecentChangesRisky'
import {
  WikitabSearchActivityFeed,
  type EditorKind,
  type WikitabSearchActivityItem,
  type WikitabSearchTopTitle,
} from './fetchWikitabSearchActivity'
import { pickSavedArticleSeeds } from './pickSavedArticleSeeds'
import { uniqueArticleSeedsFromSavedItems, type WikitabSavedArticleSeed } from './savedCardHelpers'
import type { WikitabSavedItem } from './wikitabConfig'
import { savedItemThumbnailUrl } from './wikitabSavedItems'
import { articleTitleKey, EN_WIKI_HOST } from './wikitabHtml'

const MAX_SEEDS = 6
const THUMBNAIL_SIZE = 96

export interface ReviewChangesFeedOptions {
  showSavedEdits: boolean
  showRecentRiskyEdits: boolean
  savedItems: readonly WikitabSavedItem[]
  day: string
  seenRevids?: Iterable<number>
}

function normalizeThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('//') ? `https:${url}` : url
}

type RawPageRow = {
  pageid?: number
  title?: string
  missing?: string
  thumbnail?: { source?: string }
}

async function resolveTitlesForActivity(
  seeds: readonly WikitabSavedArticleSeed[],
  thumbnailByTitleKey: Map<string, string>,
  signal: AbortSignal | undefined,
): Promise<WikitabSearchTopTitle[]> {
  if (!seeds.length) return []

  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    titles: seeds.map((seed) => seed.title).join('|'),
  })

  const response = await fetchWikimedia(`https://${EN_WIKI_HOST}/w/api.php?${query.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('wikitab-review-changes'),
  })

  if (!response.ok) return []

  const data = (await response.json()) as { query?: { pages?: Record<string, RawPageRow> } }
  const byKey = new Map<string, WikitabSearchTopTitle>()

  for (const page of Object.values(data.query?.pages ?? {})) {
    if (!page.pageid || !page.title || page.missing !== undefined) continue

    const key = articleTitleKey(page.title)
    const savedThumb = thumbnailByTitleKey.get(key)

    byKey.set(key, {
      pageid: page.pageid,
      title: page.title,
      thumbnailUrl: savedThumb ?? normalizeThumbnailUrl(page.thumbnail?.source),
    })
  }

  return seeds
    .map((seed) => byKey.get(seed.titleKey))
    .filter((title): title is WikitabSearchTopTitle => title !== undefined)
}

/** Thin wrapper — Activity feed in, home edit cards out. */
export class ReviewChangesFeed {
  private readonly inner: WikitabSearchActivityFeed

  constructor(inner: WikitabSearchActivityFeed) {
    this.inner = inner
  }

  hasPending(): boolean {
    return this.inner.hasMore
  }

  async start(signal: AbortSignal): Promise<void> {
    await this.inner.start(signal)
  }

  prefetchMetadata(signal: AbortSignal): Promise<Map<string, string>> {
    return this.inner.prefetchMetadata(signal)
  }

  /** Never waits on the editor-kind lookup — see {@link resolveEditorKind}. */
  async takeNext(signal: AbortSignal | undefined): Promise<WikitabSearchActivityItem | null> {
    return this.inner.takeNext(signal ?? new AbortController().signal, {
      deferEditorKind: true,
    })
  }

  isEditorKindKnown(item: WikitabSearchActivityItem): boolean {
    return this.inner.isEditorKindKnown(item)
  }

  resolveEditorKind(item: WikitabSearchActivityItem, signal: AbortSignal): Promise<EditorKind> {
    return this.inner.resolveEditorKind(item, signal)
  }

  isLatestRevision(item: WikitabSearchActivityItem): boolean | undefined {
    return this.inner.isLatestRevision(item)
  }
}

async function createSavedArticleReviewChangesFeed(
  savedItems: readonly WikitabSavedItem[],
  day: string,
  signal: AbortSignal,
  seenRevids?: Iterable<number>,
): Promise<ReviewChangesFeed | null> {
  const articleSeeds = uniqueArticleSeedsFromSavedItems(savedItems)
  const seeds = pickSavedArticleSeeds(articleSeeds, day, MAX_SEEDS, 'review-changes')
  if (!seeds.length) return null

  const thumbnailByTitleKey = new Map<string, string>()
  for (const saved of savedItems) {
    const url = normalizeThumbnailUrl(savedItemThumbnailUrl(saved))
    if (url && saved.articleTitleKey) {
      thumbnailByTitleKey.set(saved.articleTitleKey, url)
    }
  }

  const titles = await resolveTitlesForActivity(seeds, thumbnailByTitleKey, signal)
  if (!titles.length) return null

  return new ReviewChangesFeed(new WikitabSearchActivityFeed(titles, { seenRevids }))
}

/**
 * Merges saved-seed edits and ORES Recent changes: first pick is the newer of the two
 * queue heads, then alternates by source. Each source stays in its own fetch order.
 */
export class MergedReviewChangesFeed {
  private readonly saved: ReviewChangesFeed | null
  private readonly rc: RecentChangesHighRiskFeed | null
  private savedHead: WikitabSearchActivityItem | null = null
  private rcHead: WikitabSearchActivityItem | null = null
  private readonly rcRevids = new Set<number>()
  /** First dual-source pick uses newest `editedTimestamp`; then alternates. */
  private firstMergePick = true
  /** When both sources have a ready item, the next pick prefers saved if true. */
  private preferSavedNext = true

  constructor(saved: ReviewChangesFeed | null, rc: RecentChangesHighRiskFeed | null) {
    this.saved = saved
    this.rc = rc
  }

  hasPending(): boolean {
    return (
      this.savedHead !== null ||
      this.rcHead !== null ||
      (this.saved?.hasPending() ?? false) ||
      (this.rc?.hasPending() ?? false)
    )
  }

  async start(signal: AbortSignal): Promise<void> {
    await Promise.all([
      this.saved?.start(signal) ?? Promise.resolve(),
      this.rc?.start(signal) ?? Promise.resolve(),
    ])
  }

  async prefetchMetadata(signal: AbortSignal): Promise<Map<string, string>> {
    const merged = new Map<string, string>()
    const [fromSaved, fromRc] = await Promise.all([
      this.saved?.prefetchMetadata(signal) ?? Promise.resolve(new Map<string, string>()),
      this.rc?.prefetchMetadata(signal) ?? Promise.resolve(new Map<string, string>()),
    ])
    for (const [key, url] of fromSaved.entries()) merged.set(key, url)
    for (const [key, url] of fromRc.entries()) merged.set(key, url)
    return merged
  }

  async takeNext(signal: AbortSignal | undefined): Promise<WikitabSearchActivityItem | null> {
    const activeSignal = signal ?? new AbortController().signal

    if (!this.savedHead && this.saved?.hasPending()) {
      this.savedHead = await this.saved.takeNext(activeSignal)
    }
    if (!this.rcHead && this.rc?.hasPending()) {
      this.rcHead = await this.rc.takeNext(activeSignal)
    }

    const savedItem = this.savedHead
    const rcItem = this.rcHead

    if (!savedItem && !rcItem) return null

    if (savedItem && !rcItem) {
      this.savedHead = null
      return savedItem
    }
    if (rcItem && !savedItem) {
      this.rcHead = null
      this.rcRevids.add(rcItem.revisionId)
      return rcItem
    }

    let pickSaved: boolean
    if (this.firstMergePick) {
      this.firstMergePick = false
      pickSaved = savedItem!.editedTimestamp >= rcItem!.editedTimestamp
      this.preferSavedNext = !pickSaved
    } else {
      pickSaved = this.preferSavedNext
      this.preferSavedNext = !this.preferSavedNext
    }

    if (pickSaved) {
      this.savedHead = null
      return savedItem!
    }

    this.rcHead = null
    this.rcRevids.add(rcItem!.revisionId)
    return rcItem!
  }

  isEditorKindKnown(item: WikitabSearchActivityItem): boolean {
    if (this.rcRevids.has(item.revisionId)) {
      return this.rc?.isEditorKindKnown(item) ?? true
    }
    if (this.saved) return this.saved.isEditorKindKnown(item)
    return true
  }

  resolveEditorKind(item: WikitabSearchActivityItem, signal: AbortSignal): Promise<EditorKind> {
    if (this.rcRevids.has(item.revisionId)) {
      return this.rc!.resolveEditorKind(item, signal)
    }
    if (this.saved) return this.saved.resolveEditorKind(item, signal)
    return Promise.resolve(item.editorKind)
  }

  isLatestRevision(item: WikitabSearchActivityItem): boolean | undefined {
    if (this.rcRevids.has(item.revisionId)) {
      return this.rc?.isLatestRevision(item)
    }
    if (this.saved) return this.saved.isLatestRevision(item)
    return undefined
  }
}

export async function createReviewChangesFeed(
  options: ReviewChangesFeedOptions,
  signal: AbortSignal,
): Promise<MergedReviewChangesFeed | null> {
  const { showSavedEdits, showRecentRiskyEdits, savedItems, day, seenRevids } = options

  if (!showSavedEdits && !showRecentRiskyEdits) return null

  const saved = showSavedEdits
    ? await createSavedArticleReviewChangesFeed(savedItems, day, signal, seenRevids)
    : null
  const rc = showRecentRiskyEdits ? new RecentChangesHighRiskFeed({ seenRevids }) : null

  if (!saved && !rc) return null

  return new MergedReviewChangesFeed(saved, rc)
}
