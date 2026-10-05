import { inject, provide, type InjectionKey } from 'vue'

import type { SearchSubmitPayload } from '@/components/Search.vue'

export interface ChromeSearchHandlers {
  onSelect?: (title: string) => void
  onSubmit?: (payload: SearchSubmitPayload) => void
}

const CHROME_SEARCH_HANDLERS: InjectionKey<ChromeSearchHandlers> = Symbol('protowiki-chrome-search')

/** Opt in to header search actions from a prototype page wrapped in `ChromeWrapper`. */
export function provideChromeSearchHandlers(handlers: ChromeSearchHandlers): void {
  provide(CHROME_SEARCH_HANDLERS, handlers)
}

/** Read search handlers provided by the current prototype page, if any. */
export function useChromeSearchHandlers(): ChromeSearchHandlers | null {
  return inject(CHROME_SEARCH_HANDLERS, null)
}
