import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconBookmarkOutline,
  cdxIconHistory,
  cdxIconHome,
  cdxIconMenu,
  cdxIconSearch,
} from '@wikimedia/codex-icons'

/** Preset identifiers for app bottom navigation items; order follows layout. */
export type AppBottomNavItem = 'home' | 'bookmarks' | 'search' | 'history' | 'menu'

export const DEFAULT_APP_BOTTOM_NAV_ITEMS: AppBottomNavItem[] = [
  'home',
  'bookmarks',
  'search',
  'history',
  'menu',
]

export const APP_BOTTOM_NAV_ITEM_META: Record<
  AppBottomNavItem,
  { icon: Icon; ariaLabel: string }
> = {
  home: { icon: cdxIconHome, ariaLabel: 'Home' },
  bookmarks: { icon: cdxIconBookmarkOutline, ariaLabel: 'Saved' },
  search: { icon: cdxIconSearch, ariaLabel: 'Search' },
  history: { icon: cdxIconHistory, ariaLabel: 'History' },
  menu: { icon: cdxIconMenu, ariaLabel: 'Menu' },
}
