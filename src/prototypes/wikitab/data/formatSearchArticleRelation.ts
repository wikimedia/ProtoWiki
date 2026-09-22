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
      /** Quoted search phrase shown before the article title. */
      quotedQuery: string
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
      return { kind: 'textMatch', quotedQuery: searchQuery.trim() }
    case 'related':
      if (article.seedTitle) {
        return { kind: 'titleFirst', tail: 'is related to', seedTitle: article.seedTitle }
      }
      return { kind: 'titleFirst', tail: 'is related to your search results.' }
  }
}
