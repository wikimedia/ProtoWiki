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
  /**
   * Alternative to `featuredPage` for wikis whose main-page summary doesn't
   * link the article itself: wikitext (expanded with `expandtemplates`, so
   * `{{msgnw:…}}` yields a template's source) and the parameter naming the
   * featured article.
   */
  featuredTitleSource?: { wikitext: string; param: string }
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
  es: {
    // The Portada rotates lettered subtemplates; its summary bolds a phrase
    // that links elsewhere, so read the template's `título` instead.
    featuredTitleSource: {
      wikitext: '{{msgnw:Plantilla:Portada:Destacado/{{Portada:Destacado/Letra}}}}',
      param: 'título',
    },
    // eswiki's Portada has no "¿Sabías que…?" section.
    mintFallback: true,
    discussionPages: [
      'Wikipedia:Café/Archivo/Ayuda/Actual',
      'Wikipedia:Café/Archivo/Miscelánea/Actual',
      'Wikipedia:Café/Archivo/Propuestas/Actual',
      'Wikipedia:Café/Archivo/Políticas/Actual',
      'Wikipedia:Café/Archivo/Técnica/Actual',
      'Wikipedia:Café/Archivo/Noticias/Actual',
    ],
    usernamePolicyPage: 'Wikipedia:Nombres de usuario',
    editingGuidePage: 'Ayuda:Introducción',
  },
}

/** Reader URL for a capability page on the content wiki. */
export function capabilityPageUrl(page: string): string {
  return enwikiArticleUrl(page)
}

export function wikiCapabilities(lang = getContentLang()): WikiCapabilities {
  return CAPABILITIES[lang] ?? { ...CAPABILITIES.en, mintFallback: true, discussionPages: [] }
}
