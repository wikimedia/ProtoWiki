import type { ComputedRef } from 'vue'
import { computed } from 'vue'

import { SUGGESTED_EDITS_PAGE } from './dashpage-fixtures'

export function useHomepageSuggestedEdits(): {
  suggestedEditsLinkTo: ComputedRef<typeof SUGGESTED_EDITS_PAGE>
} {
  const suggestedEditsLinkTo = computed(() => SUGGESTED_EDITS_PAGE)

  return { suggestedEditsLinkTo }
}
