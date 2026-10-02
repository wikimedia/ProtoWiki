/** Live enwiki beta features from `list=betafeatures` + extension GetBetaFeaturePreferences. */

export type BetaFeatureDef = {
  id: string
  label: string
  /** Pre-parsed description HTML (absolute hrefs). */
  descriptionHtml: string
  screenshot: string
  infoHref: string
  discussionHref: string
  userCount: number
  requiresJavascript?: boolean
}

export const BETA_FEATURES: BetaFeatureDef[] = [
  {
    id: 'twocolconflict',
    label: 'Paragraph-based edit conflict',
    descriptionHtml:
      '<p>Show the edit conflict view using a more advanced paragraph-based view.</p>',
    screenshot:
      'https://en.wikipedia.org/w/extensions/TwoColConflict/resources/TwoColConflict-beta-features-ltr.svg',
    infoHref: 'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Two_Column_Edit_Conflict_View',
    discussionHref: 'https://www.mediawiki.org/wiki/Help_talk:Two_Column_Edit_Conflict_View',
    userCount: 139829,
  },
  {
    id: 'cx',
    label: 'Content Translation',
    descriptionHtml:
      '<p>A <a href="https://en.wikipedia.org/wiki/Wikipedia:Content_translation_tool">tool</a> to quickly translate pages into your language. Start translations from <a href="https://en.wikipedia.org/wiki/Special:MyContributions">your contributions page</a>, and edit them with our side-by-side editor specially designed for translation. Some of the tools may be only available for specific languages. Please note, on the English Wikipedia this tool is restricted to editors that are <a href="https://en.wikipedia.org/wiki/Wikipedia:User_access_levels#Extendedconfirmed">extended-confirmed</a>.</p>',
    screenshot: 'https://en.wikipedia.org/w/extensions/ContentTranslation/images/cx-icon-ltr.svg',
    infoHref: 'https://www.mediawiki.org/wiki/Special:MyLanguage/Content_translation',
    discussionHref: 'https://www.mediawiki.org/wiki/Talk:Content_translation',
    userCount: 412964,
    requiresJavascript: true,
  },
  {
    id: 'multimediaviewer-beta',
    label: 'Image carousel',
    descriptionHtml: '<p>Show article images at the top of the page on mobile devices.</p>',
    screenshot:
      'https://en.wikipedia.org/w/extensions/MultimediaViewer/resources/assets/beta-feature-ltr.png',
    infoHref: 'https://www.mediawiki.org/wiki/Readers/Reader_Growth/Image_Browsing',
    discussionHref: 'https://www.mediawiki.org/wiki/Talk:Readers/Reader_Growth/Image_Browsing',
    userCount: 9893,
  },
  {
    id: 'visualeditor-editcheck-suggestions',
    label: 'Suggestion mode',
    descriptionHtml:
      '<p>Community-configured edit suggestions for improving articles. Available in <a href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:VisualEditor/User_guide">visual editor</a>.</p>',
    screenshot:
      'https://en.wikipedia.org/w/extensions/VisualEditor/editcheck/images/betafeatures-icon-editcheck-suggestions-ltr.svg',
    infoHref: 'https://www.mediawiki.org/wiki/Special:MyLanguage/Edit_check/Suggestions',
    discussionHref: 'https://www.mediawiki.org/wiki/Special:MyLanguage/Talk:Edit_check/Suggestions',
    userCount: 17867,
    requiresJavascript: true,
  },
]

export function formatBetaFeatureUserCount(count: number): string {
  if (count === 0) return 'No users are trying this feature.'
  if (count === 1) return 'One user is trying this feature.'
  return `${count.toLocaleString('en-US')} users are trying this feature.`
}
