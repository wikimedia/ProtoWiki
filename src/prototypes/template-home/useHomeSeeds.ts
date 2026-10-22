import { computed } from 'vue'

import { useConfig } from '@/composables/useConfig'

/** Lowercase compare key (underscores → spaces, trim), for deduplicating titles. */
export function titleKey(title: string): string {
  return title.replace(/_/g, ' ').trim().toLowerCase()
}

/**
 * Pages the personal modules grow from: the Mock user's saved pages, edited
 * pages and watchlist, deduplicated, in that order. `personal`: there are any.
 */
export function useHomeSeeds() {
  const { currentUserPageLists } = useConfig()

  const seeds = computed(() => {
    const { readingList, editedPages, watchlist } = currentUserPageLists.value
    const seen = new Set<string>()
    return [...readingList, ...editedPages, ...watchlist].filter((title) => {
      const key = titleKey(title)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  })

  const personal = computed(() => seeds.value.length > 0)

  return { seeds, personal }
}
