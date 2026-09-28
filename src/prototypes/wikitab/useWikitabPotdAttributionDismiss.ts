import { computed, onMounted, onUnmounted, ref } from 'vue'

import { utcDayKey } from './data/feedCache'
import {
  loadWikitabConfig,
  parseWikitabConfigJson,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'

export function useWikitabPotdAttributionDismiss() {
  let lastAppliedRevision = 0

  function trackRevision(configRevision: number): void {
    lastAppliedRevision = configRevision
  }

  const initialConfig = loadWikitabConfig()
  trackRevision(initialConfig.configRevision)

  const expandedDay = ref<string | null>(initialConfig.potdAttributionExpandedDay)

  const isDismissed = computed(() => expandedDay.value !== utcDayKey())

  function dismiss(): void {
    expandedDay.value = null
    trackRevision(patchWikitabConfig({ potdAttributionExpandedDay: null }).configRevision)
  }

  function open(): void {
    const day = utcDayKey()
    expandedDay.value = day
    trackRevision(patchWikitabConfig({ potdAttributionExpandedDay: day }).configRevision)
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY || !event.newValue) return

    let incoming
    try {
      incoming = parseWikitabConfigJson(event.newValue)
    } catch {
      return
    }

    if (incoming.configRevision <= lastAppliedRevision) return

    lastAppliedRevision = incoming.configRevision
    expandedDay.value = incoming.potdAttributionExpandedDay
  }

  onMounted(() => {
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage)
  })

  return { isDismissed, dismiss, open }
}
