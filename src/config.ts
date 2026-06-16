export type ConfigTheme = 'light' | 'dark' | 'system'
export type ConfigUser = 'logged-out' | 'new' | 'experienced' | 'real'

export type PageListKey = 'watchlist' | 'readingList' | 'editedPages'

export interface UserPageLists {
  /** Wikipedia language code (e.g. `en`, `fr`). */
  lang: string
  watchlist: string[]
  readingList: string[]
  editedPages: string[]
}

export interface Config {
  theme: ConfigTheme
  user: ConfigUser
  /** Wikipedia username when `user` is `'real'`. */
  realUsername: string
  /** Contact detail for Wikimedia API etiquette (email/URL), appended to user agent. */
  apiContact: string
  userPageLists: Record<ConfigUser, UserPageLists>
}

export const DEFAULT_USER_PAGE_LISTS: Record<ConfigUser, UserPageLists> = {
  'logged-out': {
    lang: 'en',
    watchlist: [],
    readingList: [],
    editedPages: [],
  },
  new: {
    lang: 'en',
    watchlist: [],
    readingList: ['Wet Leg', 'Jade Thirlwall'],
    editedPages: [],
  },
  experienced: {
    lang: 'en',
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
    lang: 'en',
    watchlist: [],
    readingList: [],
    editedPages: [],
  },
}

export const DEFAULT_CONFIG: Config = {
  theme: 'light',
  user: 'new',
  realUsername: '',
  apiContact: '',
  userPageLists: cloneUserPageListsMap(DEFAULT_USER_PAGE_LISTS),
}

export const PROTOWIKI_API_USER_AGENT = 'ProtoWiki/0.1'
export const PROTOWIKI_API_PROJECT_URL = 'https://github.com/wikimedia/ProtoWiki'
export const DEFAULT_API_CONTACT = 'lwilson-ctr@wikimedia.org'

export const CONFIG_USER_DISPLAY_NAMES: Partial<Record<ConfigUser, string>> = {
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

export const CONFIG_THEME_MENU_ITEMS: { value: ConfigTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/** Normalize a Wikipedia username for API calls and cache keys. */
export function normalizeWikiUsername(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.length) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** Normalize a Wikipedia language code for API calls and cache keys. */
export function normalizeLang(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  return trimmed.length ? trimmed : 'en'
}

/** Wiki hostname from a language code (e.g. `fr` → `fr.wikipedia.org`). */
export function wikiHostFromLang(lang: string): string {
  return `${normalizeLang(lang)}.wikipedia.org`
}

/** FakeWiki / REST client base URL (trailing slash). */
export function wikiBaseUrlFromLang(lang: string): string {
  return `https://${wikiHostFromLang(lang)}/`
}

/** VisualEditor / wikitext edit URL for an article title. */
export function wikiEditUrlFromLang(lang: string, title: string): string {
  const trimmed = title.trim()
  const pageTitle = trimmed.replace(/ /g, '_')
  return `https://${wikiHostFromLang(lang)}/w/index.php?title=${encodeURIComponent(pageTitle)}&action=edit`
}

export function langForUser(
  user: ConfigUser,
  userPageLists: Record<ConfigUser, UserPageLists>,
): string {
  return normalizeLang(userPageLists[user]?.lang)
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

function resolveApiContact(rawContact: string): string {
  const normalized = rawContact.trim()
  return normalized.length ? normalized : DEFAULT_API_CONTACT
}

/** `fetch` headers for Wikimedia API requests (`Api-User-Agent`). */
export function wikimediaApiFetchHeaders(purpose?: string, apiContact?: string): HeadersInit {
  const tag = purpose?.trim()
  const contact = resolveApiContact(apiContact ?? loadConfig().apiContact)
  const base = `${PROTOWIKI_API_USER_AGENT} (${PROTOWIKI_API_PROJECT_URL}; ${contact})`
  return { 'Api-User-Agent': tag ? `${base} ${tag}` : base }
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
    lang: lists.lang,
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

  if (typeof record.lang === 'string') {
    merged.lang = normalizeLang(record.lang)
  }

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

/** Build a complete, valid config object from partial or legacy stored data. */
export function normalizeConfig(input: unknown): Config {
  if (typeof input !== 'object' || input === null) {
    return cloneConfig(DEFAULT_CONFIG)
  }

  const record = input as Record<string, unknown>
  const realUsername =
    typeof record.realUsername === 'string' ? record.realUsername : DEFAULT_CONFIG.realUsername
  const apiContact =
    typeof record.apiContact === 'string' ? record.apiContact : DEFAULT_CONFIG.apiContact
  const userPageLists = mergeUserPageListsMap(record.userPageLists)

  if (typeof record.realWiki === 'string') {
    userPageLists.real = {
      ...userPageLists.real,
      lang: normalizeLang(record.realWiki),
    }
  }

  return {
    theme: isConfigTheme(record.theme) ? record.theme : DEFAULT_CONFIG.theme,
    user: isConfigUser(record.user) ? record.user : DEFAULT_CONFIG.user,
    realUsername,
    apiContact,
    userPageLists,
  }
}

function persistConfig(config: Config): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Quota or private-mode failures — ignore.
  }
}

function clearStoredConfig(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode or blocked storage — ignore.
  }
}

export function loadConfig(): Config {
  if (typeof window === 'undefined') {
    return cloneConfig(DEFAULT_CONFIG)
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneConfig(DEFAULT_CONFIG)

    const parsed: unknown = JSON.parse(raw)
    const normalized = normalizeConfig(parsed)
    persistConfig(normalized)
    return normalized
  } catch {
    clearStoredConfig()
    return cloneConfig(DEFAULT_CONFIG)
  }
}

function cloneConfig(config: Config): Config {
  return {
    theme: config.theme,
    user: config.user,
    realUsername: config.realUsername,
    apiContact: config.apiContact,
    userPageLists: cloneUserPageListsMap(config.userPageLists),
  }
}

export function saveConfig(config: Config): void {
  persistConfig(normalizeConfig(config))
}
