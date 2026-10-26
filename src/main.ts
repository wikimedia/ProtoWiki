import { createApp } from 'vue'
import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from './App.vue'

import '@wikimedia/codex/dist/codex.style.css'
import './styles/global.css'
import './styles/wiki-skins/vector-2022.css'
import './styles/wiki-skins/minerva.css'
import './styles/wiki-skins/mobile-wiki-overrides.css'
import './styles/dark.css'

import { bootAppearance, mergedLocationQuery, wireAppearanceRouter } from '@/appearance'

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
  void router.replace({
    path: subPath,
    query: mergedLocationQuery(router.currentRoute.value.query),
    hash: window.location.hash,
  })
}

bootAppearance()

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

wireAppearanceRouter(router)
syncGithubPagesPreviewRoute(router)

const DEFAULT_FAVICON = `${import.meta.env.BASE_URL}images/ProtoWiki.svg`

function resolveFaviconHref(route: RouteLocationNormalizedLoaded): string {
  const favicon = route.meta.favicon
  if (typeof favicon === 'string' && favicon.trim()) {
    const path = favicon.trim().replace(/^\//, '')
    return `${import.meta.env.BASE_URL}${path}`
  }
  return DEFAULT_FAVICON
}

function applyDocumentTitle(route: RouteLocationNormalizedLoaded) {
  const title = route.meta.title
  document.title =
    typeof title === 'string' && title.trim() ? title.trim() : 'ProtoWiki'
}

function applyDocumentFavicon(route: RouteLocationNormalizedLoaded) {
  const href = resolveFaviconHref(route)
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    document.head.appendChild(link)
  }
  if (link.href !== href) {
    link.href = href
  }
}

function applyDocumentMeta(route: RouteLocationNormalizedLoaded) {
  applyDocumentTitle(route)
  applyDocumentFavicon(route)
}

router.afterEach((to) => {
  applyDocumentMeta(to)
})
applyDocumentMeta(router.currentRoute.value)

if (import.meta.hot) {
  handleHotUpdate(router)
}

createApp(App).use(router).mount('#app')
