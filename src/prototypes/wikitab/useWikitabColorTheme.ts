import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { loadConfig } from '@/config'
import { applyGlobalTheme, applyThemePreference } from '@/theme'

import {
  colorThemeCodexMode,
  colorThemePageStyle,
  isDefaultColorTheme,
  WIKITAB_COLOR_THEME_STYLES,
  type WikitabColorThemeId,
} from './data/wikitabColorThemes'
import {
  loadWikitabConfig,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
} from './data/wikitabConfig'

export function useWikitabColorTheme() {
  const colorThemeId = ref<WikitabColorThemeId | null>(loadWikitabConfig().colorThemeId)

  const activeTheme = computed(() => {
    if (isDefaultColorTheme(colorThemeId.value)) return null
    return WIKITAB_COLOR_THEME_STYLES[colorThemeId.value!]
  })

  const themeStyle = computed(() => {
    if (isDefaultColorTheme(colorThemeId.value)) return {}
    return colorThemePageStyle(colorThemeId.value!)
  })

  function syncFromStorage(): void {
    colorThemeId.value = loadWikitabConfig().colorThemeId
  }

  function setColorTheme(id: WikitabColorThemeId): void {
    const next = isDefaultColorTheme(id) ? null : id
    colorThemeId.value = next
    patchWikitabConfig({ colorThemeId: next })
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY) return
    syncFromStorage()
  }

  function syncDocumentBackground(): void {
    if (typeof document === 'undefined') return

    const bg = activeTheme.value?.bg ?? ''
    document.documentElement.style.backgroundColor = bg
    document.body.style.backgroundColor = bg
  }

  function syncDocumentCodexTheme(): void {
    const theme = activeTheme.value
    if (!theme) {
      applyThemePreference(loadConfig().theme)
      return
    }
    applyGlobalTheme(colorThemeCodexMode(theme))
  }

  function restoreDocumentTheme(): void {
    if (typeof document === 'undefined') return
    applyThemePreference(loadConfig().theme)
  }

  watch(
    colorThemeId,
    () => {
      syncDocumentBackground()
      syncDocumentCodexTheme()
    },
    { immediate: true },
  )

  onMounted(() => {
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage)
    document.documentElement.style.backgroundColor = ''
    document.body.style.backgroundColor = ''
    restoreDocumentTheme()
  })

  return { colorThemeId, activeTheme, themeStyle, setColorTheme }
}
