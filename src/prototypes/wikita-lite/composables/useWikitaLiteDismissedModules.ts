import { computed, ref, watch } from 'vue'

import { type WikitaLiteModuleId } from '../data/homeModuleIds'
import {
  loadDismissedModules,
  nextLocalRestoreAt,
  pruneExpiredDismissals,
  saveDismissedModules,
  type DismissedModules,
} from '../data/moduleDismissals'
import { moduleTitleFor } from '../routes'
import { useWikitaLitePinnedModulesSingleton } from './useWikitaLitePinnedModules'

export interface DismissedModuleEntry {
  moduleId: WikitaLiteModuleId
  title: string
  restoreAt: number
}

const dismissedModules = ref<DismissedModules>(loadDismissedModules())

let restoreTimer: ReturnType<typeof setTimeout> | null = null

function clearRestoreTimer(): void {
  if (restoreTimer !== null) {
    clearTimeout(restoreTimer)
    restoreTimer = null
  }
}

function nearestRestoreAt(state: DismissedModules, now = Date.now()): number | null {
  let nearest: number | null = null

  for (const restoreAt of Object.values(state)) {
    if (typeof restoreAt !== 'number' || restoreAt <= now) continue
    if (nearest === null || restoreAt < nearest) {
      nearest = restoreAt
    }
  }

  return nearest
}

function scheduleRestoreTimer(): void {
  clearRestoreTimer()

  if (typeof window === 'undefined') return

  const nextAt = nearestRestoreAt(dismissedModules.value)
  if (nextAt === null) return

  const delay = Math.max(0, nextAt - Date.now())
  restoreTimer = setTimeout(() => {
    dismissedModules.value = pruneExpiredDismissals(dismissedModules.value)
    scheduleRestoreTimer()
  }, delay)
}

function onVisibilityChange(): void {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
  dismissedModules.value = pruneExpiredDismissals(dismissedModules.value)
  scheduleRestoreTimer()
}

if (typeof window !== 'undefined') {
  dismissedModules.value = pruneExpiredDismissals(dismissedModules.value)
  scheduleRestoreTimer()
  document.addEventListener('visibilitychange', onVisibilityChange)
}

watch(
  dismissedModules,
  (value) => {
    saveDismissedModules(value)
    scheduleRestoreTimer()
  },
  { deep: true },
)

export function useWikitaLiteDismissedModules() {
  const { unpinFromAllTabs } = useWikitaLitePinnedModulesSingleton()

  function isDismissed(moduleId: WikitaLiteModuleId): boolean {
    const restoreAt = dismissedModules.value[moduleId]
    if (restoreAt === undefined) return false
    return Date.now() < restoreAt
  }

  function dismiss(moduleId: WikitaLiteModuleId): void {
    unpinFromAllTabs(moduleId)

    dismissedModules.value = {
      ...dismissedModules.value,
      [moduleId]: nextLocalRestoreAt(),
    }
  }

  function restore(moduleId: WikitaLiteModuleId): void {
    if (!(moduleId in dismissedModules.value)) return

    const { [moduleId]: _removed, ...rest } = dismissedModules.value
    dismissedModules.value = rest
  }

  const dismissedEntries = computed((): DismissedModuleEntry[] => {
    const entries: DismissedModuleEntry[] = []
    const now = Date.now()

    for (const [moduleId, restoreAt] of Object.entries(dismissedModules.value)) {
      if (typeof restoreAt !== 'number' || now >= restoreAt) continue
      entries.push({
        moduleId: moduleId as WikitaLiteModuleId,
        title: moduleTitleFor('edit', moduleId as WikitaLiteModuleId),
        restoreAt,
      })
    }

    return entries.sort((a, b) => a.title.localeCompare(b.title))
  })

  return {
    dismissedModules,
    isDismissed,
    dismiss,
    restore,
    dismissedEntries,
  }
}

/** Module-level singleton so modules share the same reactive dismiss state. */
let singleton: ReturnType<typeof useWikitaLiteDismissedModules> | null = null

export function useWikitaLiteDismissedModulesSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteDismissedModules()
  }
  return singleton
}
