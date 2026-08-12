import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { useWikitaLiteModuleMenuModeSingleton } from './useWikitaLiteModuleMenuMode'

export function useWikitaLiteOverflowShowMore(options: {
  standalone: MaybeRefOrGetter<boolean>
  moreTo: MaybeRefOrGetter<RouteLocationRaw | undefined>
  hasItems: MaybeRefOrGetter<boolean>
}) {
  const { useModuleMenuMode } = useWikitaLiteModuleMenuModeSingleton()

  return computed(
    () =>
      !toValue(options.standalone) &&
      useModuleMenuMode.value &&
      Boolean(toValue(options.moreTo)) &&
      toValue(options.hasItems),
  )
}
