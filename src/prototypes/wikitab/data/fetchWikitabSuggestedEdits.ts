import { pickSavedArticleSeeds } from './pickSavedArticleSeeds'
import { uniqueArticleSeedsFromSavedItems } from './savedCardHelpers'
import type { WikitabSavedItem } from './wikitabConfig'
import {
  contributeItemToCard,
  createContributeFeedFromSeeds,
  type WikitabContributeSeed,
  WikitabSearchContributeFeed,
} from './fetchWikitabSearchContribute'
import type { WikitabCardData } from '../sections'

const MAX_SEEDS = 6

/** Thin wrapper — Contribute feed in, home cards out. */
export class SuggestedEditsFeed {
  private readonly inner: WikitabSearchContributeFeed

  constructor(inner: WikitabSearchContributeFeed) {
    this.inner = inner
  }

  hasPending(): boolean {
    return this.inner.hasMore
  }

  async takeNext(signal: AbortSignal | undefined): Promise<WikitabCardData | null> {
    const item = await this.inner.takeNext(signal ?? new AbortController().signal)
    return item ? contributeItemToCard(item) : null
  }
}

export function createSuggestedEditsFeed(
  savedItems: readonly WikitabSavedItem[],
  day: string,
  signal?: AbortSignal,
  seenPageids?: Iterable<number>,
): SuggestedEditsFeed | null {
  void signal

  const articleSeeds = uniqueArticleSeedsFromSavedItems(savedItems)
  const seeds = pickSavedArticleSeeds(articleSeeds, day, MAX_SEEDS, 'suggested-edits')
  if (!seeds.length) return null

  const contributeSeeds: WikitabContributeSeed[] = seeds.map((seed) => ({
    title: seed.title,
  }))

  const excludedTitleKeys = new Set(savedItems.map((saved) => saved.articleTitleKey))

  const inner = createContributeFeedFromSeeds(contributeSeeds, {
    excludedTitleKeys,
    seenPageids,
  })

  if (!inner) return null
  return new SuggestedEditsFeed(inner)
}
