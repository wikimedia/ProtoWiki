import type { ComputedRef, InjectionKey } from 'vue'

/** Open another wiki page on the current prototype via **`?title=`**. */
export type InArticleWikiLinkHandler = (title: string | null | undefined) => void

export interface InArticleWikiLinkNavigation {
  navigate: InArticleWikiLinkHandler
  /** Absolute URL for **`?title=`** on the target prototype route (new-tab opens). */
  resolveUrl: (title: string | null | undefined) => string | null
}

export const PROTOWIKI_IN_ARTICLE_WIKI_LINK: InjectionKey<InArticleWikiLinkNavigation> =
  Symbol('protowikiInArticleWikiLink')

export const PROTOWIKI_ARTICLE_WIKI_HOST: InjectionKey<ComputedRef<string>> =
  Symbol('protowikiArticleWikiHost')
