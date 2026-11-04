import { cdxIconHelpNotice } from '@wikimedia/codex-icons'
import type { MenuItemData } from '@wikimedia/codex'
import type { WikitabModuleId } from '../sections'
import { articleUrl } from './wikitabHtml'

/** enwiki project page titles for modules that expose an About footer. */
export const WIKITAB_MODULE_ABOUT_PAGE: Partial<Record<WikitabModuleId, string>> = {
  dyk: 'Wikipedia:Did you know',
  news: 'Wikipedia:In the news',
  otd: 'Wikipedia:Selected anniversaries',
  births: 'Wikipedia:Selected anniversaries',
}

export function wikitabModuleAboutFooter(
  moduleId: WikitabModuleId,
  heading: string,
): MenuItemData | null {
  const pageTitle = WIKITAB_MODULE_ABOUT_PAGE[moduleId]
  if (!pageTitle) return null
  return {
    value: 'about',
    label: `About ${heading}`,
    icon: cdxIconHelpNotice,
    url: articleUrl(pageTitle),
    urlNewTab: true,
  }
}
