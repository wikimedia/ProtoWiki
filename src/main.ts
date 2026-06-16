import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from './App.vue'

import '@wikimedia/codex/dist/codex.style.css'
import './styles/global.css'
import './styles/wiki-skins/vector-2022.css'
import './styles/wiki-skins/minerva.css'
import './styles/wiki-skins/mobile-wiki-overrides.css'
import './styles/dark.css'

import { initTheming } from './theme'

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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

syncGithubPagesPreviewRoute(router)

if (import.meta.hot) {
  handleHotUpdate(router)
}

createApp(App).use(router).mount('#app')
