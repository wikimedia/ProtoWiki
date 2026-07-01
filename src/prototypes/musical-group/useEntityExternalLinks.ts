import { ref, watch, type Ref } from 'vue'

import { fetchEntityExternalLinks } from './data/fetchEntityExternalLinks'
import {
  getCachedMusicalGroup,
  setCachedMusicalGroupExternalLinks,
} from './data/musicalGroupCache'
import type { WikidataExternalLink } from './data/types'

export function useEntityExternalLinks(qid: Ref<string | null | undefined>) {
  const links = ref<WikidataExternalLink[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let fetchAbort: AbortController | null = null

  async function loadLinks(id: string) {
    fetchAbort?.abort()
    fetchAbort = new AbortController()

    const cached = getCachedMusicalGroup(id)
    if (cached?.externalLinks) {
      links.value = cached.externalLinks
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null
    links.value = []

    try {
      const loaded = await fetchEntityExternalLinks(id, fetchAbort.signal)
      links.value = loaded
      setCachedMusicalGroupExternalLinks(id, loaded)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = 'Could not load links. Try again.'
    } finally {
      loading.value = false
    }
  }

  watch(
    qid,
    (id) => {
      if (!id) {
        fetchAbort?.abort()
        links.value = []
        loading.value = false
        error.value = null
        return
      }
      void loadLinks(id)
    },
    { immediate: true },
  )

  return { links, loading, error }
}
