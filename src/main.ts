import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from './App.vue'

// Both Codex builds are bundled; vite.config.ts scopes each to its `<html dir>`
// (zero specificity), so LTR pages get exactly the LTR rules they always had.
import '@wikimedia/codex/dist/codex.style.css'
import '@wikimedia/codex/dist/codex.style-rtl.css'
import './styles/global.css'
import './styles/menu-content-width.css'
import './styles/wiki-skins/vector-2022.css'
import './styles/wiki-skins/minerva.css'
// arwiki snapshots (`npm run snapshot:wiki-skins -- --rtl`), scoped to `<html dir="rtl">`.
import './styles/wiki-skins/vector-2022.rtl.css'
import './styles/wiki-skins/minerva.rtl.css'
import './styles/wiki-skins/mobile-wiki-overrides.css'
import './styles/dark.css'

import { initTheming } from './theme'
import { initAppPlatform } from './app-platform'
import { loadConfig } from './config'
import { codexI18n } from './i18n'
import { applyDocumentDirection } from './i18n/direction'

import '@/composables/useConfig'

/** Path under `import.meta.env.BASE_URL` (e.g. `/template-chrome`). */
function githubPagesSubpathAfterBase(baseUrl: string): string | null {
  const basePrefix = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  let subPath = window.location.pathname
  if (basePrefix && subPath.startsWith(basePrefix)) {
    subPath = subPath.slice(basePrefix.length)
  }
  if (!subPath || subPath === '/') {
    return null
  }
  return subPath.startsWith('/') ? subPath : `/${subPath}`
}

/**
 * After gh-pages-restore.js updates the URL, ensure Vue Router matches the deep
 * path (replaceState alone is not always enough on first paint).
 */
function syncGithubPagesPreviewRoute(router: ReturnType<typeof createRouter>): void {
  const subPath = githubPagesSubpathAfterBase(import.meta.env.BASE_URL)
  if (!subPath) {
    return
  }
  void router.replace(subPath)
}

initTheming()
initAppPlatform(loadConfig().appPlatform)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/** PR previews replace hashed lazy chunks on each push; recover from a cached entry bundle. */
const CHUNK_RELOAD_KEY = 'protowiki-chunk-reload'

function isStaleLazyChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

router.onError((error, to) => {
  if (!isStaleLazyChunkError(error)) {
    throw error
  }

  const target = router.resolve(to).href
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === target) {
    throw error
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, target)
  window.location.assign(target)
})

router.afterEach(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  // `?uselang=` / `?lang=` (see `@/i18n`).
  applyDocumentDirection()
})

syncGithubPagesPreviewRoute(router)

if (import.meta.hot) {
  handleHotUpdate(router)
}

// Before mount: CdxIcon reads the direction once, when it mounts.
applyDocumentDirection()

createApp(App).use(router).provide('CdxI18nFunction', codexI18n).mount('#app')
