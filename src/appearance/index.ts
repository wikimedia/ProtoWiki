/**
 * Appearance — global theme, web skin, and app OS preferences.
 *
 * - `config-store` — reactive settings (`protowikiConfig`)
 * - `app-platform` — `data-app-platform` on `<html>`
 * - `url-query` — query-string helpers and navigation preservation
 * - `url-sync` — bidirectional sync between settings and `?theme=` / `?skin=` / `?os=`
 * - `boot` — entry points for `main.ts`
 *
 * Theme / skin rendering lives in `@/theme`; persistence schema in `@/config`.
 */

export { protowikiConfig } from './config-store'

export {
  applyAppPlatform,
  applyAppPlatformPreference,
  globalAppPlatform,
  initAppPlatform,
} from './app-platform'

export {
  mergedLocationQuery,
  preservedQueryFromLocationQuery,
  preservedQueryMissingFromRoute,
  PRESERVED_URL_QUERY_PARAMS,
  type PreservedUrlQueryParam,
} from './url-query'

export {
  onAppPlatformSettingChanged,
  onThemeSettingChanged,
  onWebSkinSettingChanged,
  setupAppearanceUrlSync,
  syncAppearanceFromBootUrl,
  type UrlSkinParam,
  type UrlThemeParam,
} from './url-sync'

export { bootAppearance, wireAppearanceRouter } from './boot'
