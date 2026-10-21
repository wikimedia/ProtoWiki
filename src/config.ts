export type ConfigTheme = 'light' | 'dark' | 'system'
export type PrototypePlatform = 'web' | 'app'
export type AppPlatform = 'ios' | 'android'
export type ConfigAppPlatform = 'auto' | AppPlatform
export type ConfigWebSkin = 'auto' | 'desktop' | 'mobile'
export type ConfigUser = 'logged-out' | 'new' | 'experienced' | 'real'

/** Mock editor total edit count (Visual Editor / Suggestion Mode prototypes). */
export type ConfigMockEditorEditCount = 'none' | 'new' | 'intermediate' | 'experienced'

export const CONFIG_MOCK_EDITOR_EDIT_COUNT_ITEMS: {
  value: ConfigMockEditorEditCount
  label: string
}[] = [
  { value: 'none', label: '0 edits' },
  { value: 'new', label: '10 edits or fewer' },
  { value: 'intermediate', label: '11–999 edits' },
  { value: 'experienced', label: '1,000 edits or more' },
]

/** Edits dropdown for mock presets (new / experienced). */
export const CONFIG_MOCK_EDITOR_EDIT_COUNT_SELECT_ITEMS = CONFIG_MOCK_EDITOR_EDIT_COUNT_ITEMS

export interface MockEditorEditCountByUser {
  new: ConfigMockEditorEditCount
  experienced: ConfigMockEditorEditCount
}

export const DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER: MockEditorEditCountByUser = {
  new: 'none',
  experienced: 'experienced',
}

/** Default mock Edits value when a preset is reset. */
export function defaultMockEditorEditCountForUser(user: ConfigUser): ConfigMockEditorEditCount | null {
  if (user === 'new') return DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER.new
  if (user === 'experienced') return DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER.experienced
  return null
}

export function isDefaultMockEditorEditCountByUser(
  user: ConfigUser,
  byUser: MockEditorEditCountByUser,
): boolean {
  if (user === 'new') return byUser.new === DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER.new
  if (user === 'experienced') {
    return byUser.experienced === DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER.experienced
  }
  return true
}

function mergeMockEditorEditCountByUser(stored: unknown, legacySingle?: unknown): MockEditorEditCountByUser {
  const base = { ...DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER }
  if (typeof stored === 'object' && stored !== null) {
    const record = stored as Record<string, unknown>
    if (isConfigMockEditorEditCount(record.new)) base.new = record.new
    if (isConfigMockEditorEditCount(record.experienced)) base.experienced = record.experienced
  }
  if (isConfigMockEditorEditCount(legacySingle)) {
    base.experienced = legacySingle
    if (legacySingle === 'experienced') base.new = 'none'
  }
  return base
}

const VALID_MOCK_EDITOR_EDIT_COUNTS = new Set<ConfigMockEditorEditCount>(
  CONFIG_MOCK_EDITOR_EDIT_COUNT_ITEMS.map((item) => item.value),
)

export function isConfigMockEditorEditCount(value: unknown): value is ConfigMockEditorEditCount {
  return typeof value === 'string' && VALID_MOCK_EDITOR_EDIT_COUNTS.has(value as ConfigMockEditorEditCount)
}

/** Representative edit count for a mock bucket (Suggestion Mode gates). */
export function mockBucketToEditCount(bucket: ConfigMockEditorEditCount): number {
  switch (bucket) {
    case 'none':
      return 0
    case 'new':
      return 10
    case 'intermediate':
      return 500
    case 'experienced':
      return 1000
  }
}

/** ≥1,000 edits — unlocks "Add a link" suggestions. */
export function editorIsExperienced(edits: number): boolean {
  return edits >= 1000
}

/** ≥25 edits — unlocks experimental lead-length suggestions. */
export function editorHasAtLeast25Edits(edits: number): boolean {
  return edits >= 25
}

/** ≤10 edits — first completed suggestion can offer the publish path. */
export function editorShowsPublishPath(edits: number): boolean {
  return edits <= 10
}

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
  /** Native app OS preference for `platform: 'app'` prototypes. */
  appPlatform: ConfigAppPlatform
  /** Vector / Minerva skin preference for `platform: 'web'` prototypes. */
  webSkin: ConfigWebSkin
  user: ConfigUser
  /** Wikipedia username when `user` is `'real'`. */
  realUsername: string
  userPageLists: Record<ConfigUser, UserPageLists>
  /** Mock Edits dropdown value per preset (New user / Experienced editor). */
  mockEditorEditCountByUser: MockEditorEditCountByUser
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
    readingList: [],
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
  appPlatform: 'auto',
  webSkin: 'auto',
  user: 'new',
  realUsername: 'Todepond',
  userPageLists: cloneUserPageListsMap(DEFAULT_USER_PAGE_LISTS),
  mockEditorEditCountByUser: { ...DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER },
}

export const PROTOWIKI_API_USER_AGENT = 'ProtoWiki/0.4'
export const PROTOWIKI_API_PROJECT_URL = 'https://github.com/wikimedia/ProtoWiki'
export const PROTOWIKI_LICENSE_URL = `${PROTOWIKI_API_PROJECT_URL}/blob/main/LICENSE`
export const DEFAULT_API_CONTACT = 'lwilson-ctr@wikimedia.org'

export const CONFIG_USER_DISPLAY_NAMES: Partial<Record<ConfigUser, string>> = {
  'logged-out': 'LoggedOut',
  new: 'New user',
  experienced: 'Experienced editor',
}

export const CONFIG_USER_MENU_ITEMS: { value: ConfigUser; label: string; description?: string }[] = [
  { value: 'logged-out', label: 'Logged out user' },
  { value: 'new', label: 'New user' },
  { value: 'experienced', label: 'Experienced editor' },
  { value: 'real', label: 'Real user', description: 'Connect to a real account on the wikis' },
]

export const CONFIG_THEME_MENU_ITEMS: { value: ConfigTheme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export const CONFIG_APP_PLATFORM_MENU_ITEMS: { value: ConfigAppPlatform; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
]

export const CONFIG_WEB_SKIN_MENU_ITEMS: { value: ConfigWebSkin; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
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

/** Trim and treat underscores like spaces — same as article chrome titles. */
export function normalizeWikiPageTitleInput(raw: string): string {
  return raw.trim().replace(/_/g, ' ')
}

/** @deprecated Use {@link normalizeWikiPageTitleInput}. */
export const normalizePageListTitle = normalizeWikiPageTitleInput

export function pageListContains(pages: string[], pageTitle: string): boolean {
  const key = normalizeWikiPageTitleInput(pageTitle)
  if (!key.length) return false
  return pages.includes(key)
}

export function togglePageInList(
  pages: string[],
  pageTitle: string,
  options: { prepend?: boolean } = {},
): string[] {
  const key = normalizeWikiPageTitleInput(pageTitle)
  if (!key.length) return [...pages]
  const index = pages.indexOf(key)
  if (index >= 0) {
    return pages.filter((_, i) => i !== index)
  }
  return options.prepend ? [key, ...pages] : [...pages, key]
}

/** Add or move a page to the front (canonical title). */
export function prependPageInList(pages: string[], pageTitle: string): string[] {
  const key = normalizeWikiPageTitleInput(pageTitle)
  if (!key.length) return [...pages]
  const rest = pages.filter((page) => normalizeWikiPageTitleInput(page) !== key)
  return [key, ...rest]
}

export function resetUserPageLists(user: ConfigUser): UserPageLists {
  return cloneUserPageLists(DEFAULT_USER_PAGE_LISTS[user])
}

function userPageListsEqual(a: UserPageLists, b: UserPageLists): boolean {
  const arraysEqual = (x: string[], y: string[]) =>
    x.length === y.length && x.every((v, i) => v === y[i])
  return (
    a.lang === b.lang &&
    arraysEqual(a.watchlist, b.watchlist) &&
    arraysEqual(a.readingList, b.readingList) &&
    arraysEqual(a.editedPages, b.editedPages)
  )
}

/** Whether a preset's page lists still match its shipped defaults (i.e. nothing to reset). */
export function isDefaultUserPageLists(user: ConfigUser, lists: UserPageLists): boolean {
  const defaults = DEFAULT_USER_PAGE_LISTS[user]
  if (user === 'real') {
    const arraysEqual = (x: string[], y: string[]) =>
      x.length === y.length && x.every((v, i) => v === y[i])
    return (
      lists.lang === defaults.lang &&
      arraysEqual(lists.watchlist, defaults.watchlist) &&
      arraysEqual(lists.readingList, defaults.readingList)
    )
  }
  return userPageListsEqual(lists, defaults)
}

function resolveApiContact(rawContact: string): string {
  const normalized = rawContact.trim()
  return normalized.length ? normalized : DEFAULT_API_CONTACT
}

/** `fetch` headers for Wikimedia API requests (`Api-User-Agent`). */
export function wikimediaApiFetchHeaders(purpose?: string, apiContact?: string): HeadersInit {
  const tag = purpose?.trim()
  const contact = resolveApiContact(apiContact ?? DEFAULT_API_CONTACT)
  const base = `${PROTOWIKI_API_USER_AGENT} (${PROTOWIKI_API_PROJECT_URL}; ${contact})`
  return { 'Api-User-Agent': tag ? `${base} ${tag}` : base }
}

const STORAGE_KEY = 'protowiki-prototype-user-config'

const VALID_THEMES: ConfigTheme[] = ['light', 'dark', 'system']
const VALID_CONFIG_APP_PLATFORMS: ConfigAppPlatform[] = ['auto', 'ios', 'android']
const VALID_WEB_SKINS: ConfigWebSkin[] = ['auto', 'desktop', 'mobile']
const VALID_USERS: ConfigUser[] = ['logged-out', 'new', 'experienced', 'real']
export const PAGE_LIST_FIELD_KEYS: PageListKey[] = ['watchlist', 'readingList', 'editedPages']

const PAGE_LIST_KEYS = PAGE_LIST_FIELD_KEYS

function isConfigTheme(value: unknown): value is ConfigTheme {
  return typeof value === 'string' && VALID_THEMES.includes(value as ConfigTheme)
}

export function isConfigAppPlatform(value: unknown): value is ConfigAppPlatform {
  return (
    typeof value === 'string' && VALID_CONFIG_APP_PLATFORMS.includes(value as ConfigAppPlatform)
  )
}

export function isConfigWebSkin(value: unknown): value is ConfigWebSkin {
  return typeof value === 'string' && VALID_WEB_SKINS.includes(value as ConfigWebSkin)
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
  const userPageLists = mergeUserPageListsMap(record.userPageLists)

  if (typeof record.realWiki === 'string') {
    userPageLists.real = {
      ...userPageLists.real,
      lang: normalizeLang(record.realWiki),
    }
  }

  const user = isConfigUser(record.user) ? record.user : DEFAULT_CONFIG.user
  const mockEditorEditCountByUser = mergeMockEditorEditCountByUser(
    record.mockEditorEditCountByUser,
    record.mockEditorEditCount,
  )

  return {
    theme: isConfigTheme(record.theme) ? record.theme : DEFAULT_CONFIG.theme,
    appPlatform: isConfigAppPlatform(record.appPlatform)
      ? record.appPlatform
      : DEFAULT_CONFIG.appPlatform,
    webSkin: isConfigWebSkin(record.webSkin) ? record.webSkin : DEFAULT_CONFIG.webSkin,
    user,
    realUsername,
    userPageLists,
    mockEditorEditCountByUser,
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
    appPlatform: config.appPlatform,
    webSkin: config.webSkin,
    user: config.user,
    realUsername: config.realUsername,
    userPageLists: cloneUserPageListsMap(config.userPageLists),
    mockEditorEditCountByUser: { ...config.mockEditorEditCountByUser },
  }
}

export function saveConfig(config: Config): void {
  persistConfig(normalizeConfig(config))
}
