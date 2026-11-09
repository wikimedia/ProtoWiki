import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'

import { isWikitabModuleAvailable } from './data/wikitabLanguageSupport'
import {
  WIKITAB_DISCUSSIONS_MODULE_ID,
  WIKITAB_HOME_MODULE_ORDER,
  type WikitabModuleId,
} from './sections'
import { snapshotWikitabOverlayScrollY } from './useWikitabOverlayScrollLock'

/** Query key for the active full-screen overlay. */
export const WIKITAB_SCREEN_QUERY_KEY = 'screen'

/** Chrome-only `?screen=` values (not home modules). */
export const WIKITAB_CHROME_SCREEN_VALUES = [
  'configure',
  'color',
  'recent-edits-settings',
  'active-discussions-settings',
] as const

export type WikitabChromeScreen = (typeof WIKITAB_CHROME_SCREEN_VALUES)[number]

/** Valid `?screen=` values — chrome overlays ∪ every home module id. */
export const WIKITAB_SCREEN_VALUES = [
  ...WIKITAB_CHROME_SCREEN_VALUES,
  ...WIKITAB_HOME_MODULE_ORDER,
] as const

export type WikitabScreen = (typeof WIKITAB_SCREEN_VALUES)[number]

const MODULE_SCREENS = new Set<string>(WIKITAB_HOME_MODULE_ORDER)

/**
 * Screens this wiki can show. A deep link to a module the language doesn't have
 * (`?screen=news` on frwiki) — or to its settings — is treated as unknown and
 * lands on home, instead of opening an empty or mis-parsed module screen.
 */
function isScreenAvailable(screen: WikitabScreen): boolean {
  if (screen === 'active-discussions-settings') {
    return isWikitabModuleAvailable(WIKITAB_DISCUSSIONS_MODULE_ID)
  }
  if (MODULE_SCREENS.has(screen)) return isWikitabModuleAvailable(screen as WikitabModuleId)
  return true
}

const VALID_SCREENS = new Set<string>(WIKITAB_SCREEN_VALUES.filter(isScreenAvailable))

function isModuleId(value: string): value is WikitabModuleId {
  return MODULE_SCREENS.has(value)
}

function screenFromQuery(value: unknown): WikitabScreen | null {
  if (typeof value === 'string' && VALID_SCREENS.has(value)) {
    return value as WikitabScreen
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const screen = screenFromQuery(entry)
      if (screen) return screen
    }
  }
  return null
}

function withScreen(query: LocationQuery, screen: WikitabScreen | null): LocationQuery {
  const next = { ...query }
  delete next[WIKITAB_SCREEN_QUERY_KEY]
  if (screen) next[WIKITAB_SCREEN_QUERY_KEY] = screen
  return next
}

function screenQueryUnchanged(
  query: LocationQuery,
  screen: WikitabScreen | null,
): boolean {
  const current = query[WIKITAB_SCREEN_QUERY_KEY]
  if (screen === null) {
    return current === undefined
  }
  return current === screen
}

/**
 * Full-screen panels synced to `?screen=` (chrome: `configure` | `color` |
 * `recent-edits-settings` | `active-discussions-settings`, or any home module
 * id). Open/close push browser history so Back closes the panel.
 */
export function useWikitabOverlayNavigation(): {
  activeScreen: Ref<WikitabScreen | null>
  moduleScreen: ComputedRef<WikitabModuleId | null>
  configureOpen: ComputedRef<boolean>
  savedPanelOpen: ComputedRef<boolean>
  colorPickerOpen: ComputedRef<boolean>
  reviewChangesConfigureOpen: ComputedRef<boolean>
  activeDiscussionsConfigureOpen: ComputedRef<boolean>
  openConfigure: () => void
  closeConfigure: () => void
  openSavedPanel: () => void
  closeSavedPanel: () => void
  openColorPicker: () => void
  closeColorPicker: () => void
  openReviewChangesConfigure: () => void
  closeReviewChangesConfigure: () => void
  openActiveDiscussionsConfigure: () => void
  closeActiveDiscussionsConfigure: () => void
  openModuleScreen: (id: WikitabModuleId) => void
  closeModuleScreen: () => void
} {
  const route = useRoute()
  const router = useRouter()

  const activeScreen = ref<WikitabScreen | null>(null)

  const moduleScreen = computed((): WikitabModuleId | null => {
    const active = activeScreen.value
    return active && isModuleId(active) ? active : null
  })

  const configureOpen = computed(() => activeScreen.value === 'configure')
  const savedPanelOpen = computed(() => activeScreen.value === 'saved')
  const colorPickerOpen = computed(() => activeScreen.value === 'color')
  const reviewChangesConfigureOpen = computed(
    () => activeScreen.value === 'recent-edits-settings',
  )
  const activeDiscussionsConfigureOpen = computed(
    () => activeScreen.value === 'active-discussions-settings',
  )

  function applyQueryToOverlays(): void {
    const active = screenFromQuery(route.query[WIKITAB_SCREEN_QUERY_KEY])
    // Opening (deep link / Back) — snapshot scroll before the feed hides.
    if (active && active !== activeScreen.value && activeScreen.value === null) {
      snapshotWikitabOverlayScrollY()
    }
    if (activeScreen.value !== active) activeScreen.value = active

    // Drop unknown / multi-value `screen` without adding history.
    if (!screenQueryUnchanged(route.query, active)) {
      void router.replace({
        path: route.path,
        query: withScreen(route.query, active),
      })
    }
  }

  function pushScreen(screen: WikitabScreen | null): void {
    if (screenQueryUnchanged(route.query, screen)) return
    // Before the route update hides the feed and clears window.scrollY.
    if (screen) snapshotWikitabOverlayScrollY()
    void router.push({
      path: route.path,
      query: withScreen(route.query, screen),
    })
  }

  function openConfigure(): void {
    pushScreen('configure')
  }

  function closeConfigure(): void {
    if (activeScreen.value !== 'configure' && screenFromQuery(route.query.screen) !== 'configure') {
      return
    }
    pushScreen(null)
  }

  function openSavedPanel(): void {
    pushScreen('saved')
  }

  function closeSavedPanel(): void {
    if (activeScreen.value !== 'saved' && screenFromQuery(route.query.screen) !== 'saved') {
      return
    }
    pushScreen(null)
  }

  function openColorPicker(): void {
    pushScreen('color')
  }

  function closeColorPicker(): void {
    if (activeScreen.value !== 'color' && screenFromQuery(route.query.screen) !== 'color') {
      return
    }
    pushScreen(null)
  }

  function openReviewChangesConfigure(): void {
    pushScreen('recent-edits-settings')
  }

  function closeReviewChangesConfigure(): void {
    if (
      activeScreen.value !== 'recent-edits-settings' &&
      screenFromQuery(route.query.screen) !== 'recent-edits-settings'
    ) {
      return
    }
    pushScreen(null)
  }

  function openActiveDiscussionsConfigure(): void {
    pushScreen('active-discussions-settings')
  }

  function closeActiveDiscussionsConfigure(): void {
    if (
      activeScreen.value !== 'active-discussions-settings' &&
      screenFromQuery(route.query.screen) !== 'active-discussions-settings'
    ) {
      return
    }
    pushScreen(null)
  }

  function openModuleScreen(id: WikitabModuleId): void {
    pushScreen(id)
  }

  function closeModuleScreen(): void {
    const fromQuery = screenFromQuery(route.query.screen)
    if (!moduleScreen.value && !(fromQuery && isModuleId(fromQuery))) {
      return
    }
    pushScreen(null)
  }

  applyQueryToOverlays()

  watch(
    () => route.query[WIKITAB_SCREEN_QUERY_KEY],
    () => {
      applyQueryToOverlays()
    },
  )

  return {
    activeScreen,
    moduleScreen,
    configureOpen,
    savedPanelOpen,
    colorPickerOpen,
    reviewChangesConfigureOpen,
    activeDiscussionsConfigureOpen,
    openConfigure,
    closeConfigure,
    openSavedPanel,
    closeSavedPanel,
    openColorPicker,
    closeColorPicker,
    openReviewChangesConfigure,
    closeReviewChangesConfigure,
    openActiveDiscussionsConfigure,
    closeActiveDiscussionsConfigure,
    openModuleScreen,
    closeModuleScreen,
  }
}
