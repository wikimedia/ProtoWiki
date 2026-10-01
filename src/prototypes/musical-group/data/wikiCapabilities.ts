import { getContentLang } from '@/lib/contentLang'

import { enwikiArticleUrl } from './enwikiTitle'

/**
 * What each content wiki offers the Home modules. The REST featured feed only
 * carries `tfa` / `dyk` for some wikis, so others point at the main-page
 * subpages their community curates instead. Adding a language = adding an
 * entry here (plus strings in `wikita-lite/i18n.ts`).
 */
export interface WikiCapabilities {
  /** Main-page subpage holding today's featured article, when the feed has no `tfa`. */
  featuredPage?: string
  /** Main-page subpage listing today's "Did you know" hooks, when the feed has no `dyk`. */
  didYouKnowPage?: string
  /**
   * Machine-translate English Wikipedia's featured content via MinT when no
   * native source works. Off where the community curates its own.
   */
  mintFallback: boolean
  /** Noticeboards for Active discussions (DiscussionTools must be enabled). */
  discussionPages: readonly string[]
  /** Linked from account creation. */
  usernamePolicyPage: string
  /** Learn module's "How to edit a page" guide. */
  editingGuidePage: string
}

/** Production enwiki noticeboards from wgPersonalDashboardActiveDiscussionsPages (T420785). */
const ENWIKI_DISCUSSION_PAGES = [
  'Wikipedia:Help desk',
  'Wikipedia:Village pump (miscellaneous)',
  'Wikipedia:Village pump (technical)',
  'Wikipedia:Village pump (idea_lab)',
  'Wikipedia:Village pump (policy)',
  'Wikipedia:Village pump (proposals)',
] as const

const CAPABILITIES: Record<string, WikiCapabilities> = {
  en: {
    mintFallback: false,
    discussionPages: ENWIKI_DISCUSSION_PAGES,
    usernamePolicyPage: 'Wikipedia:Username policy',
    editingGuidePage: 'Help:Introduction to Wikipedia',
  },
  fr: {
    // OrlodrimBot copies today's sections here without templates.
    featuredPage: 'Wikipédia:Accueil principal/Lumière sur (copie sans modèles)',
    didYouKnowPage: "Wikipédia:Le saviez-vous ?/Anecdotes sur l'accueil/Copie sans modèles",
    mintFallback: true,
    discussionPages: [
      'Wikipédia:Le Bistro',
      'Wikipédia:Forum des nouveaux',
      'Wikipédia:Questions techniques',
      'Wikipédia:Forum de relecture',
    ],
    usernamePolicyPage: "Wikipédia:Nom d'utilisateur",
    editingGuidePage: 'Aide:Premiers pas',
  },
}

/** Reader URL for a capability page on the content wiki. */
export function capabilityPageUrl(page: string): string {
  return enwikiArticleUrl(page)
}

export function wikiCapabilities(lang = getContentLang()): WikiCapabilities {
  return CAPABILITIES[lang] ?? { ...CAPABILITIES.en, mintFallback: true, discussionPages: [] }
}
