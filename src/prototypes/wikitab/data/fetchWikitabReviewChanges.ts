import { wikimediaApiFetchHeaders } from '@/config'
import { fetchWikimedia } from '@/lib/fetchWikimedia'

import {
  WikitabSearchActivityFeed,
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

  async takeNext(signal: AbortSignal | undefined): Promise<WikitabSearchActivityItem | null> {
    return this.inner.takeNext(signal ?? new AbortController().signal)
  }
}

export async function createReviewChangesFeed(
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

  return new ReviewChangesFeed(
    new WikitabSearchActivityFeed(titles, { seenRevids }),
  )
}
