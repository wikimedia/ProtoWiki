/**
 * Restore the real path after the root 404.html redirect used on GitHub Pages.
 * Logic matches https://github.com/rafgraph/spa-github-pages (index.html script).
 * Also runs from main.ts; index.html inlines the same script before the Vite bundle.
 */
export function restoreGithubPagesSpaUrl(): void {
  const l = window.location
  const { search, pathname, hash } = l

  if (search.length > 1 && search[1] === '/') {
    const decoded = search
      .slice(1)
      .split('&')
      .map((s) => s.replace(/~and~/g, '&'))
      .join('?')
    const basePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
    l.replaceState(null, '', basePath + decoded + hash)
    return
  }

  // Some Pages loads drop the slash after `?` (?route instead of ?/route).
  if (search.length > 1 && search[1] !== '/' && !search.includes('=')) {
    const basePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
    l.replaceState(null, '', `${basePath}/${search.slice(1)}${hash}`)
  }
}

/** Path under import.meta.env.BASE_URL after restore (e.g. `/template-chrome`). */
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
