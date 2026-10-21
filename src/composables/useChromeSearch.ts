import { inject, provide, type InjectionKey } from 'vue'
import { useRoute } from 'vue-router'

import type { SearchSubmitPayload } from '@/components/Search.vue'
import { useWikiPageTitleQuery } from '@/composables/useWikiPageTitleQuery'
import { useWikiPrototypeNavigation } from '@/composables/useWikiPrototypeNavigation'
import {
  ARTICLE_TEMPLATE_PATH,
  VISUAL_EDITOR_TEMPLATE_PATH,
} from '@/composables/webTemplatePaths'

export interface ChromeSearchHandlers {
  onSelect?: (title: string) => void
  onSubmit?: (payload: SearchSubmitPayload) => void
}

const CHROME_SEARCH_HANDLERS: InjectionKey<ChromeSearchHandlers> = Symbol('protowiki-chrome-search')

/** Routes that load article content from `?title=` on the same path. */
const WIKI_TITLE_ON_ROUTE_PATHS = new Set<string>([
  ARTICLE_TEMPLATE_PATH,
  VISUAL_EDITOR_TEMPLATE_PATH,
])

function useDefaultChromeSearchHandlers(): ChromeSearchHandlers {
  const route = useRoute()
  const { setWikiPageTitle } = useWikiPageTitleQuery()
  const { navigateToWikiPrototype } = useWikiPrototypeNavigation()

  function openTitle(title: string | null | undefined): void {
    const trimmed = title?.trim()
    if (!trimmed?.length) return
    if (WIKI_TITLE_ON_ROUTE_PATHS.has(route.path)) {
      setWikiPageTitle(trimmed)
      return
    }
    navigateToWikiPrototype(ARTICLE_TEMPLATE_PATH, trimmed)
  }

  return {
    onSelect(title) {
      openTitle(title)
    },
    onSubmit({ title }) {
      openTitle(title)
    },
  }
}

/** Override header search actions from a prototype page wrapped in `ChromeWrapper`. */
export function provideChromeSearchHandlers(handlers: ChromeSearchHandlers): void {
  provide(CHROME_SEARCH_HANDLERS, handlers)
}

/**
 * Search handlers for chrome (desktop inline + mobile overlay).
 * Defaults: update `?title=` on article / VE templates; otherwise open the article template.
 */
export function useChromeSearchHandlers(): ChromeSearchHandlers {
  return inject(CHROME_SEARCH_HANDLERS, useDefaultChromeSearchHandlers())
}
