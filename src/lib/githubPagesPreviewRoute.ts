import type { Router } from 'vue-router'

/** Path under `import.meta.env.BASE_URL` (e.g. `/template-chrome`). */
export function githubPagesSubpathAfterBase(baseUrl: string): string | null {
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
export function syncGithubPagesPreviewRoute(router: Router): void {
  const subPath = githubPagesSubpathAfterBase(import.meta.env.BASE_URL)
  if (!subPath) {
    return
  }
  void router.replace(subPath)
}
