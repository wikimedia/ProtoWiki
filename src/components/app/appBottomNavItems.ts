import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconArticleSearch,
  cdxIconBookmarkOutline,
  cdxIconEllipsis,
  cdxIconGlobe,
  cdxIconHistory,
  cdxIconHome,
  cdxIconLanguage,
  cdxIconListBullet,
  cdxIconMapPin,
  cdxIconMenu,
  cdxIconSearch,
  cdxIconSearchCaseSensitive,
} from '@wikimedia/codex-icons'

/** Preset identifiers for app bottom navigation items; order follows layout. */
export type AppBottomNavItem =
  | 'home'
  | 'globe'
  | 'map-pin'
  | 'bookmarks'
  | 'search'
  | 'history'
  | 'menu'
  | 'language'
  | 'article-search'
  | 'search-case-sensitive'
  | 'list-bullet'
  | 'ellipsis'

/** Android main nav — [Figma 1:696](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-696). */
export const DEFAULT_APP_BOTTOM_NAV_ITEMS: AppBottomNavItem[] = [
  'home',
  'bookmarks',
  'search',
  'history',
  'menu',
]

export const ANDROID_MAIN_BOTTOM_NAV_ITEMS = DEFAULT_APP_BOTTOM_NAV_ITEMS

/** iOS main nav — [Figma 1:1020](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-1020). */
export const IOS_MAIN_BOTTOM_NAV_ITEMS: AppBottomNavItem[] = [
  'globe',
  'map-pin',
  'bookmarks',
  'history',
  'search',
]

/** Android article toolbar — [Figma 1:997](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-997). */
export const ANDROID_ARTICLE_BOTTOM_NAV_ITEMS: AppBottomNavItem[] = [
  'bookmarks',
  'language',
  'article-search',
  'search-case-sensitive',
  'list-bullet',
]

/** iOS article toolbar — [Figma 1:1235](https://www.figma.com/design/8qeEyA6LT4bzpQLin1Gx43/protowiki-apps?node-id=1-1235). */
export const IOS_ARTICLE_BOTTOM_NAV_ITEMS: AppBottomNavItem[] = [
  'list-bullet',
  'language',
  'bookmarks',
  'article-search',
  'search-case-sensitive',
  'ellipsis',
]

export const APP_BOTTOM_NAV_ITEM_META: Record<
  AppBottomNavItem,
  { icon: Icon; ariaLabel: string }
> = {
  home: { icon: cdxIconHome, ariaLabel: 'Home' },
  globe: { icon: cdxIconGlobe, ariaLabel: 'Explore' },
  'map-pin': { icon: cdxIconMapPin, ariaLabel: 'Places' },
  bookmarks: { icon: cdxIconBookmarkOutline, ariaLabel: 'Saved' },
  search: { icon: cdxIconSearch, ariaLabel: 'Search' },
  history: { icon: cdxIconHistory, ariaLabel: 'History' },
  menu: { icon: cdxIconMenu, ariaLabel: 'Menu' },
  language: { icon: cdxIconLanguage, ariaLabel: 'Language' },
  'article-search': { icon: cdxIconArticleSearch, ariaLabel: 'Find in page' },
  'search-case-sensitive': { icon: cdxIconSearchCaseSensitive, ariaLabel: 'Case sensitive' },
  'list-bullet': { icon: cdxIconListBullet, ariaLabel: 'Contents' },
  ellipsis: { icon: cdxIconEllipsis, ariaLabel: 'More' },
}
