export type ConfigTheme = 'light' | 'dark' | 'system'
export type ConfigUser = 'logged-out' | 'new' | 'experienced' | 'real'

export type PageListKey = 'watchlist' | 'readingList' | 'editedPages'

export interface UserPageLists {
  watchlist: string[]
  readingList: string[]
  editedPages: string[]
}

export interface Config {
  theme: ConfigTheme
  user: ConfigUser
  /** Wikipedia username when `user` is `'real'`. */
  realUsername: string
  userPageLists: Record<ConfigUser, UserPageLists>
}

export const DEFAULT_USER_PAGE_LISTS: Record<ConfigUser, UserPageLists> = {
  'logged-out': {
    watchlist: [],
    readingList: [],
    editedPages: [],
  },
  new: {
    watchlist: [],
    readingList: ['Wet Leg', 'Jade Thirlwall'],
    editedPages: [],
  },
  experienced: {
    watchlist: [
      'Wet Leg',
      'Jade Thirlwall',
      'Confidence Man (band)',
      'Gorillaz',
      'Little Mix',
      'DSEI',
    ],
    readingList: [
      'Wet Leg',
      'Jade Thirlwall',
      'Confidence Man (band)',
      'Gorillaz',
      'Little Mix',
      'Charli XCX',
      'Dada',
      'Surrealism',
    ],
    editedPages: ['Wet Leg', 'Jade Thirlwall', 'Confidence Man (band)', 'Gorillaz'],
  },
  real: {
    watchlist: [],
    readingList: [],
    editedPages: [],
  },
}

export const DEFAULT_CONFIG: Config = {
  theme: 'system',
  user: 'new',
  realUsername: '',
  userPageLists: cloneUserPageListsMap(DEFAULT_USER_PAGE_LISTS),
}

export const CONFIG_USER_DISPLAY_NAMES: Record<ConfigUser, string> = {
  'logged-out': 'LoggedOut',
  new: 'NewEditor',
  experienced: 'ExperiencedEditor',
}

export const CONFIG_USER_MENU_ITEMS: { value: ConfigUser; label: string }[] = [
  { value: 'logged-out', label: 'Logged out' },
  { value: 'new', label: 'New editor' },
  { value: 'experienced', label: 'Experienced editor' },
  { value: 'real', label: 'Real user' },
]

/** Normalize a Wikipedia username for API calls and cache keys. */
export function normalizeWikiUsername(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.length) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function configUserDisplayName(user: ConfigUser, realUsername = ''): string {
  if (user === 'real') {
    const name = normalizeWikiUsername(realUsername)
    return name.length > 0 ? name : 'Real user'
  }
  return CONFIG_USER_DISPLAY_NAMES[user]
}

/** Greeting on newcomer homepage / dashboard special pages. */
export function configUserPageTitle(user: ConfigUser, realUsername = ''): string {
  if (user === 'logged-out') return 'Hello!'
  return `Hello, ${configUserDisplayName(user, realUsername)}!`
}

export function parsePageList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function formatPageList(pages: string[]): string {
  return pages.join(', ')
}

export function resetUserPageListField(
  lists: UserPageLists,
  user: ConfigUser,
  field: PageListKey,
): UserPageLists {
  return {
    ...lists,
    [field]: [...DEFAULT_USER_PAGE_LISTS[user][field]],
  }
}

const STORAGE_KEY = 'protowiki-prototype-user-config'

const VALID_THEMES: ConfigTheme[] = ['light', 'dark', 'system']
const VALID_USERS: ConfigUser[] = ['logged-out', 'new', 'experienced', 'real']
const PAGE_LIST_KEYS: PageListKey[] = ['watchlist', 'readingList', 'editedPages']

function isConfigTheme(value: unknown): value is ConfigTheme {
  return typeof value === 'string' && VALID_THEMES.includes(value as ConfigTheme)
}

function isConfigUser(value: unknown): value is ConfigUser {
  return typeof value === 'string' && VALID_USERS.includes(value as ConfigUser)
}

function cloneUserPageLists(lists: UserPageLists): UserPageLists {
  return {
    watchlist: [...lists.watchlist],
    readingList: [...lists.readingList],
    editedPages: [...lists.editedPages],
  }
}

function cloneUserPageListsMap(
  map: Record<ConfigUser, UserPageLists>,
): Record<ConfigUser, UserPageLists> {
  return {
    'logged-out': cloneUserPageLists(map['logged-out']),
    new: cloneUserPageLists(map.new),
    experienced: cloneUserPageLists(map.experienced),
    real: cloneUserPageLists(map.real),
  }
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === 'string')
}

function mergeUserPageLists(user: ConfigUser, stored: unknown): UserPageLists {
  const defaults = DEFAULT_USER_PAGE_LISTS[user]
  if (typeof stored !== 'object' || stored === null) {
    return cloneUserPageLists(defaults)
  }

  const record = stored as Record<string, unknown>
  const merged = { ...cloneUserPageLists(defaults) }

  for (const key of PAGE_LIST_KEYS) {
    const parsed = parseStringArray(record[key])
    if (parsed !== null) {
      merged[key] = parsed
    }
  }

  return merged
}

function mergeUserPageListsMap(stored: unknown): Record<ConfigUser, UserPageLists> {
  const base = cloneUserPageListsMap(DEFAULT_USER_PAGE_LISTS)
  if (typeof stored !== 'object' || stored === null) {
    return base
  }

  const record = stored as Record<string, unknown>
  for (const user of VALID_USERS) {
    base[user] = mergeUserPageLists(user, record[user])
  }

  return base
}

export function loadConfig(): Config {
  if (typeof window === 'undefined') {
    return cloneConfig(DEFAULT_CONFIG)
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneConfig(DEFAULT_CONFIG)

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return cloneConfig(DEFAULT_CONFIG)
    }

    const record = parsed as Record<string, unknown>
    const realUsername =
      typeof record.realUsername === 'string' ? record.realUsername : DEFAULT_CONFIG.realUsername

    return {
      theme: isConfigTheme(record.theme) ? record.theme : DEFAULT_CONFIG.theme,
      user: isConfigUser(record.user) ? record.user : DEFAULT_CONFIG.user,
      realUsername,
      userPageLists: mergeUserPageListsMap(record.userPageLists),
    }
  } catch {
    return cloneConfig(DEFAULT_CONFIG)
  }
}

function cloneConfig(config: Config): Config {
  return {
    theme: config.theme,
    user: config.user,
    realUsername: config.realUsername,
    userPageLists: cloneUserPageListsMap(config.userPageLists),
  }
}

export function saveConfig(config: Config): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}
