import type { RouteLocationNormalized, Router } from 'vue-router'

import { applyAppPlatformPreference } from './app-platform'
import { protowikiConfig } from './config-store'
import {
  isAppPrototypeRoute,
  isSyncingToUrl,
  removeUrlQueryParam,
  replaceRouteQueryUpdates,
  syncUrlQueryParam,
} from './url-query'
import {
  isConfigAppPlatform,
  isConfigWebSkin,
  type ConfigAppPlatform,
  type ConfigTheme,
  type ConfigWebSkin,
} from '@/config'
import { applyThemePreference, applyWebSkinPreference } from '@/theme'

/** Valid `?theme=` query values (`auto` maps to the **Auto** / `system` setting). */
export type UrlThemeParam = 'light' | 'dark' | 'auto'

/** Valid `?skin=` query values — same vocabulary as **Web skin** settings. */
export type UrlSkinParam = ConfigWebSkin

let syncingFromUrl = false

function queryParamIsPresent(key: string): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has(key)
}

function readQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

function withSyncFromUrl<T>(fn: () => T): T {
  syncingFromUrl = true
  try {
    return fn()
  } finally {
    syncingFromUrl = false
  }
}

// --- Theme (`?theme=`) — optional param, same rules as skin -----------------

export function isUrlThemeParam(value: unknown): value is UrlThemeParam {
  return value === 'light' || value === 'dark' || value === 'auto'
}

function configThemeToUrlParam(preference: ConfigTheme): UrlThemeParam {
  if (preference === 'system') return 'auto'
  return preference
}

function urlParamToConfigTheme(param: UrlThemeParam): ConfigTheme {
  if (param === 'auto') return 'system'
  return param
}

function setThemeFromUrlParam(urlTheme: UrlThemeParam): void {
  const preference = urlParamToConfigTheme(urlTheme)
  if (syncingFromUrl || protowikiConfig.value.theme === preference) return

  withSyncFromUrl(() => {
    protowikiConfig.value = { ...protowikiConfig.value, theme: preference }
    applyThemePreference(preference)
  })
}

export function onThemeSettingChanged(preference: ConfigTheme): void {
  if (syncingFromUrl) return

  applyThemePreference(preference)

  if (!queryParamIsPresent('theme')) return

  syncUrlQueryParam('theme', configThemeToUrlParam(preference))
}

function syncThemeFromUrlOnRoute(to: RouteLocationNormalized): void {
  const urlTheme = typeof to.query.theme === 'string' ? to.query.theme : null
  if (!isUrlThemeParam(urlTheme)) return

  const preference = urlParamToConfigTheme(urlTheme)
  if (protowikiConfig.value.theme !== preference) {
    setThemeFromUrlParam(urlTheme)
  }
}

// --- Web skin (`?skin=`) — optional param -----------------------------------

export function isUrlSkinParam(value: unknown): value is UrlSkinParam {
  return isConfigWebSkin(value)
}

function setWebSkinFromUrlParam(urlSkin: UrlSkinParam): void {
  if (syncingFromUrl || protowikiConfig.value.webSkin === urlSkin) return

  withSyncFromUrl(() => {
    protowikiConfig.value = { ...protowikiConfig.value, webSkin: urlSkin }
    applyWebSkinPreference(urlSkin)
  })
}

export function onWebSkinSettingChanged(preference: ConfigWebSkin): void {
  if (syncingFromUrl) return

  applyWebSkinPreference(preference)

  if (!queryParamIsPresent('skin')) return

  syncUrlQueryParam('skin', preference)
}

function syncWebSkinFromUrlOnRoute(to: RouteLocationNormalized): void {
  const urlSkin = typeof to.query.skin === 'string' ? to.query.skin : null
  if (!isUrlSkinParam(urlSkin)) return

  if (protowikiConfig.value.webSkin !== urlSkin) {
    setWebSkinFromUrlParam(urlSkin)
  }
}

// --- App OS (`?os=`) — pinned on app routes; optional elsewhere -------------

function setAppPlatformFromUrl(urlOs: ConfigAppPlatform): void {
  if (syncingFromUrl || protowikiConfig.value.appPlatform === urlOs) return

  withSyncFromUrl(() => {
    protowikiConfig.value = { ...protowikiConfig.value, appPlatform: urlOs }
    applyAppPlatformPreference(urlOs)
  })
}

export function onAppPlatformSettingChanged(platform: ConfigAppPlatform): void {
  if (syncingFromUrl) return

  applyAppPlatformPreference(platform)

  if (!isAppPrototypeRoute() && !queryParamIsPresent('os')) return

  if (platform === 'auto') {
    removeUrlQueryParam('os')
    return
  }

  syncUrlQueryParam('os', platform)
}

function syncAppOsOnRoute(to: RouteLocationNormalized): void {
  const urlOs = typeof to.query.os === 'string' ? to.query.os : null
  const settingOs = protowikiConfig.value.appPlatform
  const isAppRoute = to.meta.platform === 'app'

  if (!isAppRoute) {
    if (urlOs && isConfigAppPlatform(urlOs) && urlOs !== settingOs) {
      setAppPlatformFromUrl(urlOs)
    }
    return
  }

  if (urlOs && isConfigAppPlatform(urlOs)) {
    if (urlOs !== settingOs) {
      setAppPlatformFromUrl(urlOs)
    }
    return
  }

  // Pin missing/invalid os only for explicit ios/android — never auto-add ?os=auto
  if (settingOs !== 'auto') {
    void replaceRouteQueryUpdates(to, { os: settingOs })
  }
}

// --- Boot + router wiring ---------------------------------------------------

function syncOptionalParamFromBoot(
  key: string,
  isValid: (value: unknown) => boolean,
  applyFromUrl: (value: string) => void,
): void {
  const value = readQueryParam(key)
  if (!isValid(value)) return
  applyFromUrl(value as string)
}

/** Apply valid appearance query params from the URL into settings before mount. */
export function syncAppearanceFromBootUrl(): void {
  if (typeof window === 'undefined') return

  syncOptionalParamFromBoot('theme', isUrlThemeParam, (value) => {
    setThemeFromUrlParam(value as UrlThemeParam)
  })

  syncOptionalParamFromBoot('skin', isUrlSkinParam, (value) => {
    setWebSkinFromUrlParam(value as UrlSkinParam)
  })

  syncOptionalParamFromBoot('os', isConfigAppPlatform, (value) => {
    setAppPlatformFromUrl(value as ConfigAppPlatform)
  })
}

/** Keep appearance URL params and settings aligned after each navigation. */
export function setupAppearanceUrlSync(instance: Router): void {
  instance.afterEach((to) => {
    if (syncingFromUrl || isSyncingToUrl()) return

    syncThemeFromUrlOnRoute(to)
    syncWebSkinFromUrlOnRoute(to)
    syncAppOsOnRoute(to)
  })
}
