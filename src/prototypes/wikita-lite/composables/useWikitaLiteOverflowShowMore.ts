import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { useWikitaLiteHideTabBarSingleton } from './useWikitaLiteHideTabBar'
import { useWikitaLiteModuleMenuModeSingleton } from './useWikitaLiteModuleMenuMode'

export function useWikitaLiteOverflowShowMore(options: {
  standalone: MaybeRefOrGetter<boolean>
  moreTo: MaybeRefOrGetter<RouteLocationRaw | undefined>
  hasItems: MaybeRefOrGetter<boolean>
  requireHideTabBar?: MaybeRefOrGetter<boolean>
}) {
  const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()
  const { hideTabBar } = useWikitaLiteHideTabBarSingleton()

  return computed(() => {
    if (toValue(options.requireHideTabBar) && !hideTabBar.value) return false

    return (
      !toValue(options.standalone) &&
      useModuleMenuMode.value &&
      Boolean(toValue(options.moreTo)) &&
      toValue(options.hasItems)
    )
  })
}
