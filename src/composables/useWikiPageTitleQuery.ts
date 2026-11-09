import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { LocationQuery } from 'vue-router'

import { syncUrlQueryParam } from '@/appearance/url-query'

/** Parse `?title=` from a route query object. */
export function parseWikiPageTitleQuery(query: LocationQuery): string | undefined {
  const value = query.title
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length)
    return first?.trim()
  }
  return undefined
}

/** Read and update the shareable wiki page title in `?title=`. */
export function useWikiPageTitleQuery() {
  const route = useRoute()

  const titleFromQuery = computed(() => parseWikiPageTitleQuery(route.query))

  function setWikiPageTitle(title: string | null | undefined): void {
    const trimmed = title?.trim()
    if (!trimmed?.length) return
    syncUrlQueryParam('title', trimmed)
  }

  return { titleFromQuery, setWikiPageTitle }
}
