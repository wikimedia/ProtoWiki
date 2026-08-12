import { ref, watch } from 'vue'

import {
  loadModuleMenuModePreference,
  saveModuleMenuModePreference,
} from '../data/moduleMenuMode'

const useModuleMenuMode = ref(loadModuleMenuModePreference().useModuleMenuMode)

watch(useModuleMenuMode, (value) => {
  saveModuleMenuModePreference({ useModuleMenuMode: value })
})

export function useWikitaLiteModuleMenuMode() {
  function toggleModuleMenuMode(): void {
    useModuleMenuMode.value = !useModuleMenuMode.value
  }

  return {
    useModuleMenuMode,
    toggleModuleMenuMode,
  }
}

/** Module-level singleton so shell and menu share the same reactive state. */
let singleton: ReturnType<typeof useWikitaLiteModuleMenuMode> | null = null

export function useWikitaLiteModuleMenuModeSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteModuleMenuMode()
  }
  return singleton
}
