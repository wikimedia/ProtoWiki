import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { preservedQueryFromLocationQuery } from '@/appearance/url-query'

/** English Wikipedia main page title (`ArticleWrapper` applies Main Page header chrome). */
export const WIKIPEDIA_MAIN_PAGE_TITLE = 'Main Page'

/** Gallery route for the Main Page template — canonical URL has no **`?title=`**. */
export const MAIN_PAGE_TEMPLATE_PATH = '/template-main-page'

/** Router **`to`** for the Wikipedia wordmark — the Main Page template, appearance query only. */
export function useWordmarkMainPageLink() {
  const route = useRoute()

  return computed(() => ({
    path: MAIN_PAGE_TEMPLATE_PATH,
    query: preservedQueryFromLocationQuery(route.query),
  }))
}
