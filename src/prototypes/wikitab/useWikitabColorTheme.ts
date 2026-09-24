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
  parseWikitabConfigJson,
  patchWikitabConfig,
  WIKITAB_CONFIG_STORAGE_KEY,
  type WikitabConfig,
} from './data/wikitabConfig'

export function useWikitabColorTheme() {
  let lastAppliedRevision = 0

  function trackRevision(config: WikitabConfig): void {
    lastAppliedRevision = config.configRevision
  }

  const initialConfig = loadWikitabConfig()
  trackRevision(initialConfig)

  const colorThemeId = ref<WikitabColorThemeId | null>(initialConfig.colorThemeId)

  const activeTheme = computed(() => {
    if (isDefaultColorTheme(colorThemeId.value)) return null
    return WIKITAB_COLOR_THEME_STYLES[colorThemeId.value!]
  })

  const themeStyle = computed(() => {
    if (isDefaultColorTheme(colorThemeId.value)) return {}
    return colorThemePageStyle(colorThemeId.value!)
  })

  function syncFromStorage(config: WikitabConfig): void {
    colorThemeId.value = config.colorThemeId
  }

  function setColorTheme(id: WikitabColorThemeId): void {
    const next = isDefaultColorTheme(id) ? null : id
    colorThemeId.value = next
    trackRevision(patchWikitabConfig({ colorThemeId: next }))

    // Another open Wikitab tab can clobber localStorage with a stale read-modify-write.
    queueMicrotask(() => {
      if (colorThemeId.value !== next) return
      if (loadWikitabConfig().colorThemeId === next) return
      trackRevision(patchWikitabConfig({ colorThemeId: next }))
    })
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== WIKITAB_CONFIG_STORAGE_KEY || !event.newValue) return

    let incoming: WikitabConfig
    try {
      incoming = parseWikitabConfigJson(event.newValue)
    } catch {
      return
    }

    if (incoming.configRevision <= lastAppliedRevision) return

    lastAppliedRevision = incoming.configRevision
    syncFromStorage(incoming)
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
    { immediate: true, flush: 'post' },
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
