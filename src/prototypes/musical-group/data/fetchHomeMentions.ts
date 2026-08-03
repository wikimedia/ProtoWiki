import { normalizeEnwikiTitle } from './enwikiTitle'
import { fetchSnippetMentions } from './fetchMusicalGroupOverview'
import { bookmarksKey } from './cacheKeys'
import { getCachedHomeMentions, setCachedHomeMentions } from './homeTabCache'
import type { HomeMention, HomeRelated, HomeSavedItem } from './types'

/** How many mention cards to fetch and cache for the home / For you feeds. */
export const HOME_MENTIONS_FETCH_LIMIT = 10

export function filterMentionsExcludingRelated(
  mentions: HomeMention[],
  related: HomeRelated[],
): HomeMention[] {
  if (!related.length) return mentions

  const relatedTitleKeys = new Set(
    related.map((item) => normalizeEnwikiTitle(item.title).toLowerCase()),
  )
  const relatedIds = new Set(
    related.flatMap((item) => (item.itemId ? [item.itemId] : [])),
  )

  return mentions.filter((mention) => {
    if (mention.itemId && relatedIds.has(mention.itemId)) return false
    const titleKey = normalizeEnwikiTitle(mention.title).toLowerCase()
    return !relatedTitleKeys.has(titleKey)
  })
}

function seedExcludedArticles(
  seenTitles: Set<string>,
  seenIds: Set<string>,
  excludeRelated: HomeRelated[],
): void {
  for (const related of excludeRelated) {
    seenTitles.add(normalizeEnwikiTitle(related.title).toLowerCase())
    if (related.itemId) seenIds.add(related.itemId)
  }
}

export async function fetchHomeMentions(
  items: HomeSavedItem[],
  signal?: AbortSignal,
  limit = HOME_MENTIONS_FETCH_LIMIT,
  excludeRelated: HomeRelated[] = [],
): Promise<HomeMention[]> {
  const dependencyKey = bookmarksKey()
  const cached = getCachedHomeMentions(dependencyKey)
  if (cached?.length >= limit) {
    return filterMentionsExcludingRelated(cached, excludeRelated).slice(0, limit)
  }

  const seeds = items.filter((item) => item.enwikiTitle)
  if (!seeds.length) return []

  const mentions: HomeMention[] = []
  const seenTitles = new Set<string>()
  const seenIds = new Set<string>()
  seedExcludedArticles(seenTitles, seenIds, excludeRelated)
  const shuffledSeeds = [...seeds].sort(() => Math.random() - 0.5)

  for (const seed of shuffledSeeds) {
    if (mentions.length >= limit) break
    if (signal?.aborted) break

    const snippets = await fetchSnippetMentions(
      seed.title,
      seed.enwikiTitle as string,
      seed.id,
      signal,
    )

    for (const snippet of snippets) {
      if (mentions.length >= limit) break

      const titleKey = normalizeEnwikiTitle(snippet.title).toLowerCase()
      if (seenTitles.has(titleKey)) continue
      if (snippet.id && seenIds.has(snippet.id)) continue

      seenTitles.add(titleKey)
      if (snippet.id) seenIds.add(snippet.id)

      mentions.push({
        title: snippet.title,
        description: snippet.description,
        snippetHtml: snippet.snippetHtml,
        thumbnailUrl: snippet.thumbnailUrl,
        articleUrl: snippet.articleUrl,
        itemId: snippet.id,
        mentionedInTitle: seed.title,
      })
    }
  }

  if (mentions.length) setCachedHomeMentions(dependencyKey, mentions)
  return mentions
}
