import type { LocationQuery, RouteLocationNormalized, Router } from 'vue-router'

/** Appearance query params carried across navigations when already present. */
export const PRESERVED_URL_QUERY_PARAMS = ['theme', 'skin', 'os'] as const

export type PreservedUrlQueryParam = (typeof PRESERVED_URL_QUERY_PARAMS)[number]

let router: Router | null = null
let syncingToUrl = false

export function registerAppearanceRouter(instance: Router): void {
  router = instance
}

export function isSyncingToUrl(): boolean {
  return syncingToUrl
}

export function isAppPrototypeRoute(): boolean {
  return router?.currentRoute.value.meta.platform === 'app'
}

export function preservedQueryFromLocationQuery(
  query: LocationQuery,
): Record<string, string> {
  const preserved: Record<string, string> = {}
  for (const key of PRESERVED_URL_QUERY_PARAMS) {
    const value = query[key]
    if (typeof value === 'string') preserved[key] = value
  }
  return preserved
}

export function readPreservedUrlQuery(search = window.location.search): Record<string, string> {
  const params = new URLSearchParams(search)
  const query: Record<string, string> = {}
  for (const key of PRESERVED_URL_QUERY_PARAMS) {
    const value = params.get(key)
    if (value !== null) query[key] = value
  }
  return query
}

/**
 * Build a query object for `router.replace` / `router.resolve` that keeps every
 * param in the browser URL, merges in the active route query, then applies
 * updates.
 */
export function mergedLocationQuery(
  routeQuery: LocationQuery,
  updates: Record<string, string> = {},
): Record<string, string | string[]> {
  const params = new URLSearchParams(window.location.search)

  for (const [key, value] of Object.entries(routeQuery)) {
    if (value === null || value === undefined) continue
    params.delete(key)
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    } else {
      params.set(key, value)
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    params.set(key, value)
  }

  const query: Record<string, string | string[]> = {}
  params.forEach((value, key) => {
    if (query[key] === undefined) {
      query[key] = value
    } else if (Array.isArray(query[key])) {
      query[key].push(value)
    } else {
      query[key] = [query[key], value]
    }
  })

  return query
}

/** Carry preserved URL params from the previous route when the destination omits them. */
export function preservedQueryMissingFromRoute(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): Record<string, string> {
  const preserved = preservedQueryFromLocationQuery(from.query)
  const missing: Record<string, string> = {}
  for (const [key, value] of Object.entries(preserved)) {
    if (to.query[key] === undefined) missing[key] = value
  }
  return missing
}

function replaceRouteQuery(
  to: RouteLocationNormalized,
  query: Record<string, string | string[]>,
): Promise<void | import('vue-router').NavigationFailure | undefined> {
  if (!router) return Promise.resolve()

  syncingToUrl = true
  return router
    .replace({
      path: to.path,
      query,
      hash: to.hash || window.location.hash,
    })
    .finally(() => {
      syncingToUrl = false
    })
}

/** Update one query param on the current route without dropping the rest of the URL. */
export function syncUrlQueryParam(key: string, value: string): void {
  if (!router) return

  const route = router.currentRoute.value
  if (route.query[key] === value) return

  void replaceRouteQuery(route, mergedLocationQuery(route.query, { [key]: value }))
}

/** Remove one query param from the current route without dropping the rest. */
export function removeUrlQueryParam(key: string): void {
  if (!router) return

  const route = router.currentRoute.value
  if (route.query[key] === undefined) return

  const params = new URLSearchParams(window.location.search)
  params.delete(key)

  const query: Record<string, string | string[]> = {}
  params.forEach((value, paramKey) => {
    if (query[paramKey] === undefined) {
      query[paramKey] = value
    } else if (Array.isArray(query[paramKey])) {
      query[paramKey].push(value)
    } else {
      query[paramKey] = [query[paramKey], value]
    }
  })

  for (const [paramKey, value] of Object.entries(route.query)) {
    if (value === null || value === undefined || paramKey === key) continue
    if (query[paramKey] !== undefined) continue
    if (Array.isArray(value)) query[paramKey] = [...value]
    else query[paramKey] = value
  }

  void replaceRouteQuery(route, query)
}

export function replaceRouteQueryUpdates(
  to: RouteLocationNormalized,
  updates: Record<string, string>,
): Promise<void | import('vue-router').NavigationFailure | undefined> {
  return replaceRouteQuery(to, mergedLocationQuery(to.query, updates))
}

/** Keep `?theme=`, `?skin=`, and `?os=` when navigating between routes. */
export function preserveAppearanceQueryOnNavigation(instance: Router): void {
  instance.beforeEach((to, from) => {
    const missing = preservedQueryMissingFromRoute(to, from)
    if (Object.keys(missing).length === 0) return true
    return {
      path: to.path,
      query: { ...to.query, ...missing },
      hash: to.hash,
    }
  })
}
