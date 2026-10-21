import { computed, ref, type ComputedRef, type Ref } from 'vue'

import { normalizeLang, normalizeWikiUsername } from '@/config'
import {
  FetchUserImpactError,
  fetchRealUserEditedPageTitles,
} from '@/prototypes/template-homepage/impact/data/fetchUserImpact'

/**
 * Loads Real-user edited page titles from `usercontribs` only (mock settings field).
 * Full Impact metrics stay on the Impact page (`useRealUserImpact`).
 */
export function useRealUserEditedPages(
  usernameSource: Ref<string> | ComputedRef<string>,
  wikiSource: Ref<string> | ComputedRef<string>,
): {
  editedPageTitles: Ref<string[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
} {
  const editedPageTitles = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let abortController: AbortController | null = null

  async function refresh(): Promise<void> {
    const name = normalizeWikiUsername(usernameSource.value)
    const wiki = normalizeLang(wikiSource.value)
    if (!name.length) {
      error.value = 'Enter a Wikipedia username in the user menu'
      editedPageTitles.value = []
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    const { signal } = abortController

    loading.value = true
    error.value = null

    try {
      editedPageTitles.value = await fetchRealUserEditedPageTitles(name, {
        signal,
        lang: wiki,
      })
    } catch (err) {
      if (err instanceof FetchUserImpactError && err.code === 'aborted') {
        error.value = null
        return
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        error.value = null
        return
      }
      const message =
        err instanceof FetchUserImpactError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load edited pages'
      error.value = message
      editedPageTitles.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    editedPageTitles,
    loading,
    error,
    refresh,
  }
}
