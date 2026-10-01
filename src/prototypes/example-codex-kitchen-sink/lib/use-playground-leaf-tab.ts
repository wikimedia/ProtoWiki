import { inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  defaultLeafTab,
  getRememberedLeafTab,
  parseLeafTab,
  rememberSubTabForMain,
  resolveLeafTab,
  subTabForMain,
  type MainTabId,
} from './playground-tabs'
import { readQueryValue } from './use-url-query-param'

export interface PlaygroundLeafTabContext {
  leafTab: Ref<string>
  subTabFor: (mainTabId: MainTabId) => string
  setSubTab: (mainTabId: MainTabId, subTabId: string) => void
}

export const playgroundLeafTabKey: InjectionKey<PlaygroundLeafTabContext> = Symbol('playgroundLeafTab')

export function usePlaygroundLeafTab(): Ref<string> {
  const route = useRoute()
  const router = useRouter()

  function read(): string {
    return resolveLeafTab(readQueryValue(route.query.tab))
  }

  const leafTab = ref(read())
  let syncingFromRoute = false

  watch(
    () => route.query.tab,
    () => {
      const next = read()
      if (next === leafTab.value) return
      syncingFromRoute = true
      leafTab.value = next
      syncingFromRoute = false
    },
  )

  watch(leafTab, (value) => {
    if (syncingFromRoute) return

    const normalized = value === defaultLeafTab ? undefined : value
    const current = readQueryValue(route.query.tab)
    if (current === normalized) return

    const query = { ...route.query }
    if (normalized === undefined) {
      delete query.tab
    } else {
      query.tab = normalized
    }
    void router.replace({ query })
  })

  return leafTab
}

export function providePlaygroundLeafTab(
  leafTab: Ref<string>,
): PlaygroundLeafTabContext & { subTabMemory: Partial<Record<MainTabId, string>> } {
  const subTabMemory: Partial<Record<MainTabId, string>> = {}

  function rememberFromPath(path: string): void {
    const parsed = parseLeafTab(path)
    if (parsed?.sub) rememberSubTabForMain(subTabMemory, parsed.main, parsed.sub)
  }

  rememberFromPath(leafTab.value)

  watch(leafTab, rememberFromPath)

  const context: PlaygroundLeafTabContext = {
    leafTab,
    subTabFor: (mainTabId) => subTabForMain(leafTab.value, mainTabId, subTabMemory),
    setSubTab: (mainTabId, subTabId) => {
      rememberSubTabForMain(subTabMemory, mainTabId, subTabId)
      leafTab.value = `${mainTabId}/${subTabId}`
    },
  }

  provide(playgroundLeafTabKey, context)
  return { ...context, subTabMemory }
}

export function usePlaygroundLeafTabContext(): PlaygroundLeafTabContext | undefined {
  return inject(playgroundLeafTabKey)
}

export function syncMainTabWithLeafTab(
  activeTab: Ref<MainTabId>,
  leafTab: Ref<string>,
  subTabMemory: Partial<Record<MainTabId, string>>,
): void {
  watch(leafTab, (path) => {
    const parsed = parseLeafTab(path)
    if (parsed && parsed.main !== activeTab.value) {
      activeTab.value = parsed.main
    }
  })

  watch(activeTab, (main) => {
    const parsed = parseLeafTab(leafTab.value)
    if (parsed?.main === main) return
    leafTab.value = getRememberedLeafTab(main, subTabMemory)
  })
}
