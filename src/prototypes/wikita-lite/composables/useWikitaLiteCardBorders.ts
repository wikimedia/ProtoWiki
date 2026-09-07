import { ref, watch } from 'vue'

import {
  loadCardBordersPreference,
  saveCardBordersPreference,
} from '../data/cardBorders'

const hideCardBorders = ref(loadCardBordersPreference().hideCardBorders)

watch(hideCardBorders, (value) => {
  saveCardBordersPreference({ hideCardBorders: value })
})

export function useWikitaLiteCardBorders() {
  function toggleHideCardBorders(): void {
    hideCardBorders.value = !hideCardBorders.value
  }

  return {
    hideCardBorders,
    toggleHideCardBorders,
  }
}

/** Module-level singleton so shell and menu share the same reactive state. */
let singleton: ReturnType<typeof useWikitaLiteCardBorders> | null = null

export function useWikitaLiteCardBordersSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteCardBorders()
  }
  return singleton
}
