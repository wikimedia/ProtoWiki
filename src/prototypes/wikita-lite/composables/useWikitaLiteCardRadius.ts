import { computed, ref, watch } from 'vue'

import {
  loadCardRadiusPreference,
  saveCardRadiusPreference,
} from '../data/cardRadius'

const useLargeRadius = ref(loadCardRadiusPreference().useLargeRadius)

watch(useLargeRadius, (value) => {
  saveCardRadiusPreference({ useLargeRadius: value })
})

export function useWikitaLiteCardRadius() {
  const cardRadiusStyle = computed(() => ({
    '--wikita-lite-card-radius': useLargeRadius.value
      ? 'var(--spacing-25)'
      : 'var(--border-radius-base)',
  }))

  function toggleLargeRadius(): void {
    useLargeRadius.value = !useLargeRadius.value
  }

  return {
    useLargeRadius,
    cardRadiusStyle,
    toggleLargeRadius,
  }
}

/** Module-level singleton so shell and menu share the same reactive state. */
let singleton: ReturnType<typeof useWikitaLiteCardRadius> | null = null

export function useWikitaLiteCardRadiusSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteCardRadius()
  }
  return singleton
}
