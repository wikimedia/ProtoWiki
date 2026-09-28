import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

import { loadConfig } from '@/config'
import { applyGlobalTheme, applyThemePreference } from '@/theme'

import {
  colorThemeCodexMode,
  colorThemePageStyle,
  isDefaultColorTheme,
  isPotdColorTheme,
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

export function useWikitabColorTheme(potdImageUrl?: Ref<string | null>) {
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

    const style = { ...colorThemePageStyle(colorThemeId.value!) }

    if (isPotdColorTheme(colorThemeId.value) && potdImageUrl?.value) {
      style['--wikitab-potd-background-image'] = `url(${potdImageUrl.value})`
    }

    return style
  })

  function syncFromStorage(config: WikitabConfig): void {
    colorThemeId.value = config.colorThemeId
  }

  function rollbackColorTheme(fallback: WikitabColorThemeId | null): void {
    colorThemeId.value = loadWikitabConfig().colorThemeId ?? fallback
  }

  function persistColorTheme(next: WikitabColorThemeId | null): boolean {
    const result = patchWikitabConfig({ colorThemeId: next })
    if (!result.persisted) return false
    trackRevision(result.config)
    return true
  }

  function setColorTheme(id: WikitabColorThemeId): void {
    const next = isDefaultColorTheme(id) ? null : id
    const previous = colorThemeId.value
    colorThemeId.value = next

    if (!persistColorTheme(next)) {
      rollbackColorTheme(previous)
      return
    }

    // Another open Wikitab tab can clobber localStorage with a stale read-modify-write.
    queueMicrotask(() => {
      if (colorThemeId.value !== next) return
      if (loadWikitabConfig().colorThemeId === next) return
      if (!persistColorTheme(next)) rollbackColorTheme(previous)
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

  if (potdImageUrl) {
    watch(potdImageUrl, syncDocumentBackground)
  }

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
