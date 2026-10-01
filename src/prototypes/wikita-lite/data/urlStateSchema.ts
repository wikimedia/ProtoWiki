import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import {
  DEFAULT_CONFIG,
  DEFAULT_KNOWN_LANGUAGES,
  type ConfigAppPlatform,
  type ConfigTheme,
  type ConfigUser,
  type ConfigWebSkin,
} from '@/config'

import type { UserList } from '../../musical-group/data/lists'
import {
  DEFAULT_SUGGESTION_PREFERENCES,
  type SuggestionPreferences,
} from '../../musical-group/data/suggestionPreferences'
import { backfillReadingListSavedAt } from '@/config'
import { DEFAULT_CONTENT_LANG, parseContentLang } from '@/lib/contentLang'

import { normalizeEnwikiTitle } from '../../musical-group/data/enwikiTitle'
import { normalizeInterestTitles } from '../../musical-group/data/interests'
import { normalizeQid } from '../../musical-group/data/wikidataApi'
import type { OnboardingScreen, SurveyChoice } from '../onboarding/data/useWikitaLiteOnboardingFlow'
import {
  ONBOARDING_SCREENS,
  parseOnboardingScreen,
} from '../onboarding/data/useWikitaLiteOnboardingFlow'
import { DEFAULT_CARD_BORDERS_PREFERENCE } from './cardBorders'
import { DEFAULT_CARD_RADIUS_PREFERENCE } from './cardRadius'
import {
  DEFAULT_DASHBOARD_MODE,
  parseDashboardMode,
  resolveDashboardMode,
  type WikitaLiteDashboardMode,
} from './dashboardMode'
import { DEFAULT_HIDE_TAB_BAR_PREFERENCE } from './hideTabBar'
import { parseHomeLayoutOverrides, serializeHomeLayoutOverrides, type HomeLayoutOverrides } from './homeLayout'
import {
  CONTRIBUTE_MODULE_IDS,
  EXPLORE_READ_MODULE_IDS,
  HOME_EDIT_MODULE_IDS,
  type WikitaLiteModuleId,
} from './homeModuleIds'
import { DEFAULT_MODULE_MENU_MODE_PREFERENCE } from './moduleMenuMode'
import { pruneExpiredDismissals, type DismissedModules } from './moduleDismissals'
import type { TabPinnedModules } from './modulePins'
import { DEFAULT_MODULE_SUGGESTION_CONFIG } from './moduleSuggestionPreferences'
import {
  DEFAULT_WIKITA_LITE_VIEW,
  isPersonalizationReturnPath,
  parseWikitaLiteView,
  type WikitaLiteView,
} from '../routes'

const ALL_DISMISSABLE_MODULE_IDS = [
  ...new Set([
    ...HOME_EDIT_MODULE_IDS,
    ...EXPLORE_READ_MODULE_IDS,
    ...CONTRIBUTE_MODULE_IDS,
    'mentor',
  ]),
] as readonly WikitaLiteModuleId[]

const DISMISS_PREFIX = 'dismiss_'

const VALID_USERS: ConfigUser[] = ['logged-out', 'new', 'experienced', 'real']
const VALID_THEMES: ConfigTheme[] = ['light', 'dark', 'system']
const VALID_SKINS: ConfigWebSkin[] = ['auto', 'desktop', 'mobile']
const VALID_PLATFORMS: ConfigAppPlatform[] = ['auto', 'ios', 'android']
const SURVEY_CHOICES: SurveyChoice[] = ['read', 'edit', 'both']

export const WIKITA_LITE_ROUTE_PREFIX = '/wikita-lite'

/** Post-onboarding overlay screens driven by `?screen=` on Home. */
export const HOME_OVERLAY_SCREENS = ['splash'] as const

export type HomeOverlayScreen = (typeof HOME_OVERLAY_SCREENS)[number]

export type WikitaLiteScreen = OnboardingScreen | HomeOverlayScreen

export function isHomeOverlayScreen(value: string): value is HomeOverlayScreen {
  return (HOME_OVERLAY_SCREENS as readonly string[]).includes(value)
}

export function isWikitaLiteRoute(path: string): boolean {
  return path === WIKITA_LITE_ROUTE_PREFIX || path.startsWith(`${WIKITA_LITE_ROUTE_PREFIX}/`)
}

export interface WikitaLiteHelpWantedOverrides {
  useDefaultSettings: boolean
  preferences: SuggestionPreferences
  interests: string[]
}

export interface WikitaLiteUrlState {
  view: WikitaLiteView
  mode: WikitaLiteDashboardMode
  onboarded: boolean
  screen: WikitaLiteScreen
  title: string
  username: string
  email: string
  survey: SurveyChoice | ''
  interests: string[]
  /** True once `interests` has been written to the URL (including explicit empty). */
  interestsTouched: boolean
  returnTo: OnboardingScreen | ''
  user: ConfigUser
  realUser: string
  theme: ConfigTheme
  skin: ConfigWebSkin
  platform: ConfigAppPlatform
  /** Content wiki language (`fr` → fr.wikipedia.org). */
  lang: string
  /** Interface language override (`?uselang=`); empty = follow `lang`. */
  uselang: string
  langs: string[]
  displayName: string
  saved: string[]
  savedTs: number[]
  edited: string[]
  /** English Wikipedia user whose history filled `edited` (Advanced personalization). */
  editedFrom: string
  watchlist: string[]
  suggestionPreferences: SuggestionPreferences
  helpWantedOverrides: WikitaLiteHelpWantedOverrides
  dismissed: DismissedModules
  pinned: TabPinnedModules
  hideCardBorders: boolean
  useLargeRadius: boolean
  hideTabBar: boolean
  useModuleMenuMode: boolean
  bannerDismissed: boolean
  /** null = use dashboard-mode default; true/false = explicit override. */
  mentorAssigned: boolean | null
  mentorBannerDismissed: boolean
  lists: UserList[]
  homeLayout: HomeLayoutOverrides
  /** Transient: subpage to return to after closing Personalization. */
  personalizationReturn: string
}

export type WikitaLiteUrlStatePatch = Partial<{
  view: WikitaLiteView | null
  mode: WikitaLiteDashboardMode | null
  onboarded: boolean | null
  screen: WikitaLiteScreen | null
  title: string | null
  username: string | null
  email: string | null
  survey: SurveyChoice | '' | null
  interests: string[] | null
  returnTo: OnboardingScreen | '' | null
  user: ConfigUser | null
  realUser: string | null
  theme: ConfigTheme | null
  skin: ConfigWebSkin | null
  platform: ConfigAppPlatform | null
  lang: string | null
  uselang: string | null
  langs: string[] | null
  displayName: string | null
  saved: string[] | null
  savedTs: number[] | null
  edited: string[] | null
  editedFrom: string | null
  watchlist: string[] | null
  suggestionPreferences: SuggestionPreferences | null
  helpWantedOverrides: WikitaLiteHelpWantedOverrides | null
  dismissed: DismissedModules | null
  pinned: TabPinnedModules | null
  hideCardBorders: boolean | null
  useLargeRadius: boolean | null
  hideTabBar: boolean | null
  useModuleMenuMode: boolean | null
  bannerDismissed: boolean | null
  mentorAssigned: boolean | null
  mentorBannerDismissed: boolean | null
  lists: UserList[] | null
  homeLayout: HomeLayoutOverrides | null
  personalizationReturn: string | null
}>

export function defaultWikitaLiteUrlState(): WikitaLiteUrlState {
  return {
    view: DEFAULT_WIKITA_LITE_VIEW,
    mode: DEFAULT_DASHBOARD_MODE,
    onboarded: false,
    screen: 'article',
    title: '',
    username: '',
    email: '',
    survey: '',
    interests: [],
    interestsTouched: false,
    returnTo: '',
    user: DEFAULT_CONFIG.user,
    realUser: DEFAULT_CONFIG.realUsername,
    theme: DEFAULT_CONFIG.theme,
    skin: DEFAULT_CONFIG.webSkin,
    platform: DEFAULT_CONFIG.appPlatform,
    lang: DEFAULT_CONTENT_LANG,
    uselang: '',
    langs: [...DEFAULT_KNOWN_LANGUAGES],
    displayName: '',
    saved: [],
    savedTs: [],
    edited: [],
    editedFrom: '',
    watchlist: [],
    suggestionPreferences: { ...DEFAULT_SUGGESTION_PREFERENCES },
    helpWantedOverrides: {
      useDefaultSettings: DEFAULT_MODULE_SUGGESTION_CONFIG.useDefaultSettings,
      preferences: { ...DEFAULT_SUGGESTION_PREFERENCES },
      interests: [],
    },
    dismissed: {},
    pinned: { edit: [], read: [], contribute: [] },
    hideCardBorders: DEFAULT_CARD_BORDERS_PREFERENCE.hideCardBorders,
    useLargeRadius: DEFAULT_CARD_RADIUS_PREFERENCE.useLargeRadius,
    hideTabBar: DEFAULT_HIDE_TAB_BAR_PREFERENCE.hideTabBar,
    useModuleMenuMode: DEFAULT_MODULE_MENU_MODE_PREFERENCE.useModuleMenuMode,
    bannerDismissed: false,
    mentorAssigned: null,
    mentorBannerDismissed: false,
    lists: [],
    homeLayout: { homeOff: [], homeOn: [], homeOrder: [] },
    personalizationReturn: '',
  }
}

function firstString(value: LocationQuery[string]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return typeof value === 'string' ? value : ''
}

function stringArray(value: LocationQuery[string]): string[] {
  if (value === undefined) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map((item) => (item ?? '').trim()).filter(Boolean)
}

function numberArray(value: LocationQuery[string]): number[] {
  return stringArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function parseBoolFlag(raw: string, defaultValue: boolean): boolean {
  if (raw === '1') return true
  if (raw === '0') return false
  return defaultValue
}

function parsePrefBool(raw: string, defaultValue: boolean): boolean {
  if (raw === '1') return true
  if (raw === '0') return false
  return defaultValue
}

function parseOptionalBool(raw: string): boolean | null {
  if (raw === '1') return true
  if (raw === '0') return false
  return null
}

function isScreen(value: string): value is OnboardingScreen {
  return (ONBOARDING_SCREENS as readonly string[]).includes(value)
}

function parseDismissedFromQuery(query: LocationQuery): DismissedModules {
  const dismissed: DismissedModules = {}

  for (const moduleId of ALL_DISMISSABLE_MODULE_IDS) {
    const key = `${DISMISS_PREFIX}${moduleId}`
    const raw = firstString(query[key])
    if (!raw) continue
    const restoreAt = Number(raw)
    if (!Number.isFinite(restoreAt)) continue
    dismissed[moduleId] = restoreAt
  }

  return pruneExpiredDismissals(dismissed)
}

function parsePinnedIds(raw: string, allowed: readonly string[]): WikitaLiteModuleId[] {
  if (!raw.trim()) return []
  const ids: WikitaLiteModuleId[] = []
  for (const entry of raw.split(',')) {
    const id = entry.trim()
    if (!id || !allowed.includes(id)) continue
    if (!ids.includes(id as WikitaLiteModuleId)) {
      ids.push(id as WikitaLiteModuleId)
    }
  }
  return ids
}

function parseListEntry(raw: string): UserList | null {
  const parts = raw.split('|')
  if (parts.length < 1) return null
  const name = parts[0]?.trim()
  if (!name) return null
  const itemIds: string[] = []
  for (const part of parts.slice(1)) {
    const id = normalizeQid(part.trim()) ?? part.trim()
    if (id && !itemIds.includes(id)) itemIds.push(id)
  }
  return {
    id: name,
    name,
    itemIds,
    createdAt: 0,
  }
}

export function parseWikitaLiteQuery(query: LocationQuery): WikitaLiteUrlState {
  const defaults = defaultWikitaLiteUrlState()

  const view = parseWikitaLiteView(query.view)
  const urlMode = parseDashboardMode(query.mode)

  const surveyRaw = firstString(query.survey)
  const survey = (SURVEY_CHOICES as string[]).includes(surveyRaw)
    ? (surveyRaw as SurveyChoice)
    : ''

  const resolvedMode = resolveDashboardMode(urlMode, survey)

  const onboarded = firstString(query.onboarded) === '1'

  const screenRaw = firstString(query.screen)
  const screen: WikitaLiteScreen =
    screenRaw === 'splash'
      ? 'splash'
      : screenRaw
        ? parseOnboardingScreen(screenRaw)
        : onboarded
          ? defaults.screen
          : 'splash'

  const returnToRaw = firstString(query.returnTo).trim()
  const returnTo =
    returnToRaw === 'read'
      ? 'article'
      : isScreen(returnToRaw)
        ? returnToRaw
        : ''

  const userRaw = firstString(query.user)
  const user = VALID_USERS.includes(userRaw as ConfigUser)
    ? (userRaw as ConfigUser)
    : onboarded
      ? 'new'
      : defaults.user

  const themeRaw = firstString(query.theme)
  const theme = VALID_THEMES.includes(themeRaw as ConfigTheme)
    ? (themeRaw as ConfigTheme)
    : defaults.theme

  const skinRaw = firstString(query.skin)
  const skin = VALID_SKINS.includes(skinRaw as ConfigWebSkin)
    ? (skinRaw as ConfigWebSkin)
    : defaults.skin

  const platformRaw = firstString(query.platform)
  const platform = VALID_PLATFORMS.includes(platformRaw as ConfigAppPlatform)
    ? (platformRaw as ConfigAppPlatform)
    : defaults.platform

  const lang = parseContentLang(firstString(query.lang))

  const langsRaw = firstString(query.langs)
  // Translation targets default to the content wiki's language when it isn't English.
  const langs = langsRaw
    ? langsRaw.split('|').map((code) => code.trim().toLowerCase()).filter(Boolean)
    : lang !== DEFAULT_CONTENT_LANG
      ? [lang]
      : defaults.langs

  const title = firstString(query.title).trim()
  const personalizationReturnRaw = firstString(query.personalizationReturn).trim()
  const personalizationReturn = isPersonalizationReturnPath(personalizationReturnRaw)
    ? personalizationReturnRaw
    : ''
  const interestsTouched = query.interests !== undefined
  const explicitInterests = interestsTouched
    ? normalizeInterestTitles(stringArray(query.interests))
    : null

  return {
    view,
    mode: resolvedMode,
    onboarded,
    screen,
    title,
    username: firstString(query.username).trim(),
    email: firstString(query.email).trim(),
    survey,
    interests: explicitInterests ?? [],
    interestsTouched,
    returnTo,
    user,
    realUser: firstString(query.realUser).trim(),
    theme,
    skin,
    platform,
    lang,
    uselang: firstString(query.uselang) ? parseContentLang(firstString(query.uselang)) : '',
    langs,
    displayName: firstString(query.displayName).trim(),
    saved: stringArray(query.saved).map((t) => normalizeEnwikiTitle(t) ?? t),
    savedTs: backfillReadingListSavedAt(
      stringArray(query.saved).map((t) => normalizeEnwikiTitle(t) ?? t),
      numberArray(query.savedTs),
    ),
    edited: stringArray(query.edited).map((t) => normalizeEnwikiTitle(t) ?? t),
    editedFrom: firstString(query.editedFrom).trim(),
    watchlist: stringArray(query.watchlist).map((t) => normalizeEnwikiTitle(t) ?? t),
    suggestionPreferences: {
      useSavedPages: parsePrefBool(firstString(query.prefSaved), DEFAULT_SUGGESTION_PREFERENCES.useSavedPages),
      useEditingHistory: parsePrefBool(
        firstString(query.prefHistory),
        DEFAULT_SUGGESTION_PREFERENCES.useEditingHistory,
      ),
      useInterests: parsePrefBool(firstString(query.prefInterests), DEFAULT_SUGGESTION_PREFERENCES.useInterests),
      useWatchlist: parsePrefBool(
        firstString(query.prefWatchlist),
        DEFAULT_SUGGESTION_PREFERENCES.useWatchlist,
      ),
    },
    helpWantedOverrides: {
      useDefaultSettings: parseBoolFlag(firstString(query.hwDefault), true),
      preferences: {
        useSavedPages: parsePrefBool(
          firstString(query.hwPrefSaved),
          DEFAULT_SUGGESTION_PREFERENCES.useSavedPages,
        ),
        useEditingHistory: parsePrefBool(
          firstString(query.hwPrefHistory),
          DEFAULT_SUGGESTION_PREFERENCES.useEditingHistory,
        ),
        useInterests: parsePrefBool(
          firstString(query.hwPrefInterests),
          DEFAULT_SUGGESTION_PREFERENCES.useInterests,
        ),
      },
      interests: normalizeInterestTitles(stringArray(query.hwInterests)),
    },
    dismissed: parseDismissedFromQuery(query),
    pinned: {
      edit: parsePinnedIds(firstString(query.pinsHome), HOME_EDIT_MODULE_IDS),
      read: parsePinnedIds(firstString(query.pinsExplore), EXPLORE_READ_MODULE_IDS),
      contribute: parsePinnedIds(firstString(query.pinsContribute), CONTRIBUTE_MODULE_IDS),
    },
    hideCardBorders: parseBoolFlag(firstString(query.hideBorders), DEFAULT_CARD_BORDERS_PREFERENCE.hideCardBorders),
    useLargeRadius: firstString(query.cardRadius) === '8',
    hideTabBar: parseBoolFlag(firstString(query.hideTabBar), DEFAULT_HIDE_TAB_BAR_PREFERENCE.hideTabBar),
    useModuleMenuMode: parseBoolFlag(
      firstString(query.moduleMenus),
      DEFAULT_MODULE_MENU_MODE_PREFERENCE.useModuleMenuMode,
    ),
    bannerDismissed: firstString(query.bannerDismissed) === '1',
    mentorAssigned: parseOptionalBool(firstString(query.mentorAssigned)),
    mentorBannerDismissed: firstString(query.mentorBannerDismissed) === '1',
    lists: stringArray(query.list)
      .map(parseListEntry)
      .filter((entry): entry is UserList => entry !== null),
    homeLayout: parseHomeLayoutOverrides({
      homeOff: firstString(query.homeOff),
      homeOn: firstString(query.homeOn),
      homeOrder: firstString(query.homeOrder),
    }),
    personalizationReturn,
  }
}

function boolToFlag(value: boolean, defaultValue: boolean): string | undefined {
  if (value === defaultValue) return undefined
  return value ? '1' : '0'
}

function prefToFlag(value: boolean, defaultValue: boolean): string | undefined {
  if (value === defaultValue) return undefined
  return value ? '1' : '0'
}

function serializeListEntry(list: UserList): string {
  const ids = list.itemIds.join('|')
  return ids.length ? `${list.name}|${ids}` : list.name
}

export function serializeWikitaLiteState(
  state: WikitaLiteUrlState,
  currentQuery: LocationQuery = {},
): LocationQueryRaw {
  const defaults = defaultWikitaLiteUrlState()
  const next: LocationQueryRaw = {}

  if (state.view !== DEFAULT_WIKITA_LITE_VIEW) next.view = state.view
  if (state.mode !== DEFAULT_DASHBOARD_MODE) next.mode = state.mode
  if (state.onboarded) next.onboarded = '1'

  if (state.screen === 'splash') {
    next.screen = 'splash'
  } else if (!state.onboarded) {
    next.screen = state.screen
  }
  if (state.title && !state.onboarded && state.screen !== 'home') {
    next.title = state.title
  }
  if (state.username && !state.onboarded) next.username = state.username
  if (state.email && !state.onboarded) next.email = state.email
  if (state.survey) next.survey = state.survey
  if (state.returnTo && !state.onboarded) next.returnTo = state.returnTo

  if (state.interestsTouched) {
    if (state.interests.length) {
      next.interests = state.interests
    } else {
      next.interests = ''
    }
  }

  if (state.user !== DEFAULT_CONFIG.user) next.user = state.user
  if (state.realUser) next.realUser = state.realUser
  if (state.theme !== DEFAULT_CONFIG.theme) next.theme = state.theme
  if (state.skin !== DEFAULT_CONFIG.webSkin) next.skin = state.skin
  if (state.platform !== DEFAULT_CONFIG.appPlatform) next.platform = state.platform

  if (state.lang !== DEFAULT_CONTENT_LANG) next.lang = state.lang
  if (state.uselang) next.uselang = state.uselang

  const langsKey = state.langs.join('|')
  const defaultLangsKey = DEFAULT_KNOWN_LANGUAGES.join('|')
  if (langsKey !== defaultLangsKey) next.langs = langsKey

  if (state.displayName) next.displayName = state.displayName

  if (state.saved.length) {
    next.saved = state.saved
    if (state.savedTs.length === state.saved.length) {
      next.savedTs = state.savedTs.map(String)
    }
  }
  if (state.edited.length) next.edited = state.edited
  if (state.editedFrom) next.editedFrom = state.editedFrom
  if (state.watchlist.length) next.watchlist = state.watchlist

  const prefSaved = prefToFlag(
    state.suggestionPreferences.useSavedPages,
    DEFAULT_SUGGESTION_PREFERENCES.useSavedPages,
  )
  const prefHistory = prefToFlag(
    state.suggestionPreferences.useEditingHistory,
    DEFAULT_SUGGESTION_PREFERENCES.useEditingHistory,
  )
  const prefInterests = prefToFlag(
    state.suggestionPreferences.useInterests,
    DEFAULT_SUGGESTION_PREFERENCES.useInterests,
  )
  const prefWatchlist = prefToFlag(
    state.suggestionPreferences.useWatchlist,
    DEFAULT_SUGGESTION_PREFERENCES.useWatchlist,
  )
  if (prefSaved !== undefined) next.prefSaved = prefSaved
  if (prefHistory !== undefined) next.prefHistory = prefHistory
  if (prefInterests !== undefined) next.prefInterests = prefInterests
  if (prefWatchlist !== undefined) next.prefWatchlist = prefWatchlist

  if (!state.helpWantedOverrides.useDefaultSettings) next.hwDefault = '0'
  const hwPrefSaved = prefToFlag(
    state.helpWantedOverrides.preferences.useSavedPages,
    DEFAULT_SUGGESTION_PREFERENCES.useSavedPages,
  )
  const hwPrefHistory = prefToFlag(
    state.helpWantedOverrides.preferences.useEditingHistory,
    DEFAULT_SUGGESTION_PREFERENCES.useEditingHistory,
  )
  const hwPrefInterests = prefToFlag(
    state.helpWantedOverrides.preferences.useInterests,
    DEFAULT_SUGGESTION_PREFERENCES.useInterests,
  )
  if (hwPrefSaved !== undefined) next.hwPrefSaved = hwPrefSaved
  if (hwPrefHistory !== undefined) next.hwPrefHistory = hwPrefHistory
  if (hwPrefInterests !== undefined) next.hwPrefInterests = hwPrefInterests
  if (state.helpWantedOverrides.interests.length) {
    next.hwInterests = state.helpWantedOverrides.interests
  }

  for (const moduleId of ALL_DISMISSABLE_MODULE_IDS) {
    const restoreAt = state.dismissed[moduleId]
    if (restoreAt !== undefined) {
      next[`${DISMISS_PREFIX}${moduleId}`] = String(restoreAt)
    }
  }

  if (state.pinned.edit.length) next.pinsHome = state.pinned.edit.join(',')
  if (state.pinned.read.length) next.pinsExplore = state.pinned.read.join(',')
  if (state.pinned.contribute.length) next.pinsContribute = state.pinned.contribute.join(',')

  const hideBorders = boolToFlag(state.hideCardBorders, DEFAULT_CARD_BORDERS_PREFERENCE.hideCardBorders)
  if (hideBorders !== undefined) next.hideBorders = hideBorders

  if (state.useLargeRadius) next.cardRadius = '8'

  const hideTabBar = boolToFlag(state.hideTabBar, DEFAULT_HIDE_TAB_BAR_PREFERENCE.hideTabBar)
  if (hideTabBar !== undefined) next.hideTabBar = hideTabBar

  const moduleMenus = boolToFlag(
    state.useModuleMenuMode,
    DEFAULT_MODULE_MENU_MODE_PREFERENCE.useModuleMenuMode,
  )
  if (moduleMenus !== undefined) next.moduleMenus = moduleMenus

  if (state.bannerDismissed) next.bannerDismissed = '1'

  if (state.mentorAssigned === true) next.mentorAssigned = '1'
  else if (state.mentorAssigned === false) next.mentorAssigned = '0'

  if (state.mentorBannerDismissed) next.mentorBannerDismissed = '1'

  if (state.lists.length) {
    next.list = state.lists.map(serializeListEntry)
  }

  const homeLayoutSerialized = serializeHomeLayoutOverrides(state.mode, state.homeLayout)
  if (homeLayoutSerialized.homeOff) next.homeOff = homeLayoutSerialized.homeOff
  if (homeLayoutSerialized.homeOn) next.homeOn = homeLayoutSerialized.homeOn
  if (homeLayoutSerialized.homeOrder) next.homeOrder = homeLayoutSerialized.homeOrder

  if (state.personalizationReturn) {
    next.personalizationReturn = state.personalizationReturn
  }

  return next
}

export function mergeWikitaLiteQuery(
  current: LocationQuery,
  patch: WikitaLiteUrlStatePatch,
): LocationQueryRaw {
  const parsed = parseWikitaLiteQuery(current)
  const merged: WikitaLiteUrlState = {
    ...parsed,
    ...(patch.view !== undefined
      ? { view: patch.view ?? DEFAULT_WIKITA_LITE_VIEW }
      : {}),
    ...(patch.mode !== undefined && patch.mode !== null ? { mode: patch.mode } : {}),
    ...(patch.onboarded !== undefined && patch.onboarded !== null ? { onboarded: patch.onboarded } : {}),
    ...(patch.screen !== undefined
      ? { screen: patch.screen ?? defaultWikitaLiteUrlState().screen }
      : {}),
    ...(patch.title !== undefined && patch.title !== null ? { title: patch.title } : {}),
    ...(patch.username !== undefined && patch.username !== null ? { username: patch.username } : {}),
    ...(patch.email !== undefined && patch.email !== null ? { email: patch.email } : {}),
    ...(patch.survey !== undefined && patch.survey !== null ? { survey: patch.survey } : {}),
    ...(patch.interests !== undefined && patch.interests !== null
      ? {
          interests: normalizeInterestTitles(patch.interests),
          interestsTouched: true,
        }
      : {}),
    ...(patch.returnTo !== undefined && patch.returnTo !== null ? { returnTo: patch.returnTo } : {}),
    ...(patch.user !== undefined && patch.user !== null ? { user: patch.user } : {}),
    ...(patch.realUser !== undefined && patch.realUser !== null ? { realUser: patch.realUser } : {}),
    ...(patch.theme !== undefined && patch.theme !== null ? { theme: patch.theme } : {}),
    ...(patch.skin !== undefined && patch.skin !== null ? { skin: patch.skin } : {}),
    ...(patch.platform !== undefined && patch.platform !== null ? { platform: patch.platform } : {}),
    ...(patch.lang !== undefined && patch.lang !== null ? { lang: parseContentLang(patch.lang) } : {}),
    ...(patch.uselang !== undefined && patch.uselang !== null ? { uselang: patch.uselang } : {}),
    ...(patch.langs !== undefined && patch.langs !== null ? { langs: patch.langs } : {}),
    ...(patch.displayName !== undefined && patch.displayName !== null
      ? { displayName: patch.displayName }
      : {}),
    ...(patch.saved !== undefined && patch.saved !== null ? { saved: patch.saved } : {}),
    ...(patch.savedTs !== undefined && patch.savedTs !== null ? { savedTs: patch.savedTs } : {}),
    ...(patch.edited !== undefined && patch.edited !== null ? { edited: patch.edited } : {}),
    ...(patch.editedFrom !== undefined && patch.editedFrom !== null
      ? { editedFrom: patch.editedFrom }
      : {}),
    ...(patch.watchlist !== undefined && patch.watchlist !== null ? { watchlist: patch.watchlist } : {}),
    ...(patch.suggestionPreferences !== undefined && patch.suggestionPreferences !== null
      ? { suggestionPreferences: patch.suggestionPreferences }
      : {}),
    ...(patch.helpWantedOverrides !== undefined && patch.helpWantedOverrides !== null
      ? { helpWantedOverrides: patch.helpWantedOverrides }
      : {}),
    ...(patch.dismissed !== undefined && patch.dismissed !== null ? { dismissed: patch.dismissed } : {}),
    ...(patch.pinned !== undefined && patch.pinned !== null ? { pinned: patch.pinned } : {}),
    ...(patch.hideCardBorders !== undefined && patch.hideCardBorders !== null
      ? { hideCardBorders: patch.hideCardBorders }
      : {}),
    ...(patch.useLargeRadius !== undefined && patch.useLargeRadius !== null
      ? { useLargeRadius: patch.useLargeRadius }
      : {}),
    ...(patch.hideTabBar !== undefined && patch.hideTabBar !== null ? { hideTabBar: patch.hideTabBar } : {}),
    ...(patch.useModuleMenuMode !== undefined && patch.useModuleMenuMode !== null
      ? { useModuleMenuMode: patch.useModuleMenuMode }
      : {}),
    ...(patch.bannerDismissed !== undefined && patch.bannerDismissed !== null
      ? { bannerDismissed: patch.bannerDismissed }
      : {}),
    ...(patch.mentorAssigned !== undefined ? { mentorAssigned: patch.mentorAssigned } : {}),
    ...(patch.mentorBannerDismissed !== undefined && patch.mentorBannerDismissed !== null
      ? { mentorBannerDismissed: patch.mentorBannerDismissed }
      : {}),
    ...(patch.lists !== undefined && patch.lists !== null ? { lists: patch.lists } : {}),
    ...(patch.homeLayout !== undefined && patch.homeLayout !== null
      ? { homeLayout: patch.homeLayout }
      : {}),
    ...(patch.personalizationReturn !== undefined
      ? { personalizationReturn: patch.personalizationReturn ?? '' }
      : {}),
  }

  if (patch.mode === undefined || patch.mode === null) {
    const urlMode = parseDashboardMode(firstString(current.mode))
    merged.mode = resolveDashboardMode(urlMode, merged.survey)
  }

  return serializeWikitaLiteState(merged, current)
}

/** Strip wikita-lite state keys from a query, keeping unrelated params. */
export function stripWikitaLiteQuery(query: LocationQuery): LocationQueryRaw {
  const next: LocationQueryRaw = { ...query }
  const keysToRemove = new Set([
    'view',
    'mode',
    'onboarded',
    'screen',
    'title',
    'interestSeed',
    'username',
    'email',
    'survey',
    'interests',
    'returnTo',
    'user',
    'realUser',
    'theme',
    'skin',
    'platform',
    'lang',
    'uselang',
    'langs',
    'displayName',
    'saved',
    'savedTs',
    'edited',
    'editedFrom',
    'watchlist',
    'prefSaved',
    'prefHistory',
    'prefInterests',
    'prefWatchlist',
    'hwDefault',
    'hwPrefSaved',
    'hwPrefHistory',
    'hwPrefInterests',
    'hwInterests',
    'pinsHome',
    'pinsExplore',
    'pinsContribute',
    'hideBorders',
    'cardRadius',
    'hideTabBar',
    'moduleMenus',
    'bannerDismissed',
    'splashDismissed',
    'mentorAssigned',
    'mentorBannerDismissed',
    'list',
    'homeOff',
    'homeOn',
    'homeOrder',
    'configure',
    'personalizationReturn',
  ])

  for (const key of Object.keys(next)) {
    if (keysToRemove.has(key) || key.startsWith(DISMISS_PREFIX)) {
      delete next[key]
    }
  }

  return next
}

export function stateToConfigPatch(state: WikitaLiteUrlState) {
  return {
    theme: state.theme,
    appPlatform: state.platform,
    webSkin: state.skin,
    user: state.user,
    realUsername: state.realUser,
    knownLanguages: state.langs,
    readingList: state.saved,
    readingListSavedAt: backfillReadingListSavedAt(state.saved, state.savedTs),
    editedPages: state.edited,
    watchlist: state.watchlist,
  }
}
