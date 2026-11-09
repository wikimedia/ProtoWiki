import { useRoute, useRouter } from 'vue-router'

import { mergedLocationQuery } from '@/appearance/url-query'

/** Navigate to another wiki prototype route, keeping `?title=` and appearance query params. */
export function useWikiPrototypeNavigation() {
  const route = useRoute()
  const router = useRouter()

  /** `extra`: more query params for the target, e.g. `{ task: 'references' }`. */
  function wikiPrototypeLocation(
    path: string,
    title: string | null | undefined,
    extra: Record<string, string> = {},
  ) {
    const trimmed = title?.trim()
    if (!trimmed?.length) return null
    return {
      path,
      query: mergedLocationQuery(route.query, { ...extra, title: trimmed }),
    }
  }

  function resolveWikiPrototypeUrl(
    path: string,
    title: string | null | undefined,
    extra?: Record<string, string>,
  ): string | null {
    const location = wikiPrototypeLocation(path, title, extra)
    if (!location) return null
    return router.resolve(location).href
  }

  function navigateToWikiPrototype(
    path: string,
    title: string | null | undefined,
    extra?: Record<string, string>,
  ): void {
    const location = wikiPrototypeLocation(path, title, extra)
    if (!location) return
    void router.push(location)
  }

  return { navigateToWikiPrototype, resolveWikiPrototypeUrl }
}
