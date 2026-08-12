import { ref, watch } from 'vue'

import { hasSuggestionSeeds } from '../../musical-group/data/getSuggestionSeeds'
import { listInterests as listGlobalInterests, normalizeInterestTitles } from '../../musical-group/data/interests'
import type { SuggestionPreferences } from '../../musical-group/data/suggestionPreferences'
import type { HomeSavedItem } from '../../musical-group/data/types'
import {
  DEFAULT_MODULE_SUGGESTION_CONFIG,
  loadModuleSuggestionConfig,
  loadModuleSuggestionPreferences,
  saveModuleSuggestionPreferences,
  type ModuleSuggestionConfig,
  type ModuleSuggestionPreferencesMap,
} from '../data/moduleSuggestionPreferences'
import type { WikitaLiteModuleId } from '../data/homeModuleIds'
import { useWikitaLiteSuggestionPreferencesSingleton } from './useWikitaLiteSuggestionPreferences'

const moduleConfigs = ref<ModuleSuggestionPreferencesMap>(loadModuleSuggestionPreferences())
const modulePreferencesVersion = ref(0)

let configsInitialized = false

watch(
  moduleConfigs,
  (value) => {
    saveModuleSuggestionPreferences(value)
    if (!configsInitialized) {
      configsInitialized = true
      return
    }
    modulePreferencesVersion.value += 1
  },
  { deep: true },
)

export function useWikitaLiteModuleSuggestionPreferences() {
  const { preferences: globalPreferences } = useWikitaLiteSuggestionPreferencesSingleton()

  function getModuleConfig(moduleId: WikitaLiteModuleId): ModuleSuggestionConfig {
    return moduleConfigs.value[moduleId] ?? loadModuleSuggestionConfig(moduleId)
  }

  function setModuleConfig(moduleId: WikitaLiteModuleId, config: ModuleSuggestionConfig): void {
    moduleConfigs.value = {
      ...moduleConfigs.value,
      [moduleId]: {
        useDefaultSettings: config.useDefaultSettings,
        preferences: { ...config.preferences },
        interests: [...config.interests],
      },
    }
  }

  function listModuleInterests(moduleId: WikitaLiteModuleId): string[] {
    return [...getModuleConfig(moduleId).interests]
  }

  function commitModuleInterests(moduleId: WikitaLiteModuleId, titles: string[]): void {
    const config = getModuleConfig(moduleId)
    setModuleConfig(moduleId, {
      ...config,
      interests: normalizeInterestTitles(titles),
    })
  }

  function effectiveSuggestionPreferences(moduleId: WikitaLiteModuleId): SuggestionPreferences {
    const config = getModuleConfig(moduleId)
    if (config.useDefaultSettings) {
      return { ...globalPreferences.value }
    }
    return { ...config.preferences }
  }

  function effectiveModuleInterests(moduleId: WikitaLiteModuleId): string[] {
    const config = getModuleConfig(moduleId)
    if (config.useDefaultSettings) {
      return listGlobalInterests()
    }
    return listModuleInterests(moduleId)
  }

  function hasModuleSuggestionSeeds(
    moduleId: WikitaLiteModuleId,
    savedItems: HomeSavedItem[],
  ): boolean {
    return hasSuggestionSeeds(
      savedItems,
      effectiveSuggestionPreferences(moduleId),
      effectiveModuleInterests(moduleId),
    )
  }

  function seedModuleOverridesFromGlobal(moduleId: WikitaLiteModuleId): void {
    const config = getModuleConfig(moduleId)
    if (!config.useDefaultSettings) return
    setModuleConfig(moduleId, {
      useDefaultSettings: false,
      preferences: { ...globalPreferences.value },
      interests: [...listGlobalInterests()],
    })
  }

  return {
    moduleConfigs,
    modulePreferencesVersion,
    getModuleConfig,
    setModuleConfig,
    listModuleInterests,
    commitModuleInterests,
    effectiveSuggestionPreferences,
    effectiveModuleInterests,
    hasModuleSuggestionSeeds,
    seedModuleOverridesFromGlobal,
  }
}

/** Module-level singleton so feeds and configure pages share the same reactive state. */
let singleton: ReturnType<typeof useWikitaLiteModuleSuggestionPreferences> | null = null

export function useWikitaLiteModuleSuggestionPreferencesSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteModuleSuggestionPreferences()
  }
  return singleton
}

export { DEFAULT_MODULE_SUGGESTION_CONFIG }
