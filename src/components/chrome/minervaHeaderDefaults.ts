import type { HeaderItem } from '@/components/header/headerItems'

/** Minerva bar's default right-hand items — shared with `ChromeHeader`'s `#user-menu` swap. */
export const MINERVA_DEFAULT_RIGHT: HeaderItem[] = [
  { type: 'button', icon: 'search', label: 'Search' },
  { type: 'button', icon: 'bell-outline', label: 'Notifications' },
  { type: 'button', icon: 'user-avatar-outline', label: 'User menu' },
]
