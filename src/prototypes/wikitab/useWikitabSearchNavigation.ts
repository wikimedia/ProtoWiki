import { nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { bumpWikitabSearchMountKey } from './useWikitabSearchMount'

export function useWikitabSearchNavigation() {
  const route = useRoute()
  const router = useRouter()

  function navigateToSearch(searchTerm: string): void {
    const trimmed = searchTerm.trim()
    const nextQuery = { ...route.query }

    if (!trimmed.length) {
      delete nextQuery.search
      delete nextQuery.tab
    } else {
      nextQuery.search = trimmed
    }

    void router.push({ path: route.path, query: nextQuery }).then(() => {
      // Remount after the URL updates so initialQuery matches the submission.
      void nextTick(() => bumpWikitabSearchMountKey())
    })
  }

  return { navigateToSearch }
}
