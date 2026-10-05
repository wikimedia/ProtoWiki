import type { Router } from 'vue-router'

import { initAppPlatform } from './app-platform'
import { protowikiConfig } from './config-store'
import { preserveAppearanceQueryOnNavigation, registerAppearanceRouter } from './url-query'
import { setupAppearanceUrlSync, syncAppearanceFromBootUrl } from './url-sync'
import { initTheming } from '@/theme'

/** Read URL appearance params into settings, then apply global theme / skin / app OS. */
export function bootAppearance(): void {
  syncAppearanceFromBootUrl()
  initTheming()
  initAppPlatform(protowikiConfig.value.appPlatform)
}

/** Wire appearance URL ↔ settings sync onto the app router. */
export function wireAppearanceRouter(router: Router): void {
  registerAppearanceRouter(router)
  preserveAppearanceQueryOnNavigation(router)
  setupAppearanceUrlSync(router)
}
