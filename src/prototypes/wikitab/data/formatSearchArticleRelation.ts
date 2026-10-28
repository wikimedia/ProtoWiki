import type { WikitabSearchArticle } from './fetchWikitabSearchArticles'

export type SearchArticleRelationExplanation =
  | {
      kind: 'titleFirst'
      /** Sentence fragment after the bold article title. */
      tail: string
      /** Second bold title for `related` results. */
      seedTitle?: string
    }
  | {
      kind: 'textMatch'
    }
  | {
      kind: 'nearMatch'
      /** Quoted search phrase at the end of the sentence. */
      quotedQuery: string
    }

export function formatSearchArticleRelationExplanation(
  article: Pick<WikitabSearchArticle, 'relation' | 'seedTitle'>,
  searchQuery: string,
): SearchArticleRelationExplanation {
  switch (article.relation) {
    case 'exact':
      return { kind: 'titleFirst', tail: 'is an exact match of your query.' }
    case 'near':
      return { kind: 'nearMatch', quotedQuery: searchQuery.trim() }
    case 'match':
      return { kind: 'textMatch' }
    case 'related':
      if (article.seedTitle) {
        return { kind: 'titleFirst', tail: 'is related to', seedTitle: article.seedTitle }
      }
      return { kind: 'titleFirst', tail: 'is related to your search results.' }
    default:
      return { kind: 'titleFirst', tail: 'appears in your search results.' }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** HTML copy for the search result “Why am I seeing this?” dialog. */
export function formatSearchArticleRelationRationaleHtml(
  article: Pick<WikitabSearchArticle, 'title' | 'relation' | 'seedTitle'>,
  searchQuery: string,
): string {
  const explanation = formatSearchArticleRelationExplanation(article, searchQuery)
  const title = escapeHtml(article.title)

  switch (explanation.kind) {
    case 'textMatch':
      return `Your query was found within the <strong>${title}</strong> article.`
    case 'nearMatch':
      return `<strong>${title}</strong> is the nearest match to your query &quot;${escapeHtml(explanation.quotedQuery)}&quot;.`
    case 'titleFirst':
      if (explanation.seedTitle) {
        return `<strong>${title}</strong> ${explanation.tail} <strong>${escapeHtml(explanation.seedTitle)}</strong>.`
      }
      return `<strong>${title}</strong> ${explanation.tail}`
  }
}
