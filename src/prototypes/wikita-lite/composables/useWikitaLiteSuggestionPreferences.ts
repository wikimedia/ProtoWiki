import { ref, watch } from 'vue'

import { listInterests, saveInterests } from '../../musical-group/data/interests'
import {
  loadSuggestionPreferences,
  saveSuggestionPreferences,
  type SuggestionPreferences,
} from '../../musical-group/data/suggestionPreferences'

const preferences = ref<SuggestionPreferences>(loadSuggestionPreferences())
const preferencesVersion = ref(0)
const interestsVersion = ref(0)

let prefsInitialized = false

watch(
  preferences,
  (value) => {
    saveSuggestionPreferences(value)
    if (!prefsInitialized) {
      prefsInitialized = true
      return
    }
    preferencesVersion.value += 1
  },
  { deep: true },
)

export function useWikitaLiteSuggestionPreferences() {
  function commitInterests(titles: string[]): void {
    saveInterests(titles)
    interestsVersion.value += 1
  }

  return {
    preferences,
    preferencesVersion,
    interestsVersion,
    commitInterests,
    listInterests,
  }
}

/** Module-level singleton so feeds and pages share the same reactive state. */
let singleton: ReturnType<typeof useWikitaLiteSuggestionPreferences> | null = null

export function useWikitaLiteSuggestionPreferencesSingleton() {
  if (!singleton) {
    singleton = useWikitaLiteSuggestionPreferences()
  }
  return singleton
}
